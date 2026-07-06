import type { Server } from 'socket.io';
import type { LatLng } from '@uber-clone/shared';
import { prisma } from '../db';

/**
 * Server-side driver movement simulator.
 * Interpolates a driver marker along a straight line between waypoints and
 * pushes location updates into the ride's socket room. This is the "mocked GPS"
 * layer — in a real app these coordinates would come from the driver device.
 */

interface SimState {
  rideId: string;
  pos: LatLng;
  timer: NodeJS.Timeout;
}

const active = new Map<string, SimState>();

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/** Start a driver marker moving from `start` to `end` over the ride room. */
export function driveTo(
  io: Server,
  rideId: string,
  start: LatLng,
  end: LatLng,
  opts: { stepMs?: number; steps?: number; onArrive?: () => void }
) {
  stop(rideId);
  const stepMs = opts.stepMs ?? 1500;
  const steps = opts.steps ?? 12;
  let i = 0;

  const state: SimState = {
    rideId,
    pos: { ...start },
    timer: setInterval(async () => {
      i++;
      const t = Math.min(1, i / steps);
      state.pos = { lat: lerp(start.lat, end.lat, t), lng: lerp(start.lng, end.lng, t) };
      io.to(rideId).emit('driver:location', { rideId, ...state.pos });

      if (t >= 1) {
        stop(rideId);
        opts.onArrive?.();
      }
    }, stepMs),
  };
  active.set(rideId, state);
}

export function stop(rideId: string) {
  const s = active.get(rideId);
  if (s) {
    clearInterval(s.timer);
    active.delete(rideId);
  }
}

export function currentPos(rideId: string): LatLng | null {
  return active.get(rideId)?.pos ?? null;
}

/**
 * Drives to pickup, sets ARRIVED, then waits for driver to start the trip.
 * The trip leg (pickup -> dropoff) is triggered separately via startTrip.
 */
export async function beginEnRoute(io: Server, rideId: string, driverStart: LatLng) {
  const ride = await prisma.ride.findUnique({ where: { id: rideId } });
  if (!ride) return;
  await prisma.ride.update({ where: { id: rideId }, data: { status: 'EN_ROUTE_TO_PICKUP' } });
  io.to(rideId).emit('ride:status', { rideId, status: 'EN_ROUTE_TO_PICKUP' });

  driveTo(io, rideId, driverStart, { lat: ride.pickupLat, lng: ride.pickupLng }, {
    onArrive: async () => {
      await prisma.ride.update({ where: { id: rideId }, data: { status: 'ARRIVED' } });
      io.to(rideId).emit('ride:status', { rideId, status: 'ARRIVED' });
    },
  });
}

export async function beginTrip(io: Server, rideId: string) {
  const ride = await prisma.ride.findUnique({ where: { id: rideId } });
  if (!ride) return;
  await prisma.ride.update({
    where: { id: rideId },
    data: { status: 'IN_PROGRESS', startedAt: new Date() },
  });
  io.to(rideId).emit('ride:status', { rideId, status: 'IN_PROGRESS' });

  driveTo(
    io,
    rideId,
    { lat: ride.pickupLat, lng: ride.pickupLng },
    { lat: ride.dropLat, lng: ride.dropLng },
    {
      steps: 16,
      onArrive: async () => {
        await prisma.ride.update({
          where: { id: rideId },
          data: { status: 'COMPLETED', completedAt: new Date() },
        });
        io.to(rideId).emit('ride:status', { rideId, status: 'COMPLETED' });
      },
    }
  );
}
