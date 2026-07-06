// Real geolocation + geocoding.
//
// Pickup uses the browser's Geolocation API for the rider's live position;
// drop-off is chosen via free-text search. Both the search and reverse lookup
// go through OpenStreetMap's Nominatim service (no API key, fair-use only).
// To move to a paid provider later, swap the two fetch() calls below — the
// GeoPlace shape is all the rest of the app depends on.

export interface GeoPlace {
  label: string;
  lat: number;
  lng: number;
}

const NOMINATIM = 'https://nominatim.openstreetmap.org';
// Bias results toward Pakistan so a search for "airport" surfaces local hits.
const COUNTRY_CODES = 'pk';

/** Get the rider's current position. Rejects if denied/unavailable. */
export function getCurrentLocation(): Promise<GeoPlace> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation is not supported on this device'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        let label = 'Current location';
        try {
          label = await reverseGeocode(lat, lng);
        } catch {
          // keep the generic label if reverse geocoding fails
        }
        resolve({ lat, lng, label });
      },
      (err) => reject(new Error(err.message || 'Could not get your location')),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 }
    );
  });
}

/** Turn coordinates into a human-readable address. */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const url = `${NOMINATIM}/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('Reverse geocoding failed');
  const data = await res.json();
  return shortLabel(data?.display_name) || 'Current location';
}

/** Free-text place search, biased to Pakistan. Returns up to `limit` matches. */
export async function searchPlaces(query: string, limit = 6): Promise<GeoPlace[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const url =
    `${NOMINATIM}/search?format=jsonv2&q=${encodeURIComponent(q)}` +
    `&countrycodes=${COUNTRY_CODES}&limit=${limit}&addressdetails=1`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('Place search failed');
  const data = (await res.json()) as Array<{
    display_name: string;
    lat: string;
    lon: string;
  }>;
  return data.map((d) => ({
    label: shortLabel(d.display_name),
    lat: parseFloat(d.lat),
    lng: parseFloat(d.lon),
  }));
}

// Nominatim display names are long ("A, B, C, District, Province, Postal, Pakistan").
// Keep the first few, most-specific parts so labels stay readable on mobile.
function shortLabel(displayName?: string): string {
  if (!displayName) return '';
  const parts = displayName.split(',').map((p) => p.trim());
  return parts.slice(0, 3).join(', ');
}
