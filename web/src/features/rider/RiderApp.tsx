import { useEffect, useRef, useState } from 'react';
import type { Ride, RideStatus, RideTier, LatLng, FareEstimate, Offer } from '@uber-clone/shared';
import { TIERS } from '@uber-clone/shared';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { getSocket } from '../../lib/socket';
import { getCurrentLocation, reverseGeocode, type GeoPlace } from '../../lib/geo';
import { playArrivalChime } from '../../lib/sound';
import { MapView } from '../../components/MapView';
import { BottomSheet, type SnapPoint } from '../../components/BottomSheet';
import { TabBar } from '../../components/TabBar';
import { BarButton, Dock } from '../../components/BarButton';
import { SwipeToConfirm } from '../../components/SwipeToConfirm';
import { StatusBadge } from '../../components/ui';
import { FareAmount } from '../../components/FareTicket';
import { RatingModal } from '../../components/RatingModal';
import { LocationTakeover } from '../../components/LocationSearch';
import { HistoryList } from '../../components/HistoryList';
import { ProfileScreen } from '../../components/ProfileScreen';
import { toast } from '../../components/Toast';
import { HomeSheet } from './HomeSheet';
import { TrackingSheet } from './TrackingSheet';
import { ReceiptTakeover } from './ReceiptTakeover';

type Tab = 'home' | 'rides' | 'profile';

const TABS = [
  { key: 'home' as Tab, label: 'Home', icon: '🏠' },
  { key: 'rides' as Tab, label: 'Rides', icon: '🧾' },
  { key: 'profile' as Tab, label: 'Profile', icon: '👤' },
];

// How long the rider is asked to wait at pickup before a "free" cancel.
const PICKUP_WAIT_MS = 5 * 60 * 1000;

export function RiderApp() {
  const { user, token, refresh } = useAuth();
  const [tab, setTab] = useState<Tab>('home');
  const [snap, setSnap] = useState<SnapPoint>('peek');

  const [pickup, setPickup] = useState<GeoPlace | null>(null);
  const [drop, setDrop] = useState<GeoPlace | null>(null);
  const [locating, setLocating] = useState(true);
  const [locError, setLocError] = useState<string | null>(null);
  // Full-sheet search takeover target, and tap-the-map pickup mode.
  const [searchTarget, setSearchTarget] = useState<'pickup' | 'drop' | null>(null);
  const [mapPick, setMapPick] = useState(false);
  const [recents, setRecents] = useState<GeoPlace[]>([]);

  // Within-city vs city-to-city (intercity). Purely a UX helper for choosing
  // locations — the backend treats every ride the same (pickup/drop coords).
  const [rideMode, setRideMode] = useState<'CITY' | 'INTERCITY'>('CITY');

  const [tier, setTier] = useState<RideTier>('ECONOMY');
  const [estimate, setEstimate] = useState<FareEstimate | null>(null);
  const [offeredFare, setOfferedFare] = useState<number | null>(null);
  // Auto-accept: first driver who agrees to the offered fare is booked
  // instantly. Persisted so the choice sticks across sessions.
  const [autoAccept, setAutoAccept] = useState(
    () => localStorage.getItem('autoAccept') !== 'off'
  );
  const [driversOnline, setDriversOnline] = useState<number | null>(null);

  // Optional scheduling ("Later" in the segmented control).
  const [scheduleOn, setScheduleOn] = useState(false);
  const [date, setDate] = useState(todayInput());
  const [time, setTime] = useState('09:00');
  const scheduledAt = scheduleOn ? isoFromInputs(date, time) : null;
  const scheduleInPast = scheduledAt != null && new Date(scheduledAt).getTime() < Date.now();

  const toggleAutoAccept = () =>
    setAutoAccept((v) => {
      localStorage.setItem('autoAccept', v ? 'off' : 'on');
      return !v;
    });

  const [ride, setRide] = useState<Ride | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [driverPos, setDriverPos] = useState<LatLng | null>(null);
  const [arrivedAt, setArrivedAt] = useState<number | null>(null);
  // The rider confirmed they've met the driver — hides the wait timer and
  // lets them start the ride.
  const [metDriver, setMetDriver] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const rideIdRef = useRef<string | null>(null);
  const prevStatusRef = useRef<RideStatus | null>(null);

  // Detect the rider's live location for pickup on mount.
  const detectLocation = () => {
    setLocating(true);
    setLocError(null);
    getCurrentLocation()
      .then((p) => setPickup(p))
      .catch((e) => setLocError(e.message || 'Location unavailable'))
      .finally(() => setLocating(false));
  };
  useEffect(detectLocation, []);

  // Tap the map to drop a pickup pin (map-pick mode); label via reverse geocode.
  const pickPickupFromMap = async (p: LatLng) => {
    setPickup({ label: 'Selected on map', ...p });
    try {
      const label = await reverseGeocode(p.lat, p.lng);
      setPickup({ label, ...p });
    } catch {
      // keep the generic label if reverse geocoding fails
    }
  };

  // Load any active ride (and its pending driver offers) on mount
  useEffect(() => {
    api.get('/rides/active').then((r) => {
      if (r.data) {
        setRide(r.data);
        setDriverPos(r.data.driverPos ?? null);
        setOffers(r.data.offers ?? []);
        setSnap('half');
      }
    });
  }, []);

  // Recent destinations for the home chips + search takeover.
  useEffect(() => {
    api
      .get('/rides/history')
      .then((r) => {
        const seen = new Set<string>();
        const rec: GeoPlace[] = [];
        for (const rd of r.data as Ride[]) {
          if (!rd.dropLabel || seen.has(rd.dropLabel)) continue;
          seen.add(rd.dropLabel);
          rec.push({ label: rd.dropLabel, lat: rd.dropLat, lng: rd.dropLng });
          if (rec.length >= 4) break;
        }
        setRecents(rec);
      })
      .catch(() => {});
  }, []);

  // Ring a chime + start the wait timer the moment the driver arrives.
  useEffect(() => {
    const s = ride?.status;
    if (s === 'ARRIVED') {
      if (prevStatusRef.current !== 'ARRIVED') {
        playArrivalChime();
        setArrivedAt(Date.now());
      }
    } else {
      setArrivedAt(null);
      setMetDriver(false);
    }
    prevStatusRef.current = s ?? null;
  }, [ride?.status]);

  // Fare estimate whenever pickup/drop/tier change (before requesting).
  // The rider's offered fare resets to the fresh recommended fare.
  useEffect(() => {
    if (pickup && drop) {
      api.post('/estimate', { pickup, drop, tier }).then((r) => {
        setEstimate(r.data);
        setOfferedFare(r.data.fare);
      });
    } else {
      setEstimate(null);
      setOfferedFare(null);
    }
  }, [pickup, drop, tier]);

  // Online driver count, refreshed while the booking form is showing
  useEffect(() => {
    if (ride) return;
    const load = () =>
      api.get('/drivers/online-count').then((r) => setDriversOnline(r.data.count));
    load();
    const t = setInterval(load, 10_000);
    return () => clearInterval(t);
  }, [ride]);

  // Socket wiring
  useEffect(() => {
    const socket = getSocket(token);
    const onAssigned = (full: Ride) => {
      setRide(full);
      setOffers([]);
      toast(`${full.driver?.name ?? 'Your driver'} is on the way`, 'success');
    };
    const onStatus = (msg: { rideId: string; status: RideStatus; ride?: Ride }) => {
      setRide((prev) => (prev ? { ...prev, status: msg.status, ...(msg.ride ?? {}) } : prev));
      if (msg.status === 'COMPLETED') setShowPayment(true);
    };
    const onLoc = (msg: { rideId: string; lat: number; lng: number }) =>
      setDriverPos({ lat: msg.lat, lng: msg.lng });
    const onOffer = (offer: Offer) =>
      setOffers((prev) => {
        // Re-offers reuse the same offer row — replace, don't duplicate.
        const rest = prev.filter((o) => o.id !== offer.id);
        return [...rest, offer];
      });

    socket.on('ride:assigned', onAssigned);
    socket.on('ride:status', onStatus);
    socket.on('driver:location', onLoc);
    socket.on('offer:new', onOffer);
    return () => {
      socket.off('ride:assigned', onAssigned);
      socket.off('ride:status', onStatus);
      socket.off('driver:location', onLoc);
      socket.off('offer:new', onOffer);
    };
  }, [token]);

  // Join the ride room when we have a ride
  useEffect(() => {
    if (ride && ride.id !== rideIdRef.current) {
      const socket = getSocket(token);
      if (rideIdRef.current) socket.emit('ride:leave', rideIdRef.current);
      socket.emit('ride:join', ride.id);
      rideIdRef.current = ride.id;
    }
  }, [ride, token]);

  const requestRide = async () => {
    if (!pickup || !drop) return;
    const r = await api.post('/rides', {
      pickup: { ...pickup },
      drop: { ...drop },
      scheduledAt,
      tier,
      offeredFare,
      autoAccept,
    });
    setRide(r.data);
    setDriverPos(null);
    setOffers([]);
    setMapPick(false);
    setSnap('half');
    toast(scheduleOn ? 'Ride scheduled' : 'Ride booked', 'success');
  };

  const cancelRide = async () => {
    if (!ride) return;
    await api.post(`/rides/${ride.id}/cancel`);
    resetRide();
    toast('Ride cancelled');
  };

  const startRide = async () => {
    if (!ride) return;
    await api.post(`/rides/${ride.id}/start`);
    // The simulator drives the trip and emits status updates from here.
  };

  const acceptOffer = async (offer: Offer) => {
    try {
      const r = await api.post(`/offers/${offer.id}/accept`);
      setRide(r.data);
      setOffers([]);
    } catch {
      // Offer expired (driver took another ride, etc.) — drop it.
      setOffers((prev) => prev.filter((o) => o.id !== offer.id));
      toast('That offer is no longer available', 'error');
    }
  };

  const declineOffer = async (offer: Offer) => {
    setOffers((prev) => prev.filter((o) => o.id !== offer.id));
    api.post(`/offers/${offer.id}/decline`).catch(() => {});
  };

  const resetRide = () => {
    setRide(null);
    setDriverPos(null);
    setOffers([]);
    setArrivedAt(null);
    setMetDriver(false);
    setShowPayment(false);
    setShowRating(false);
    setDrop(null);
    setScheduleOn(false);
    setSnap('peek');
  };

  const finishPayment = () => {
    setShowPayment(false);
    setShowRating(true);
  };

  const openSearch = (target: 'pickup' | 'drop') => setSearchTarget(target);

  const onSearchSelect = (p: GeoPlace) => {
    if (searchTarget === 'pickup') setPickup(p);
    else {
      setDrop(p);
      setSnap('half');
    }
    setSearchTarget(null);
  };

  const pickRecent = (p: GeoPlace) => {
    setDrop(p);
    setSnap('half');
  };

  const mapPickup = ride ? { lat: ride.pickupLat, lng: ride.pickupLng } : pickup;
  const mapDrop = ride ? { lat: ride.dropLat, lng: ride.dropLng } : drop;

  const searching = ride?.status === 'SEARCHING';
  const arrived = ride?.status === 'ARRIVED';
  // Cancel is allowed any time after booking, up until the trip actually starts.
  const canCancel =
    !!ride &&
    (searching ||
      ride.status === 'DRIVER_ASSIGNED' ||
      ride.status === 'EN_ROUTE_TO_PICKUP' ||
      ride.status === 'ARRIVED');

  const canBook = !!pickup && !!drop && !scheduleInPast && offeredFare != null;

  return (
    <div className="flex h-full flex-col">
      {/* Slim ride-in-progress header */}
      {ride && tab === 'home' && (
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
      {arrived && !metDriver && arrivedAt != null && tab === 'home' && (
        <ArrivalBar since={arrivedAt} waitMs={PICKUP_WAIT_MS} />
      )}

      <div className="relative min-h-0 flex-1">
        {tab === 'home' ? (
          <>
            <MapView
              pickup={mapPickup}
              drop={mapDrop}
              driver={driverPos}
              driverEmoji={ride ? TIERS[ride.tier]?.emoji : '🚗'}
              driverPulse={
                ride?.status === 'EN_ROUTE_TO_PICKUP' || ride?.status === 'DRIVER_ASSIGNED'
              }
              onPick={!ride && mapPick ? pickPickupFromMap : undefined}
            />

            {/* Tap-the-map pickup banner */}
            {!ride && mapPick && (
              <div className="absolute left-1/2 top-3 z-[1100] flex -translate-x-1/2 items-center gap-2 rounded-full border border-kesar/40 bg-surface/95 py-1.5 pl-4 pr-1.5 text-sm shadow-lg backdrop-blur">
                <span className="whitespace-nowrap">Tap the map to set pickup</span>
                <button
                  className="min-h-[36px] rounded-full bg-kesar px-3 text-xs font-bold text-[#1B0E03] active:scale-[0.95]"
                  onClick={() => setMapPick(false)}
                >
                  Done
                </button>
              </div>
            )}

            <BottomSheet snap={snap} onSnapChange={setSnap} peek={ride ? 190 : 185}>
              {!ride ? (
                <HomeSheet
                  firstName={(user?.name ?? 'there').split(' ')[0]}
                  rideMode={rideMode}
                  setRideMode={setRideMode}
                  pickup={pickup}
                  drop={drop}
                  locating={locating}
                  locError={locError}
                  tier={tier}
                  setTier={setTier}
                  estimate={estimate}
                  offeredFare={offeredFare}
                  setOfferedFare={setOfferedFare}
                  autoAccept={autoAccept}
                  onToggleAutoAccept={toggleAutoAccept}
                  driversOnline={driversOnline}
                  recents={recents}
                  onPickRecent={pickRecent}
                  onOpenSearch={openSearch}
                  scheduleOn={scheduleOn}
                  setScheduleOn={setScheduleOn}
                  date={date}
                  setDate={setDate}
                  time={time}
                  setTime={setTime}
                  minDate={todayInput()}
                  scheduleInPast={scheduleInPast}
                />
              ) : (
                <TrackingSheet
                  ride={ride}
                  offers={offers}
                  onAcceptOffer={acceptOffer}
                  onDeclineOffer={declineOffer}
                />
              )}
            </BottomSheet>

            {/* Docked one-thumb CTAs */}
            {!ride && drop && (
              <Dock>
                <BarButton disabled={!canBook} onClick={requestRide}>
                  {scheduleOn ? 'Schedule ride' : 'Book ride'}
                  {offeredFare != null && (
                    <span className="opacity-80">· Rs {offeredFare.toLocaleString()}</span>
                  )}
                </BarButton>
              </Dock>
            )}
            {ride && (
              <Dock>
                {arrived && !metDriver && (
                  <BarButton onClick={() => setMetDriver(true)}>
                    👋 I’ve met my driver
                  </BarButton>
                )}
                {arrived && metDriver && (
                  <BarButton onClick={startRide}>▶ Start ride</BarButton>
                )}
                {canCancel && (
                  <SwipeToConfirm
                    label={searching ? 'Slide to cancel request' : 'Slide to cancel ride'}
                    onConfirm={cancelRide}
                  />
                )}
              </Dock>
            )}
          </>
        ) : tab === 'rides' ? (
          <div className="h-full overflow-y-auto">
            <HistoryList role="RIDER" />
          </div>
        ) : (
          <ProfileScreen />
        )}
      </div>

      {!ride && <TabBar tabs={TABS} active={tab} onChange={setTab} />}

      {searchTarget && (
        <LocationTakeover
          title={searchTarget === 'drop' ? 'Where to?' : 'Pickup point'}
          placeholder={
            searchTarget === 'drop' ? 'Search destination…' : 'Search a pickup point…'
          }
          accent={searchTarget === 'drop' ? 'neela' : 'kesar'}
          recents={searchTarget === 'drop' ? recents : []}
          quickRows={
            searchTarget === 'pickup'
              ? [
                  {
                    icon: '📍',
                    label: 'Use my current location',
                    hint: locError ?? undefined,
                    onPick: () => {
                      detectLocation();
                      setSearchTarget(null);
                    },
                  },
                  {
                    icon: '🗺️',
                    label: 'Choose on the map',
                    hint: 'Drop a pin anywhere',
                    onPick: () => {
                      setMapPick(true);
                      setSearchTarget(null);
                      setSnap('peek');
                    },
                  },
                ]
              : []
          }
          onClose={() => setSearchTarget(null)}
          onSelect={onSearchSelect}
        />
      )}

      {showPayment && ride && <ReceiptTakeover ride={ride} onDone={finishPayment} />}
      {showRating && ride && (
        <RatingModal
          rideId={ride.id}
          counterpartyName={ride.driver?.name ?? 'your driver'}
          onDone={() => {
            refresh();
            resetRide();
          }}
        />
      )}
    </div>
  );
}

/** 5-minute wait bar pinned under the ride header once the driver arrives. */
function ArrivalBar({ since, waitMs }: { since: number; waitMs: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const remaining = Math.max(0, waitMs - (now - since));
  const done = remaining <= 0;
  const mm = Math.floor(remaining / 60000);
  const ss = Math.floor((remaining % 60000) / 1000);

  return (
    <div className="z-[1400] shrink-0 border-b border-hairline bg-surface px-4 py-2">
      {done ? (
        <p className="text-xs font-medium text-danger">
          You’ve waited 5 minutes — you can cancel free of charge below.
        </p>
      ) : (
        <>
          <div className="mb-1 flex items-center justify-between text-[11px]">
            <span className="text-muted">Meet your driver — free cancel in</span>
            <span className="font-display font-bold tabular-nums">
              {mm}:{ss.toString().padStart(2, '0')}
            </span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-hairline">
            <div
              className="h-full rounded-full bg-kesar transition-[width] duration-1000 ease-linear"
              style={{ width: `${(remaining / waitMs) * 100}%` }}
            />
          </div>
        </>
      )}
    </div>
  );
}

// yyyy-mm-dd for a <input type="date"> in the user's local timezone.
function todayInput(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

// Combine a date + time input into an ISO timestamp (local time).
function isoFromInputs(date: string, time: string): string | null {
  if (!date || !time) return null;
  const d = new Date(`${date}T${time}`);
  return isNaN(d.getTime()) ? null : d.toISOString();
}
