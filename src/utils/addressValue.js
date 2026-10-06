/**
 * The AddressPicker's value, and how it maps to and from the API records that store an address as
 * parts (warehouses, Stockists, Mobile Stockists). The record carries the barangay code plus the
 * region/province/city codes joined from the PSGC tables (address_*_code), so the pickers can be
 * prefilled without a second request.
 */
// Relative imports (not '@/') so node:test can load this file without Vite.
import { EMPTY_ADDRESS, INDEPENDENT_PROVINCE, addressProblems } from './publicCustomer.js';
import { isInsidePhilippines } from './phBounds.js';

/** An empty AddressPicker value: the checkout address parts plus the map pin. */
export const EMPTY_PLACE = Object.freeze({ ...EMPTY_ADDRESS, lat: null, lng: null });

const clean = (value) => String(value ?? '').trim().replace(/\s+/g, ' ');
const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export const hasPin = (value) => Number.isFinite(value?.lat) && Number.isFinite(value?.lng);

/** True when the record has an address but only as the old single text, with no barangay chosen. */
export function hasLegacyAddressOnly(record) {
  return Boolean(record) && !record.barangay_code && Boolean(record.address_display || record.location || record.address);
}

/** Prefills the picker from an API record. A legacy record gets empty parts (but keeps its pin). */
export function addressFromRecord(record) {
  const pin = { lat: toNumberOrNull(record?.lat), lng: toNumberOrNull(record?.lng) };
  if (!record?.barangay_code) return { ...EMPTY_PLACE, ...pin };
  return {
    regionCode: record.address_region_code || '',
    // Cities that belong to no province (all of Metro Manila) sit under the picker's "independent" choice.
    provinceKey: record.address_province_code || INDEPENDENT_PROVINCE,
    cityCode: record.address_city_code || '',
    barangayCode: record.barangay_code,
    line: record.address_line || '',
    postalCode: record.postal_code || '',
    ...pin,
  };
}

/**
 * The request fields for the address parts. `withPin` adds lat/lng (null clears a saved pin).
 * Sending the parts replaces the stored address as a unit; the server rewrites the old text from them.
 */
export function addressToPayload(value, { withPin }) {
  const payload = {
    address_line: clean(value.line),
    barangay_code: value.barangayCode,
    postal_code: clean(value.postalCode) || null,
  };
  if (withPin) {
    payload.lat = hasPin(value) ? value.lat : null;
    payload.lng = hasPin(value) ? value.lng : null;
  }
  return payload;
}


/**
 * Field keys that block saving: the checkout address problems, plus 'pin' for a pin outside the
 * Philippines. `keepLegacy` lets a record that still has only its old text be saved without choosing
 * the parts, as long as the user has not started typing an address (so a manager-name fix is not
 * blocked); once they start, the whole address is required.
 */
export function addressPickerProblems(value, { withPin, keepLegacy = false }) {
  const untouched = keepLegacy && !value.barangayCode && !clean(value.line);
  const problems = untouched ? [] : addressProblems(value);
  if (withPin && hasPin(value) && !isInsidePhilippines(value.lat, value.lng)) problems.push('pin');
  return problems;
}
