export type Role = 'RIDER' | 'DRIVER' | 'ADMIN';

export type RideTier = 'BIKE' | 'RICKSHAW' | 'ECONOMY' | 'COMFORT' | 'PREMIUM';

export const TIERS: Record<RideTier, { label: string; multiplier: number; blurb: string; emoji: string }> = {
  BIKE: { label: 'Bike', multiplier: 0.6, blurb: 'Cheapest, 1 rider', emoji: '🏍️' },
  RICKSHAW: { label: 'Rickshaw', multiplier: 0.8, blurb: 'Up to 3, budget-friendly', emoji: '🛺' },
  ECONOMY: { label: 'Economy', multiplier: 1, blurb: 'Everyday rides', emoji: '🚗' },
  COMFORT: { label: 'Comfort', multiplier: 1.4, blurb: 'Newer cars, more room', emoji: '🚙' },
  PREMIUM: { label: 'Premium', multiplier: 1.8, blurb: 'Top drivers, luxury cars', emoji: '✨' },
};

export type RideStatus =
  | 'SEARCHING'
  | 'DRIVER_ASSIGNED'
  | 'EN_ROUTE_TO_PICKUP'
  | 'ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export const RIDE_STATUS_LABELS: Record<RideStatus, string> = {
  SEARCHING: 'Finding your driver…',
  DRIVER_ASSIGNED: 'Driver assigned',
  EN_ROUTE_TO_PICKUP: 'Driver en route',
  ARRIVED: 'Driver has arrived',
  IN_PROGRESS: 'Trip in progress',
  COMPLETED: 'Trip completed',
  CANCELLED: 'Cancelled',
};

export interface LatLng {
  lat: number;
  lng: number;
}

export interface UserPublic {
  id: string;
  email: string;
  name: string;
  role: Role;
  isOnline: boolean;
  avgRating: number | null;
  vehicle?: string | null;
}

export type OfferStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED';

// A driver's counter-offer on a searching ride (InDrive-style bargaining).
export interface Offer {
  id: string;
  rideId: string;
  driverId: string;
  amount: number;
  status: OfferStatus;
  createdAt: string;
  driver?: UserPublic;
}

export interface Ride {
  id: string;
  riderId: string;
  driverId: string | null;
  status: RideStatus;
  pickupLat: number;
  pickupLng: number;
  pickupLabel: string;
  dropLat: number;
  dropLng: number;
  dropLabel: string;
  distanceKm: number;
  durationMin: number;
  fare: number; // the rider's offered fare, or the agreed fare once matched
  recommendedFare: number; // app-suggested fare the offer is bargained around
  autoAccept: boolean; // true: first driver to accept the rider's fare is booked instantly
  tier: RideTier;
  scheduledAt: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  rider?: UserPublic;
  driver?: UserPublic | null;
}

// ---- Admin dashboard types ----

export interface AdminStats {
  riders: number;
  drivers: number;
  driversOnline: number;
  activeRides: number;
  completedRides: number;
  cancelledRides: number;
  revenue: number; // sum of completed-ride fares, in PKR
  ridesByStatus: Record<RideStatus, number>;
}

export interface AdminUserRow extends UserPublic {
  rideCount: number;
  createdAt: string;
}

// ---- Fare / distance logic (mock, but centralized so both sides agree) ----

// Fares are in Pakistani Rupees (PKR). Tuned to feel plausible for both
// short within-city hops and long city-to-city trips.
const BASE_FARE = 120;
const PER_KM = 45;
const PER_MIN = 4;
const ROAD_FACTOR = 1.4; // straight-line -> rough road distance
const AVG_SPEED_KMH = 45;

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export interface FareEstimate {
  distanceKm: number;
  durationMin: number;
  fare: number;
}

export function estimateFare(pickup: LatLng, drop: LatLng, tier: RideTier = 'ECONOMY'): FareEstimate {
  const distanceKm = haversineKm(pickup, drop) * ROAD_FACTOR;
  const durationMin = (distanceKm / AVG_SPEED_KMH) * 60;
  const fare = (BASE_FARE + distanceKm * PER_KM + durationMin * PER_MIN) * TIERS[tier].multiplier;
  return {
    distanceKm: Math.round(distanceKm * 100) / 100,
    durationMin: Math.max(1, Math.round(durationMin)),
    fare: Math.round(fare), // whole rupees
  };
}

// Itemized breakdown for the receipt screen. Recomputed from the stored
// distance/duration so it always reconciles with the charged fare.
export interface FareBreakdown {
  base: number;
  distanceCost: number;
  timeCost: number;
  multiplier: number; // tier multiplier applied to the subtotal
  total: number;
}

// ---- Fare bargaining (InDrive-style) ----
// Riders and drivers can move the fare, but only within these bounds of the
// recommended fare, enforced on both client and server.
export const FARE_MIN_FACTOR = 0.8;
export const FARE_MAX_FACTOR = 1.5;

export function fareBounds(recommended: number): { min: number; max: number } {
  return {
    min: Math.round(recommended * FARE_MIN_FACTOR),
    max: Math.round(recommended * FARE_MAX_FACTOR),
  };
}

export function clampFare(amount: number, recommended: number): number {
  const { min, max } = fareBounds(recommended);
  return Math.min(max, Math.max(min, Math.round(amount)));
}

// Step size for the -/+ buttons: ~2% of the fare, in Rs 10 increments.
export function fareStep(recommended: number): number {
  return Math.max(10, Math.round((recommended * 0.02) / 10) * 10);
}

export function fareBreakdown(distanceKm: number, durationMin: number, tier: RideTier = 'ECONOMY'): FareBreakdown {
  const multiplier = TIERS[tier]?.multiplier ?? 1;
  return {
    base: BASE_FARE,
    distanceCost: Math.round(distanceKm * PER_KM),
    timeCost: Math.round(durationMin * PER_MIN),
    multiplier,
    total: Math.round((BASE_FARE + distanceKm * PER_KM + durationMin * PER_MIN) * multiplier),
  };
}
