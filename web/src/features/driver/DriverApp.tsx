import { useEffect, useRef, useState } from 'react';
import type { Ride, RideStatus, LatLng } from '@uber-clone/shared';
import { TIERS } from '@uber-clone/shared';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { getSocket } from '../../lib/socket';
import { MapView } from '../../components/MapView';
import { BottomSheet, type SnapPoint } from '../../components/BottomSheet';
import { TabBar } from '../../components/TabBar';
import { BarButton, Dock } from '../../components/BarButton';
import { StatusBadge, Avatar } from '../../components/ui';
import { FareAmount } from '../../components/FareTicket';
import { RideStepper } from '../../components/RideStepper';
import { RatingModal } from '../../components/RatingModal';
import { ProfileScreen } from '../../components/ProfileScreen';
import { toast } from '../../components/Toast';
import { formatSchedule } from '../../lib/format';
import { RequestTakeover, type NegoEntry } from './RequestTakeover';
import { EarningsPanel } from './EarningsPanel';

type Tab = 'drive' | 'earnings' | 'profile';

const TABS = [
  { key: 'drive' as Tab, label: 'Drive', icon: '🛞' },
  { key: 'earnings' as Tab, label: 'Earnings', icon: '💰' },
  { key: 'profile' as Tab, label: 'Profile', icon: '👤' },
];

export function DriverApp() {
  const { user, token, refresh } = useAuth();
  const [tab, setTab] = useState<Tab>('drive');
  const [snap, setSnap] = useState<SnapPoint>('peek');
  const [online, setOnline] = useState(user?.isOnline ?? false);
  const [requests, setRequests] = useState<Ride[]>([]);
  const [nego, setNego] = useState<Record<string, NegoEntry>>({});
  const [ride, setRide] = useState<Ride | null>(null);
  const [driverPos, setDriverPos] = useState<LatLng | null>(null);
  const [showRating, setShowRating] = useState(false);
  const [todayEarned, setTodayEarned] = useState<{ sum: number; trips: number } | null>(null);
  const rideIdRef = useRef<string | null>(null);

  useEffect(() => {
    api.get('/rides/active').then((r) => {
      if (r.data) {
        setRide(r.data);
        setDriverPos(r.data.driverPos ?? null);
      }
    });
  }, []);

  // Today's earnings headline for the Drive sheet.
  const loadToday = () =>
    api
      .get('/rides/history')
      .then((r) => {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const todays = (r.data as Ride[]).filter(
          (x) =>
            x.status === 'COMPLETED' &&
            new Date(x.completedAt ?? x.createdAt).getTime() >= startOfToday.getTime()
        );
        setTodayEarned({
          sum: Math.round(todays.reduce((n, x) => n + x.fare, 0)),
          trips: todays.length,
        });
      })
      .catch(() => {});
  useEffect(() => {
    loadToday();
  }, []);

  useEffect(() => {
    const socket = getSocket(token);
    const onRequest = (payload: Ride) => {
      setRequests((prev) => (prev.some((p) => p.id === payload.id) ? prev : [...prev, payload]));
    };
    const onStatus = (msg: { rideId: string; status: RideStatus }) => {
      setRide((prev) => (prev && prev.id === msg.rideId ? { ...prev, status: msg.status } : prev));
      if (msg.status === 'COMPLETED') setShowRating(true);
      // Remove taken requests from the inbox
      setRequests((prev) => prev.filter((p) => p.id !== msg.rideId));
    };
    const onLoc = (msg: { rideId: string; lat: number; lng: number }) =>
      setDriverPos({ lat: msg.lat, lng: msg.lng });
    // Rider accepted our counter-offer — the full ride arrives here.
    const onAssigned = (full: Ride) => {
      setRide(full);
      setRequests([]);
      setNego({});
      setSnap('half');
      toast('Ride confirmed — head to pickup', 'success');
    };
    // Another driver got the ride (or it was cancelled) — drop the card.
    const onTaken = (msg: { rideId: string }) => {
      setRequests((prev) => prev.filter((p) => p.id !== msg.rideId));
      setNego((prev) => {
        const { [msg.rideId]: _gone, ...rest } = prev;
        return rest;
      });
    };
    // Rider declined our counter-offer.
    const onOfferResult = (msg: { rideId: string; accepted: boolean }) => {
      if (msg.accepted) return; // acceptance arrives via ride:assigned
      setNego((prev) =>
        prev[msg.rideId] ? { ...prev, [msg.rideId]: { ...prev[msg.rideId], state: 'declined' } } : prev
      );
    };

    socket.on('ride:request', onRequest);
    socket.on('ride:status', onStatus);
    socket.on('driver:location', onLoc);
    socket.on('ride:assigned', onAssigned);
    socket.on('ride:taken', onTaken);
    socket.on('offer:result', onOfferResult);
    return () => {
      socket.off('ride:request', onRequest);
      socket.off('ride:status', onStatus);
      socket.off('driver:location', onLoc);
      socket.off('ride:assigned', onAssigned);
      socket.off('ride:taken', onTaken);
      socket.off('offer:result', onOfferResult);
    };
  }, [token]);

  useEffect(() => {
    if (ride && ride.id !== rideIdRef.current) {
      getSocket(token).emit('ride:join', ride.id);
      rideIdRef.current = ride.id;
    }
    // An active ride owns the screen — snap back to the Drive tab.
    if (ride) setTab('drive');
  }, [ride, token]);

  const toggleOnline = async () => {
    const next = !online;
    setOnline(next);
    await api.post('/driver/online', { isOnline: next });
    if (!next) setRequests([]);
    refresh();
    toast(next ? 'You’re online — requests incoming' : 'You’re offline', next ? 'success' : 'info');
  };

  const accept = async (req: Ride) => {
    try {
      const r = await api.post(`/rides/${req.id}/accept`);
      if (r.data.pending) {
        // Rider has auto-accept off: our accept became an offer at their
        // fare, and they still have to approve it.
        setNego((prev) => ({
          ...prev,
          [req.id]: { amount: r.data.offer.amount, state: 'sent' },
        }));
        toast('Sent to the rider for approval');
        return;
      }
      setRide(r.data);
      setRequests([]);
      setNego({});
      setSnap('half');
    } catch {
      // someone else took it
      setRequests((prev) => prev.filter((p) => p.id !== req.id));
      toast('Another driver took that one', 'error');
    }
  };

  const decline = (req: Ride) => {
    api.post(`/rides/${req.id}/decline`);
    setRequests((prev) => prev.filter((p) => p.id !== req.id));
  };

  // The 10s window ran out with no action — quietly drop the request.
  const expireRequest = (id: string) => {
    api.post(`/rides/${id}/decline`).catch(() => {});
    setRequests((prev) => prev.filter((p) => p.id !== id));
  };

  const setNegoAmount = (rideId: string, amount: number) =>
    setNego((prev) => ({
      ...prev,
      [rideId]: { amount, state: prev[rideId]?.state ?? 'idle' },
    }));

  const sendOffer = async (req: Ride, amount: number) => {
    try {
      const r = await api.post(`/rides/${req.id}/offer`, { amount });
      setNego((prev) => ({ ...prev, [req.id]: { amount: r.data.amount, state: 'sent' } }));
      toast('Offer sent — waiting for the rider');
    } catch {
      // ride no longer available
      setRequests((prev) => prev.filter((p) => p.id !== req.id));
      toast('That request is gone', 'error');
    }
  };

  const startTrip = async () => {
    if (ride) await api.post(`/rides/${ride.id}/start`);
  };

  const resetRide = () => {
    setRide(null);
    setDriverPos(null);
    setShowRating(false);
    setSnap('peek');
    rideIdRef.current = null;
    loadToday();
  };

  const mapPickup = ride ? { lat: ride.pickupLat, lng: ride.pickupLng } : null;
  const mapDrop = ride ? { lat: ride.dropLat, lng: ride.dropLng } : null;

  // First request in the queue becomes the full-screen takeover.
  const activeReq = !ride && online ? requests[0] : undefined;
  const activeEntry: NegoEntry = activeReq
    ? (nego[activeReq.id] ?? {
        amount: activeReq.recommendedFare || activeReq.fare,
        state: 'idle' as const,
      })
    : { amount: 0, state: 'idle' };

  const hint: Partial<Record<RideStatus, string>> = {
    DRIVER_ASSIGNED: 'Heading to pickup…',
    EN_ROUTE_TO_PICKUP: 'Driving to the rider…',
    ARRIVED: 'You’ve arrived at pickup.',
    IN_PROGRESS: 'Trip in progress — driving to destination…',
    COMPLETED: 'Trip completed.',
  };

  return (
    <div className="flex h-full flex-col">
      {/* Slim ride-in-progress header */}
      {ride && tab === 'drive' && (
        <header className="z-[1400] flex shrink-0 items-center justify-between gap-2 border-b border-hairline bg-surface/95 px-4 py-2.5 pt-[calc(10px+env(safe-area-inset-top))] backdrop-blur">
          <StatusBadge status={ride.status} />
          <div className="flex items-center gap-2">
            <span className="text-sm" aria-hidden>
              {TIERS[ride.tier]?.emoji}
            </span>
            <FareAmount value={ride.fare} className="text-lg" />
          </div>
        </header>
      )}

      <div className="relative min-h-0 flex-1">
        {tab === 'earnings' ? (
          <div className="h-full overflow-y-auto">
            <EarningsPanel />
          </div>
        ) : tab === 'profile' ? (
          <ProfileScreen />
        ) : (
          <>
            <MapView
              pickup={mapPickup}
              drop={mapDrop}
              driver={driverPos}
              driverEmoji={ride ? TIERS[ride.tier]?.emoji : '🚗'}
              driverPulse={
                ride?.status === 'EN_ROUTE_TO_PICKUP' || ride?.status === 'DRIVER_ASSIGNED'
              }
            />

            <BottomSheet
              snap={snap}
              onSnapChange={setSnap}
              peek={ride ? 185 : 210}
              snaps={['peek', 'half', 'full']}
            >
              {!ride ? (
                <div className="space-y-4 pb-8">
                  {/* Big online/offline toggle */}
                  <button
                    onClick={toggleOnline}
                    className={`flex h-16 w-full items-center justify-center gap-3 rounded-2xl font-display text-lg font-bold transition active:scale-[0.97] ${
                      online
                        ? 'animate-pulse-soft bg-kesar text-[#1B0E03]'
                        : 'border border-hairline bg-surface2'
                    }`}
                  >
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${online ? 'bg-[#1B0E03]' : 'bg-muted'}`}
                    />
                    {online ? 'You’re online' : 'Go online'}
                  </button>

                  {/* Today's earnings headline */}
                  <div className="flex items-end justify-between px-1">
                    <div>
                      <div className="text-xs text-muted">Today’s earnings</div>
                      <FareAmount
                        value={todayEarned?.sum ?? 0}
                        className="text-3xl text-kesar"
                      />
                    </div>
                    <span className="pb-1 text-xs text-muted">
                      {todayEarned ? `${todayEarned.trips} trip${todayEarned.trips === 1 ? '' : 's'}` : ''}
                    </span>
                  </div>

                  {online ? (
                    <div className="flex items-center gap-3 rounded-2xl border border-hairline bg-surface2/60 px-4 py-4">
                      <span className="relative flex h-3 w-3 shrink-0">
                        <span className="absolute inline-flex h-full w-full animate-ping-dot rounded-full bg-kesar/70" />
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-kesar" />
                      </span>
                      <span className="text-sm text-muted">Waiting for ride requests…</span>
                    </div>
                  ) : (
                    <p className="rounded-2xl border border-hairline bg-surface2/60 px-4 py-4 text-sm text-muted">
                      You’re offline. Go online to receive ride requests.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4 pb-24">
                  {ride.rider && (
                    <div className="flex items-center gap-3">
                      <Avatar name={ride.rider.name} size={52} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-display text-[17px] font-bold">
                            {ride.rider.name}
                          </span>
                          {ride.rider.avgRating != null && (
                            <span className="shrink-0 text-xs font-semibold text-warn">
                              ★ {ride.rider.avgRating}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 truncate text-sm text-muted">
                          {hint[ride.status] ?? ''}
                        </div>
                      </div>
                      <button
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface2 transition active:scale-[0.92]"
                        aria-label="Call rider"
                        onClick={() => toast('Calling is mocked in this prototype')}
                      >
                        📞
                      </button>
                    </div>
                  )}

                  <div className="rounded-2xl border border-hairline bg-surface2/60 px-3 py-3">
                    <RideStepper status={ride.status} />
                  </div>

                  <div className="space-y-2 border-t border-dashed border-hairline pt-3.5 text-sm">
                    <div className="flex items-center gap-2.5">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-kesar" />
                      <span className="truncate">{ride.pickupLabel}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-neela" />
                      <span className="truncate">{ride.dropLabel}</span>
                    </div>
                    {formatSchedule(ride.scheduledAt) && (
                      <div className="flex items-center gap-2.5 text-muted">
                        <span aria-hidden>🗓️</span>
                        <span>Scheduled: {formatSchedule(ride.scheduledAt)}</span>
                      </div>
                    )}
                  </div>

                  {/* Navigate row (mock) */}
                  {(ride.status === 'DRIVER_ASSIGNED' ||
                    ride.status === 'EN_ROUTE_TO_PICKUP') && (
                    <button
                      className="flex min-h-[48px] w-full items-center justify-between rounded-2xl bg-surface2 px-4 text-sm font-semibold transition active:scale-[0.98]"
                      onClick={() => toast('Navigation is mocked — the simulator drives you')}
                    >
                      <span>🧭 Navigate to pickup</span>
                      <span className="text-muted">›</span>
                    </button>
                  )}
                </div>
              )}
            </BottomSheet>

            {/* State-advancing CTA */}
            {ride?.status === 'ARRIVED' && (
              <Dock>
                <BarButton onClick={startTrip}>▶ Start trip</BarButton>
              </Dock>
            )}
          </>
        )}
      </div>

      {!ride && !activeReq && <TabBar tabs={TABS} active={tab} onChange={setTab} />}

      {activeReq && (
        <RequestTakeover
          key={activeReq.id}
          req={activeReq}
          entry={activeEntry}
          queued={requests.length - 1}
          onAccept={() => accept(activeReq)}
          onDismiss={() => decline(activeReq)}
          onExpire={() => expireRequest(activeReq.id)}
          onSetAmount={(v) => setNegoAmount(activeReq.id, v)}
          onSendOffer={() => sendOffer(activeReq, activeEntry.amount)}
        />
      )}

      {showRating && ride && (
        <RatingModal
          rideId={ride.id}
          counterpartyName={ride.rider?.name ?? 'your rider'}
          onDone={() => {
            refresh();
            resetRide();
          }}
        />
      )}
    </div>
  );
}
