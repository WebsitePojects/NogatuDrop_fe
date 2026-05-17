const GOOGLE_MAPS_KEY_PATTERN = /^AIza[0-9A-Za-z_-]{20,}$/;
const PLACEHOLDER_KEY_PATTERNS = [
  /your[_-]?google[_-]?maps[_-]?api[_-]?key/i,
  /changeme/i,
  /placeholder/i,
  /example/i,
];

const DISABLED_FLAG_VALUES = new Set(['0', 'false', 'off', 'no', 'disabled']);

function isFiniteCoordinate(value) {
  if (value === null || value === undefined || value === '') {
    return false;
  }
  return Number.isFinite(Number(value));
}

export function isValidMapPoint(point) {
  return Boolean(point) && isFiniteCoordinate(point.lat) && isFiniteCoordinate(point.lng);
}

export function buildRoutePolyline({ sourcePoint, currentPoint, destinationPoint }) {
  const points = [sourcePoint, currentPoint, destinationPoint]
    .filter(isValidMapPoint)
    .map((point) => ({
      lat: Number(point.lat),
      lng: Number(point.lng),
    }));

  return points.length >= 2 ? points : [];
}

export function shouldAttemptGoogleMaps(rawKey) {
  const key = String(rawKey || '').trim();
  if (!key) return false;
  if (PLACEHOLDER_KEY_PATTERNS.some((pattern) => pattern.test(key))) {
    return false;
  }
  return GOOGLE_MAPS_KEY_PATTERN.test(key);
}

export function isGoogleMapsFeatureEnabled(rawFlag) {
  const normalized = String(rawFlag ?? 'true').trim().toLowerCase();
  return !DISABLED_FLAG_VALUES.has(normalized);
}
