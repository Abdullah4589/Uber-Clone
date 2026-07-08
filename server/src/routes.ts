import { Router } from 'express';
import type { Server } from 'socket.io';
import { prisma } from './db';
import { signToken, requireAuth, requireAdmin, AuthedRequest } from './auth';
import { toPublicUser, avgRatingFor } from './util';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { verifyClerkToken, clerkEnabled } from './clerk';
import {
  estimateFare,
  haversineKm,
  clampFare,
  TIERS,
  type LatLng,
  type RideTier,
} from '@uber-clone/shared';
import * as sim from './services/simulator';
import { sendPasswordResetEmail } from './services/mailer';

export function buildRoutes(io: Server): Router {
  const r = Router();

  // ---- Auth ----
  r.post('/auth/login', async (req, res) => {
    const { email, password } = req.body ?? {};
    const user = await prisma.user.findUnique({ where: { email: String(email || '') } });
    if (!user || typeof password !== 'string') {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const isHashed = user.password.startsWith('$2');
    const ok = isHashed
      ? await bcrypt.compare(password, user.password)
      : user.password === password;
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });
    // Lazily upgrade legacy plaintext rows to bcrypt on first successful login.
    if (!isHashed) {
      await prisma.user.update({
        where: { id: user.id },
        data: { password: await bcrypt.hash(password, 10) },
      });
    }
    const token = signToken({ id: user.id, role: user.role as 'RIDER' | 'DRIVER' | 'ADMIN' });
    res.json({ token, user: await toPublicUser(user) });
  });

  r.post('/auth/register', (_req, res) => {
    // Registration via this endpoint is disabled — new accounts are created
    // through Clerk (Google sign-in) which verifies the email address.
    res.status(403).json({
      error: 'Direct registration is disabled. Please sign up with Google.',
    });
  });

  r.get('/me', requireAuth, async (req: AuthedRequest, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json(await toPublicUser(user));
  });

  // ---- Password reset ----
  // Codes are held in-memory and expire after 10 minutes.
  const resetCodes = new Map<string, { code: string; expires: number }>();
  const RESET_TTL_MS = 10 * 60 * 1000;

  r.post('/auth/forgot', async (req, res) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ error: 'Enter a valid email address' });
    }
    const user = await prisma.user.findUnique({ where: { email } });
    // Clerk/social accounts have no local password — send them back to Google.
    if (user && user.password.startsWith('clerk:')) {
      return res.status(400).json({
        error: 'This account uses Google sign-in — use “Continue with Google”.',
      });
    }
    // Always respond with the same shape so we don't reveal whether an account exists.
    if (!user) return res.json({ sent: true });
    const code = String(Math.floor(100000 + Math.random() * 900000));
    resetCodes.set(email, { code, expires: Date.now() + RESET_TTL_MS });
    try {
      await sendPasswordResetEmail(email, code);
    } catch (err) {
      console.error('[mailer] failed to send reset email:', err);
      resetCodes.delete(email);
      return res.status(500).json({ error: 'Failed to send reset email. Check server email configuration.' });
    }
    res.json({ sent: true });
  });

  r.post('/auth/reset-password', async (req, res) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const code = String(req.body?.code ?? '').trim();
    const password = req.body?.password;
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const entry = resetCodes.get(email);
    if (!entry || entry.code !== code || entry.expires < Date.now()) {
      return res.status(400).json({ error: 'Invalid or expired reset code' });
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'Account not found' });
    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash(password, 10) },
    });
    resetCodes.delete(email);
    const token = signToken({ id: user.id, role: user.role as 'RIDER' | 'DRIVER' | 'ADMIN' });
    res.json({ token, user: await toPublicUser(user) });
  });

  // ---- Clerk auth bridge ----
  // The frontend authenticates with Clerk, then exchanges the Clerk session
  // token for our own app JWT so the entire ride flow stays unchanged.
  const readBearer = (req: import('express').Request): string | null => {
    const h = req.headers.authorization;
    return h?.startsWith('Bearer ') ? h.slice(7) : null;
  };
  const issue = async (user: { id: string; role: string }) => ({
    token: signToken({ id: user.id, role: user.role as 'RIDER' | 'DRIVER' | 'ADMIN' }),
  });

  // Exchange a Clerk session for an app JWT. Links to an existing account by
  // clerkId or (first time) by email; otherwise signals that onboarding (role
  // selection) is required before an account is created.
  r.post('/auth/clerk', async (req, res) => {
    if (!clerkEnabled) return res.status(501).json({ error: 'Clerk is not configured' });
    const token = readBearer(req);
    if (!token) return res.status(401).json({ error: 'Missing Clerk token' });
    let id;
    try {
      id = await verifyClerkToken(token);
    } catch {
      return res.status(401).json({ error: 'Invalid Clerk session' });
    }

    let user = await prisma.user.findUnique({ where: { clerkId: id.clerkId } });
    if (!user && id.email) {
      // Link a pre-existing account (built-in signup or demo) on first Clerk login.
      const byEmail = await prisma.user.findUnique({ where: { email: id.email } });
      if (byEmail) {
        user = await prisma.user.update({
          where: { id: byEmail.id },
          data: { clerkId: id.clerkId },
        });
      }
    }
    if (!user) {
      return res.json({ needsOnboarding: true, email: id.email, name: id.name });
    }
    res.json({ ...(await issue(user)), user: await toPublicUser(user) });
  });

  // Complete Clerk onboarding: pick a role (+ vehicle for drivers) and create
  // the linked account.
  r.post('/auth/clerk/onboard', async (req, res) => {
    if (!clerkEnabled) return res.status(501).json({ error: 'Clerk is not configured' });
    const token = readBearer(req);
    if (!token) return res.status(401).json({ error: 'Missing Clerk token' });
    let id;
    try {
      id = await verifyClerkToken(token);
    } catch {
      return res.status(401).json({ error: 'Invalid Clerk session' });
    }

    const { role, vehicle } = req.body ?? {};
    if (role !== 'RIDER' && role !== 'DRIVER') {
      return res.status(400).json({ error: 'Role must be RIDER or DRIVER' });
    }
    const cleanVehicle = String(vehicle ?? '').trim();
    if (role === 'DRIVER' && !cleanVehicle) {
      return res.status(400).json({ error: 'Drivers must provide a vehicle' });
    }

    // Idempotent: if they already onboarded, just return the account.
    const existing = await prisma.user.findUnique({ where: { clerkId: id.clerkId } });
    if (existing) {
      return res.json({ ...(await issue(existing)), user: await toPublicUser(existing) });
    }

    const data = {
      clerkId: id.clerkId,
      email: id.email || `${id.clerkId}@clerk.local`,
      name: id.name,
      // Clerk owns the credentials; store an unusable random secret here.
      password: `clerk:${randomUUID()}`,
      role,
      vehicle: role === 'DRIVER' ? cleanVehicle : null,
    };
    // If a passwordless row already exists for this email, adopt it.
    const byEmail = data.email
      ? await prisma.user.findUnique({ where: { email: data.email } })
      : null;
    const user = byEmail
      ? await prisma.user.update({ where: { id: byEmail.id }, data })
      : await prisma.user.create({ data });

    res.json({ ...(await issue(user)), user: await toPublicUser(user) });
  });

  // ---- Fare estimate ----
  r.post('/estimate', requireAuth, (req, res) => {
    const { pickup, drop, tier } = req.body as { pickup: LatLng; drop: LatLng; tier?: RideTier };
    res.json(estimateFare(pickup, drop, tier && TIERS[tier] ? tier : 'ECONOMY'));
  });

  // ---- Online driver count (shown to riders before booking) ----
  r.get('/drivers/online-count', requireAuth, async (_req, res) => {
    const count = await prisma.user.count({ where: { role: 'DRIVER', isOnline: true } });
    res.json({ count });
  });

  // ---- Driver availability ----
  r.post('/driver/online', requireAuth, async (req: AuthedRequest, res) => {
    if (req.user!.role !== 'DRIVER') return res.status(403).json({ error: 'Drivers only' });
    const { isOnline } = req.body ?? {};
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { isOnline: !!isOnline },
    });
    res.json(await toPublicUser(user));
  });

  // ---- Create ride request (rider) ----
  r.post('/rides', requireAuth, async (req: AuthedRequest, res) => {
    if (req.user!.role !== 'RIDER') return res.status(403).json({ error: 'Riders only' });
    const { pickup, drop, scheduledAt, tier: rawTier, offeredFare, autoAccept } = req.body as {
      pickup: LatLng & { label: string };
      drop: LatLng & { label: string };
      scheduledAt?: string | null;
      tier?: RideTier;
      offeredFare?: number;
      autoAccept?: boolean;
    };
    const tier: RideTier = rawTier && TIERS[rawTier] ? rawTier : 'ECONOMY';
    const est = estimateFare(pickup, drop, tier);
    // The rider's offer is clamped server-side to the allowed band around the
    // recommended fare, so a hand-crafted request can't under/over-shoot it.
    const fare =
      typeof offeredFare === 'number' && Number.isFinite(offeredFare)
        ? clampFare(offeredFare, est.fare)
        : est.fare;
    const scheduled = scheduledAt ? new Date(scheduledAt) : null;
    const ride = await prisma.ride.create({
      data: {
        riderId: req.user!.id,
        status: 'SEARCHING',
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
        pickupLabel: pickup.label,
        dropLat: drop.lat,
        dropLng: drop.lng,
        dropLabel: drop.label,
        distanceKm: est.distanceKm,
        durationMin: est.durationMin,
        fare,
        recommendedFare: est.fare,
        autoAccept: autoAccept !== false, // default on
        tier,
        scheduledAt: scheduled && !isNaN(scheduled.getTime()) ? scheduled : null,
      },
      include: { rider: true },
    });

    // Offer to all online drivers; first to accept wins.
    const onlineDrivers = await prisma.user.findMany({
      where: { role: 'DRIVER', isOnline: true },
    });
    const payload = {
      ...ride,
      rider: await toPublicUser(ride.rider),
    };
    for (const d of onlineDrivers) {
      io.to(`user:${d.id}`).emit('ride:request', payload);
    }

    res.json(payload);
  });

  // Close out bargaining on a ride: decline losing pending offers (notifying
  // their drivers) and tell every online driver the request is gone.
  async function closeBidding(rideId: string, winnerOfferId?: string) {
    const losing = await prisma.offer.findMany({
      where: {
        rideId,
        status: 'PENDING',
        ...(winnerOfferId ? { id: { not: winnerOfferId } } : {}),
      },
    });
    if (losing.length) {
      await prisma.offer.updateMany({
        where: { id: { in: losing.map((o) => o.id) } },
        data: { status: 'DECLINED' },
      });
      for (const o of losing) {
        io.to(`user:${o.driverId}`).emit('offer:result', {
          rideId,
          offerId: o.id,
          accepted: false,
        });
      }
    }
    const onlineDrivers = await prisma.user.findMany({
      where: { role: 'DRIVER', isOnline: true },
      select: { id: true },
    });
    for (const d of onlineDrivers) io.to(`user:${d.id}`).emit('ride:taken', { rideId });
  }

  // ---- Driver accepts the rider's offered fare ----
  // If the rider enabled auto-accept, this books the ride instantly.
  // Otherwise it becomes an offer *at the rider's fare* that the rider
  // still has to approve.
  r.post('/rides/:id/accept', requireAuth, async (req: AuthedRequest, res) => {
    if (req.user!.role !== 'DRIVER') return res.status(403).json({ error: 'Drivers only' });
    const ride = await prisma.ride.findUnique({ where: { id: req.params.id } });
    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    if (ride.status !== 'SEARCHING' || ride.driverId) {
      return res.status(409).json({ error: 'Ride already taken' });
    }

    if (!ride.autoAccept) {
      const offer = await prisma.offer.upsert({
        where: { rideId_driverId: { rideId: ride.id, driverId: req.user!.id } },
        update: { amount: ride.fare, status: 'PENDING', createdAt: new Date() },
        create: { rideId: ride.id, driverId: req.user!.id, amount: ride.fare },
        include: { driver: true },
      });
      const payload = { ...offer, driver: await toPublicUser(offer.driver) };
      io.to(`user:${ride.riderId}`).emit('offer:new', payload);
      return res.json({ pending: true, offer: payload });
    }

    const updated = await prisma.ride.update({
      where: { id: ride.id },
      data: { driverId: req.user!.id, status: 'DRIVER_ASSIGNED' },
      include: { rider: true, driver: true },
    });

    const full = {
      ...updated,
      rider: await toPublicUser(updated.rider),
      driver: updated.driver ? await toPublicUser(updated.driver) : null,
    };
    io.to(ride.id).emit('ride:status', { rideId: ride.id, status: 'DRIVER_ASSIGNED', ride: full });
    io.to(`user:${ride.riderId}`).emit('ride:assigned', full);
    closeBidding(ride.id);

    // Driver starts ~1.5km away from pickup so the marker visibly approaches.
    const driverStart: LatLng = {
      lat: updated.pickupLat + 0.012,
      lng: updated.pickupLng + 0.012,
    };
    setTimeout(() => sim.beginEnRoute(io, ride.id, driverStart), 800);

    res.json(full);
  });

  // ---- Driver declines (just informational for prototype) ----
  r.post('/rides/:id/decline', requireAuth, (_req, res) => res.json({ ok: true }));

  // ---- Driver counter-offers a fare on a searching ride ----
  r.post('/rides/:id/offer', requireAuth, async (req: AuthedRequest, res) => {
    if (req.user!.role !== 'DRIVER') return res.status(403).json({ error: 'Drivers only' });
    const ride = await prisma.ride.findUnique({ where: { id: req.params.id } });
    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    if (ride.status !== 'SEARCHING' || ride.driverId) {
      return res.status(409).json({ error: 'Ride no longer available' });
    }
    const raw = Number(req.body?.amount);
    if (!Number.isFinite(raw)) return res.status(400).json({ error: 'Invalid amount' });
    // Same bounds as the rider's stepper, enforced server-side.
    const amount = clampFare(raw, ride.recommendedFare || ride.fare);

    // One live offer per driver per ride; re-offering updates it.
    const offer = await prisma.offer.upsert({
      where: { rideId_driverId: { rideId: ride.id, driverId: req.user!.id } },
      update: { amount, status: 'PENDING', createdAt: new Date() },
      create: { rideId: ride.id, driverId: req.user!.id, amount },
      include: { driver: true },
    });
    const payload = { ...offer, driver: await toPublicUser(offer.driver) };
    io.to(`user:${ride.riderId}`).emit('offer:new', payload);
    res.json(payload);
  });

  // ---- Rider accepts a driver's counter-offer ----
  r.post('/offers/:id/accept', requireAuth, async (req: AuthedRequest, res) => {
    const offer = await prisma.offer.findUnique({
      where: { id: req.params.id },
      include: { ride: true },
    });
    if (!offer) return res.status(404).json({ error: 'Offer not found' });
    if (offer.ride.riderId !== req.user!.id) return res.status(403).json({ error: 'Not your ride' });
    if (offer.status !== 'PENDING' || offer.ride.status !== 'SEARCHING' || offer.ride.driverId) {
      return res.status(409).json({ error: 'Offer no longer available' });
    }

    await prisma.offer.update({ where: { id: offer.id }, data: { status: 'ACCEPTED' } });
    const updated = await prisma.ride.update({
      where: { id: offer.rideId },
      data: { driverId: offer.driverId, status: 'DRIVER_ASSIGNED', fare: offer.amount },
      include: { rider: true, driver: true },
    });
    const full = {
      ...updated,
      rider: await toPublicUser(updated.rider),
      driver: updated.driver ? await toPublicUser(updated.driver) : null,
    };
    io.to(updated.id).emit('ride:status', { rideId: updated.id, status: 'DRIVER_ASSIGNED', ride: full });
    io.to(`user:${updated.riderId}`).emit('ride:assigned', full);
    // The winning driver learns they got the ride through ride:assigned.
    io.to(`user:${offer.driverId}`).emit('ride:assigned', full);
    closeBidding(updated.id, offer.id);

    const driverStart: LatLng = {
      lat: updated.pickupLat + 0.012,
      lng: updated.pickupLng + 0.012,
    };
    setTimeout(() => sim.beginEnRoute(io, updated.id, driverStart), 800);

    res.json(full);
  });

  // ---- Rider declines a driver's counter-offer ----
  r.post('/offers/:id/decline', requireAuth, async (req: AuthedRequest, res) => {
    const offer = await prisma.offer.findUnique({
      where: { id: req.params.id },
      include: { ride: true },
    });
    if (!offer) return res.status(404).json({ error: 'Offer not found' });
    if (offer.ride.riderId !== req.user!.id) return res.status(403).json({ error: 'Not your ride' });
    if (offer.status !== 'PENDING') return res.status(409).json({ error: 'Offer already resolved' });

    await prisma.offer.update({ where: { id: offer.id }, data: { status: 'DECLINED' } });
    io.to(`user:${offer.driverId}`).emit('offer:result', {
      rideId: offer.rideId,
      offerId: offer.id,
      accepted: false,
    });
    res.json({ ok: true });
  });

  // ---- Start the trip (after ARRIVED) — either the driver or the rider ----
  r.post('/rides/:id/start', requireAuth, async (req: AuthedRequest, res) => {
    const ride = await prisma.ride.findUnique({ where: { id: req.params.id } });
    if (!ride || (ride.driverId !== req.user!.id && ride.riderId !== req.user!.id)) {
      return res.status(403).json({ error: 'Not your ride' });
    }
    if (ride.status !== 'ARRIVED') return res.status(409).json({ error: 'Not ready to start' });
    await sim.beginTrip(io, ride.id);
    res.json({ ok: true });
  });

  // ---- Cancel ----
  r.post('/rides/:id/cancel', requireAuth, async (req: AuthedRequest, res) => {
    const ride = await prisma.ride.findUnique({ where: { id: req.params.id } });
    if (!ride) return res.status(404).json({ error: 'Not found' });
    if (ride.riderId !== req.user!.id && ride.driverId !== req.user!.id) {
      return res.status(403).json({ error: 'Not your ride' });
    }
    sim.stop(ride.id);
    await prisma.ride.update({ where: { id: ride.id }, data: { status: 'CANCELLED' } });
    io.to(ride.id).emit('ride:status', { rideId: ride.id, status: 'CANCELLED' });
    if (ride.status === 'SEARCHING') closeBidding(ride.id);
    res.json({ ok: true });
  });

  // ---- Active ride for current user ----
  r.get('/rides/active', requireAuth, async (req: AuthedRequest, res) => {
    const roleField = req.user!.role === 'RIDER' ? 'riderId' : 'driverId';
    const ride = await prisma.ride.findFirst({
      where: {
        [roleField]: req.user!.id,
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        rider: true,
        driver: true,
        offers: { where: { status: 'PENDING' }, include: { driver: true } },
      },
    });
    if (!ride) return res.json(null);
    res.json({
      ...ride,
      rider: await toPublicUser(ride.rider),
      driver: ride.driver ? await toPublicUser(ride.driver) : null,
      driverPos: sim.currentPos(ride.id),
      offers: await Promise.all(
        ride.offers.map(async (o) => ({ ...o, driver: await toPublicUser(o.driver) }))
      ),
    });
  });

  // ---- History ----
  r.get('/rides/history', requireAuth, async (req: AuthedRequest, res) => {
    const roleField = req.user!.role === 'RIDER' ? 'riderId' : 'driverId';
    const rides = await prisma.ride.findMany({
      where: { [roleField]: req.user!.id, status: { in: ['COMPLETED', 'CANCELLED'] } },
      orderBy: { createdAt: 'desc' },
      include: { rider: true, driver: true, ratings: true },
    });
    const out = await Promise.all(
      rides.map(async (ride) => ({
        ...ride,
        rider: await toPublicUser(ride.rider),
        driver: ride.driver ? await toPublicUser(ride.driver) : null,
        ratedByMe: ride.ratings.some((rt) => rt.fromId === req.user!.id),
      }))
    );
    res.json(out);
  });

  // ---- Rating ----
  r.post('/rides/:id/rate', requireAuth, async (req: AuthedRequest, res) => {
    const { stars, comment } = req.body ?? {};
    const ride = await prisma.ride.findUnique({ where: { id: req.params.id } });
    if (!ride) return res.status(404).json({ error: 'Not found' });
    const isRider = ride.riderId === req.user!.id;
    const isDriver = ride.driverId === req.user!.id;
    if (!isRider && !isDriver) return res.status(403).json({ error: 'Not your ride' });
    const toId = isRider ? ride.driverId : ride.riderId;
    if (!toId) return res.status(400).json({ error: 'No counterparty' });

    await prisma.rating.create({
      data: {
        rideId: ride.id,
        fromId: req.user!.id,
        toId,
        stars: Math.max(1, Math.min(5, Number(stars) || 5)),
        comment: comment ? String(comment) : null,
      },
    });
    res.json({ ok: true, targetAvg: await avgRatingFor(toId) });
  });

  // ---- Admin dashboard ----
  const ACTIVE_STATUSES = [
    'SEARCHING',
    'DRIVER_ASSIGNED',
    'EN_ROUTE_TO_PICKUP',
    'ARRIVED',
    'IN_PROGRESS',
  ];
  const ALL_STATUSES = [
    ...ACTIVE_STATUSES,
    'COMPLETED',
    'CANCELLED',
  ] as const;

  r.get('/admin/stats', requireAuth, requireAdmin, async (_req, res) => {
    const [riders, drivers, driversOnline, grouped, revenueAgg] = await Promise.all([
      prisma.user.count({ where: { role: 'RIDER' } }),
      prisma.user.count({ where: { role: 'DRIVER' } }),
      prisma.user.count({ where: { role: 'DRIVER', isOnline: true } }),
      prisma.ride.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.ride.aggregate({ where: { status: 'COMPLETED' }, _sum: { fare: true } }),
    ]);

    const ridesByStatus = Object.fromEntries(
      ALL_STATUSES.map((s) => [s, 0])
    ) as Record<(typeof ALL_STATUSES)[number], number>;
    for (const g of grouped) {
      ridesByStatus[g.status as (typeof ALL_STATUSES)[number]] = g._count._all;
    }
    const activeRides = ACTIVE_STATUSES.reduce(
      (n, s) => n + (ridesByStatus[s as (typeof ALL_STATUSES)[number]] ?? 0),
      0
    );

    res.json({
      riders,
      drivers,
      driversOnline,
      activeRides,
      completedRides: ridesByStatus.COMPLETED,
      cancelledRides: ridesByStatus.CANCELLED,
      revenue: Math.round(revenueAgg._sum.fare ?? 0),
      ridesByStatus,
    });
  });

  r.get('/admin/rides', requireAuth, requireAdmin, async (req, res) => {
    // filter: 'all' (default) | 'pending' (still active) | 'completed'
    const filter = String(req.query.filter ?? (req.query.active === '1' ? 'pending' : 'all'));
    const where =
      filter === 'pending'
        ? { status: { in: ACTIVE_STATUSES } }
        : filter === 'completed'
          ? { status: 'COMPLETED' }
          : undefined;
    const rides = await prisma.ride.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { rider: true, driver: true },
    });
    const out = await Promise.all(
      rides.map(async (ride) => ({
        ...ride,
        rider: await toPublicUser(ride.rider),
        driver: ride.driver ? await toPublicUser(ride.driver) : null,
      }))
    );
    res.json(out);
  });

  r.get('/admin/users', requireAuth, requireAdmin, async (_req, res) => {
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
    const out = await Promise.all(
      users.map(async (u) => {
        const rideCount = await prisma.ride.count({
          where: u.role === 'DRIVER' ? { driverId: u.id } : { riderId: u.id },
        });
        return { ...(await toPublicUser(u)), rideCount, createdAt: u.createdAt };
      })
    );
    res.json(out);
  });

  // Admin force-cancels a ride (dispute resolution / stuck rides).
  r.post('/admin/rides/:id/cancel', requireAuth, requireAdmin, async (req, res) => {
    const ride = await prisma.ride.findUnique({ where: { id: req.params.id } });
    if (!ride) return res.status(404).json({ error: 'Not found' });
    sim.stop(ride.id);
    await prisma.ride.update({ where: { id: ride.id }, data: { status: 'CANCELLED' } });
    io.to(ride.id).emit('ride:status', { rideId: ride.id, status: 'CANCELLED' });
    res.json({ ok: true });
  });

  return r;
}

// exported for potential reuse/tests
export { haversineKm };
