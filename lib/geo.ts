/** Titik & aturan geofence — satu sumber kebenaran. */
export const MANCONG = {
  lat: -6.874474372696532,
  lng: 107.57563823965597,
} as const;

export const RADIUS_M = 200;
export const ACCURACY_MAX_M = 100;
export const ACCURACY_WARN_M = 50;
const EARTH_R = 6_371_000;

export type LatLng = { lat: number; lng: number };

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Jarak great-circle dalam meter (Haversine). */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.min(1, Math.sqrt(s)));
}

export function distanceToMancong(lat: number, lng: number): number {
  return haversineMeters({ lat, lng }, MANCONG);
}

/** Arah dari titik pengguna menuju Mancong (derajat, 0 = utara). */
export function bearingToMancong(lat: number, lng: number): number {
  const φ1 = toRad(lat);
  const φ2 = toRad(MANCONG.lat);
  const Δλ = toRad(MANCONG.lng - lng);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

const CARDINALS = [
  "utara",
  "timur laut",
  "timur",
  "tenggara",
  "selatan",
  "barat daya",
  "barat",
  "barat laut",
] as const;

export function cardinalDirection(bearingDeg: number): string {
  const idx = Math.round(((bearingDeg % 360) + 360) % 360 / 45) % 8;
  return CARDINALS[idx];
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}
