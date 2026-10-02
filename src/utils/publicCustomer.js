/**
 * The public buyer's name and address as checkout collects them: atomic parts that map 1:1 to the
 * order columns (first/middle/last/suffix, street line, PSGC barangay code, postal code). The server
 * re-validates every part (NogatuDrop_be/src/routes/orders.js); these rules only give early feedback.
 */

export const NAME_SUFFIX_OPTIONS = ['Jr.', 'Sr.', 'II', 'III', 'IV', 'V'];
// Same rule as the server: letters in any script plus the separators real Filipino names use.
export const PERSON_NAME_PATTERN = /^\p{L}[\p{L}\p{M} .'’-]*$/u;
export const POSTAL_CODE_PATTERN = /^\d{4}$/;
// The province choice for cities that belong to no province (all of Metro Manila).
export const INDEPENDENT_PROVINCE = 'independent';

export const EMPTY_NAME = Object.freeze({ first: '', middle: '', last: '', suffix: '' });
export const EMPTY_ADDRESS = Object.freeze({
  regionCode: '', provinceKey: '', cityCode: '', barangayCode: '', line: '', postalCode: '',
});

const clean = (value) => String(value ?? '').trim().replace(/\s+/g, ' ');

/** Returns the field keys that are missing or malformed, in form order. */
export function nameProblems(name) {
  const problems = [];
  if (!PERSON_NAME_PATTERN.test(clean(name.first))) problems.push('first');
  if (clean(name.middle) && !PERSON_NAME_PATTERN.test(clean(name.middle))) problems.push('middle');
  if (!PERSON_NAME_PATTERN.test(clean(name.last))) problems.push('last');
  if (name.suffix && !NAME_SUFFIX_OPTIONS.includes(name.suffix)) problems.push('suffix');
  return problems;
}

export function addressProblems(address) {
  const problems = [];
  if (!address.barangayCode) problems.push('barangay');
  if (clean(address.line).length < 3) problems.push('line');
  if (clean(address.postalCode) && !POSTAL_CODE_PATTERN.test(clean(address.postalCode))) problems.push('postalCode');
  return problems;
}

/** The order payload fields for the buyer's name and address. Blank optional parts are left out. */
export function toOrderCustomerFields(name, address) {
  const optional = (value) => clean(value) || undefined;
  return {
    customer_first_name: clean(name.first),
    customer_middle_name: optional(name.middle),
    customer_last_name: clean(name.last),
    customer_name_suffix: optional(name.suffix),
    customer_address_line: clean(address.line),
    customer_barangay_code: address.barangayCode,
    customer_postal_code: optional(address.postalCode),
  };
}

export function formatPersonName(name) {
  return [name.first, name.middle, name.last, name.suffix].map(clean).filter(Boolean).join(' ');
}

/**
 * Map searches to try for a chosen place, most precise first. One search runs per barangay pick
 * (never per keystroke), which keeps us inside OpenStreetMap Nominatim's usage policy.
 */
export function geocodeQueries(place) {
  if (!place?.city) return [];
  const area = [place.city, place.province || place.region].filter(Boolean).join(', ');
  const queries = [];
  if (place.barangay) queries.push(`${place.barangay}, ${area}, Philippines`);
  queries.push(`${area}, Philippines`);
  return queries;
}
