// Lightweight, dependency-free delivery routing + ETA helpers.
// Road-traced routing and live traffic require a paid provider (Google /
// Mapbox / TomTom) or a self-hosted engine (OSRM / Valhalla). Until a key is
// configured we use great-circle distance + an average urban delivery speed,
// which gives an honest "distance + estimated time" that updates live as the
// courier's GPS pings come in. The functions are provider-agnostic so a real
// routing call can be dropped in later without touching the callers.

const EARTH_RADIUS_KM = 6371;
// Conservative average door-to-door speed for PH metro/provincial mixed roads.
const DEFAULT_AVG_SPEED_KMH = 22;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

export function isCoord(p) {
  return p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng));
}

/** Great-circle distance between two {lat,lng} points, in kilometres. */
export function haversineKm(a, b) {
  if (!isCoord(a) || !isCoord(b)) return null;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Sum of leg distances along an ordered list of {lat,lng} points, in km. */
export function routeDistanceKm(points = []) {
  const valid = points.filter(isCoord);
  let total = 0;
  for (let i = 1; i < valid.length; i += 1) {
    total += haversineKm(valid[i - 1], valid[i]) || 0;
  }
  return total;
}

/** Estimated travel time in minutes for a distance, at an assumed avg speed. */
export function estimateEtaMinutes(distanceKm, avgSpeedKmh = DEFAULT_AVG_SPEED_KMH) {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0 || avgSpeedKmh <= 0) return null;
  return Math.max(1, Math.round((distanceKm / avgSpeedKmh) * 60));
}

export function formatKm(km) {
  if (!Number.isFinite(km)) return '--';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export function formatDuration(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return '--';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/**
 * Compute a live delivery estimate from the courier's current position to the
 * destination, falling back to origin->destination before the courier moves.
 * Returns { remainingKm, etaMinutes, etaClock } or nulls when coords missing.
 */
export function computeLiveEstimate({ origin, courier, destination, avgSpeedKmh } = {}) {
  if (!isCoord(destination)) return { remainingKm: null, etaMinutes: null, etaClock: null };
  const from = isCoord(courier) ? courier : origin;
  const remainingKm = haversineKm(from, destination);
  const etaMinutes = estimateEtaMinutes(remainingKm, avgSpeedKmh);
  let etaClock = null;
  if (etaMinutes != null) {
    const arrival = new Date(Date.now() + etaMinutes * 60 * 1000);
    etaClock = arrival.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return { remainingKm, etaMinutes, etaClock };
}
