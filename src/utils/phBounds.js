// Same rule as the backend (NogatuDrop_be/src/utils/phBounds.js): a box around the Philippines minus
// the corner of Borneo (Sabah). Keep the two files in step.
export const PH_BOX = Object.freeze({ latMin: 4.2, latMax: 21.5, lngMin: 116.0, lngMax: 127.0 });
const SABAH_CORNER = Object.freeze({ latMax: 7.3, lngMax: 119.2 });

/** Center of Luzon/Visayas, for maps with no point yet. */
export const PH_CENTER = Object.freeze({ lat: 12.8797, lng: 121.774 });

export const OUTSIDE_PH_MESSAGE = 'This pin is outside the Philippines. Move it to the correct location.';

export function isInsidePhilippines(lat, lng) {
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return false;
  if (la < PH_BOX.latMin || la > PH_BOX.latMax || ln < PH_BOX.lngMin || ln > PH_BOX.lngMax) return false;
  return !(la < SABAH_CORNER.latMax && ln < SABAH_CORNER.lngMax);
}
