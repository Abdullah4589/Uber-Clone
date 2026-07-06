// Seeded, human-friendly locations for Pakistan so riders can pick pickup/drop
// without a geocoder. The app supports two kinds of trips:
//   • Within-city  — pickup & drop are landmarks inside a single city
//   • City-to-city — pickup & drop are two different cities (intercity)
// Swap this for a real geocoding provider later.

export interface NamedPlace {
  label: string;
  lat: number;
  lng: number;
}

export interface City {
  /** Short city name, e.g. "Karachi". */
  name: string;
  /** City-center coordinates, used as the anchor for intercity trips. */
  center: NamedPlace;
  /** Popular landmarks inside the city, used for within-city trips. */
  places: NamedPlace[];
}

export const CITIES: City[] = [
  {
    name: 'Karachi',
    center: { label: 'Karachi City Center', lat: 24.8607, lng: 67.0011 },
    places: [
      { label: 'Jinnah Int’l Airport', lat: 24.9065, lng: 67.1608 },
      { label: 'Clifton Sea View', lat: 24.8138, lng: 67.03 },
      { label: 'Dolmen Mall Clifton', lat: 24.811, lng: 67.029 },
      { label: 'Saddar', lat: 24.857, lng: 67.03 },
      { label: 'Gulshan-e-Iqbal', lat: 24.92, lng: 67.09 },
      { label: 'Tariq Road', lat: 24.8722, lng: 67.0616 },
    ],
  },
  {
    name: 'Lahore',
    center: { label: 'Lahore City Center', lat: 31.5497, lng: 74.3436 },
    places: [
      { label: 'Allama Iqbal Airport', lat: 31.5216, lng: 74.4036 },
      { label: 'Badshahi Mosque', lat: 31.588, lng: 74.3107 },
      { label: 'Liberty Market, Gulberg', lat: 31.51, lng: 74.348 },
      { label: 'Model Town', lat: 31.482, lng: 74.32 },
      { label: 'DHA Phase 5', lat: 31.47, lng: 74.4 },
      { label: 'Emporium Mall', lat: 31.4676, lng: 74.2649 },
    ],
  },
  {
    name: 'Islamabad',
    center: { label: 'Islamabad City Center', lat: 33.6844, lng: 73.0479 },
    places: [
      { label: 'Islamabad Int’l Airport', lat: 33.549, lng: 72.8258 },
      { label: 'Faisal Mosque', lat: 33.7295, lng: 73.0372 },
      { label: 'Blue Area', lat: 33.71, lng: 73.055 },
      { label: 'Centaurus Mall', lat: 33.707, lng: 73.05 },
      { label: 'F-10 Markaz', lat: 33.693, lng: 73.013 },
    ],
  },
  {
    name: 'Rawalpindi',
    center: { label: 'Rawalpindi City Center', lat: 33.5651, lng: 73.0169 },
    places: [
      { label: 'Saddar', lat: 33.597, lng: 73.047 },
      { label: 'Raja Bazaar', lat: 33.6, lng: 73.04 },
      { label: 'Committee Chowk', lat: 33.63, lng: 73.07 },
      { label: 'Bahria Town Phase 4', lat: 33.5286, lng: 73.1108 },
    ],
  },
  {
    name: 'Faisalabad',
    center: { label: 'Faisalabad City Center', lat: 31.4504, lng: 73.135 },
    places: [
      { label: 'Clock Tower (Ghanta Ghar)', lat: 31.418, lng: 73.079 },
      { label: 'D Ground', lat: 31.411, lng: 73.112 },
      { label: 'Jinnah Colony', lat: 31.4238, lng: 73.0906 },
    ],
  },
  {
    name: 'Multan',
    center: { label: 'Multan City Center', lat: 30.1575, lng: 71.5249 },
    places: [
      { label: 'Multan Int’l Airport', lat: 30.2032, lng: 71.4191 },
      { label: 'Ghanta Ghar', lat: 30.198, lng: 71.468 },
      { label: 'Cantt', lat: 30.19, lng: 71.44 },
    ],
  },
  {
    name: 'Peshawar',
    center: { label: 'Peshawar City Center', lat: 34.0151, lng: 71.5249 },
    places: [
      { label: 'Qissa Khwani Bazaar', lat: 34.01, lng: 71.57 },
      { label: 'University Town', lat: 34.0, lng: 71.49 },
      { label: 'Bacha Khan Airport', lat: 33.9939, lng: 71.5147 },
    ],
  },
  {
    name: 'Quetta',
    center: { label: 'Quetta City Center', lat: 30.1798, lng: 66.975 },
    places: [
      { label: 'Jinnah Road', lat: 30.1897, lng: 66.9962 },
      { label: 'Quetta Airport', lat: 30.2514, lng: 66.9378 },
    ],
  },
];

export const CITY_BY_NAME: Record<string, City> = Object.fromEntries(
  CITIES.map((c) => [c.name, c])
);

// Flat list of every landmark (kept for backwards-compat / any generic pickers).
export const PLACES: NamedPlace[] = CITIES.flatMap((c) => c.places);

// Map centered on Pakistan so the initial view makes sense before a trip is set.
export const MAP_CENTER: [number, number] = [30.3753, 69.3451];
