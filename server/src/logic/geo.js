// Umkreissuche (Geo-Radius, Default 25 km) via Haversine.
// In Produktion mit PostGIS (ST_DWithin) ersetzen — Schnittstelle bleibt gleich.

export const DEFAULT_RADIUS_KM = 25;

const EARTH_RADIUS_KM = 6371;

export function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

// Nutzer können mehrere gespeicherte Orte haben (z. B. München + Waldkraiburg).
// Ein Event ist sichtbar, wenn es im Radius mindestens eines Ortes liegt.
export function matchLocations(locations, lat, lng) {
  let best = null;
  for (const loc of locations) {
    const distanceKm = haversineKm(loc.lat, loc.lng, lat, lng);
    if (distanceKm <= (loc.radiusKm ?? DEFAULT_RADIUS_KM)) {
      if (!best || distanceKm < best.distanceKm) best = { location: loc, distanceKm };
    }
  }
  return best; // null = außerhalb aller Umkreise
}

// "2,1 km" — deutsche Formatierung mit einer Nachkommastelle.
export function formatKm(km) {
  return `${km.toFixed(1).replace('.', ',')} km`;
}
