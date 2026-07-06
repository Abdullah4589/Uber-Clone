import { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { LatLng } from '@uber-clone/shared';
import { MAP_CENTER } from '../lib/locations';

/**
 * MapProvider abstraction. Today this renders OpenStreetMap tiles via Leaflet.
 * To swap in Google/Mapbox later, replace the <TileLayer> and marker rendering
 * here — the rest of the app only passes pickup/drop/driver coordinates.
 */

// Pickup: kesar teardrop pin with a white core.
const pickupIcon = L.divIcon({
  className: '',
  html: `<div style="
    background:#FF7A1A;width:32px;height:32px;border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;
    box-shadow:0 3px 10px rgba(0,0,0,.55);border:2px solid rgba(255,255,255,.9)">
    <span style="width:9px;height:9px;border-radius:50%;background:#fff"></span></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

// Dropoff: neela flag on a slim pole.
const dropIcon = L.divIcon({
  className: '',
  html: `<div style="position:relative;width:26px;height:34px">
    <div style="position:absolute;left:2px;top:0;bottom:0;width:3px;border-radius:2px;
      background:#EDF1F5;box-shadow:0 2px 6px rgba(0,0,0,.5)"></div>
    <div style="position:absolute;left:5px;top:1px;width:19px;height:13px;
      background:#2FB8C6;border-radius:2px 3px 3px 2px;
      clip-path:polygon(0 0,100% 0,82% 50%,100% 100%,0 100%);
      box-shadow:0 2px 6px rgba(0,0,0,.4)"></div></div>`,
  iconSize: [26, 34],
  iconAnchor: [4, 34],
});

// Driver: kesar circular chip with the vehicle emoji; pulses while en route.
function driverIcon(emoji: string, pulse: boolean) {
  return L.divIcon({
    className: '',
    html: `<div class="${pulse ? 'driver-chip-pulse' : ''}" style="
      background:#FF7A1A;width:38px;height:38px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;font-size:19px;
      box-shadow:0 3px 12px rgba(0,0,0,.55);border:2.5px solid rgba(255,255,255,.92)">${emoji}</div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
}

function Recenter({ points }: { points: LatLng[] }) {
  const map = useMap();
  useMemo(() => {
    const valid = points.filter(Boolean);
    if (valid.length === 1) {
      map.setView([valid[0].lat, valid[0].lng], 14);
    } else if (valid.length > 1) {
      map.fitBounds(
        L.latLngBounds(valid.map((p) => [p.lat, p.lng] as [number, number])),
        { padding: [70, 70], maxZoom: 15 }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(points)]);
  return null;
}

// Emits a LatLng whenever the map is tapped (used for manual pickup picking).
function ClickPicker({ onPick }: { onPick: (p: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export interface MapViewProps {
  pickup?: LatLng | null;
  drop?: LatLng | null;
  driver?: LatLng | null;
  /** Vehicle emoji for the driver chip (defaults to a car). */
  driverEmoji?: string;
  /** Pulse the driver chip (while EN_ROUTE_TO_PICKUP). */
  driverPulse?: boolean;
  onPick?: (p: LatLng) => void;
}

export function MapView({
  pickup,
  drop,
  driver,
  driverEmoji = '🚗',
  driverPulse = false,
  onPick,
}: MapViewProps) {
  const points = [pickup, drop, driver].filter(Boolean) as LatLng[];
  const dIcon = useMemo(
    () => driverIcon(driverEmoji, driverPulse),
    [driverEmoji, driverPulse]
  );

  return (
    <MapContainer center={MAP_CENTER} zoom={13} className="h-full w-full" zoomControl={false}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />
      {pickup && <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon} />}
      {drop && <Marker position={[drop.lat, drop.lng]} icon={dropIcon} />}
      {driver && <Marker position={[driver.lat, driver.lng]} icon={dIcon} />}
      {pickup && drop && (
        <Polyline
          positions={[
            [pickup.lat, pickup.lng],
            [drop.lat, drop.lng],
          ]}
          pathOptions={{ color: '#2FB8C6', weight: 3, opacity: 0.65, dashArray: '6 8' }}
        />
      )}
      {onPick && <ClickPicker onPick={onPick} />}
      <Recenter points={points} />
    </MapContainer>
  );
}
