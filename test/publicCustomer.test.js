import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  EMPTY_NAME, EMPTY_ADDRESS, nameProblems, addressProblems, toOrderCustomerFields, formatPersonName, geocodeQueries,
} from '../src/utils/publicCustomer.js';

const name = { first: ' Juan ', middle: '', last: 'Dela  Cruz', suffix: 'Jr.' };
const address = { ...EMPTY_ADDRESS, regionCode: '130000000', provinceKey: 'independent', cityCode: '137501000', barangayCode: '137501001', line: ' 12 Rizal St. ', postalCode: '' };

test('a complete name and address have no problems; blanks are reported in form order', () => {
  assert.deepEqual(nameProblems(name), []);
  assert.deepEqual(addressProblems(address), []);
  assert.deepEqual(nameProblems(EMPTY_NAME), ['first', 'last']);
  assert.deepEqual(addressProblems(EMPTY_ADDRESS), ['barangay', 'line']);
});

test('names refuse digits and markup; an unknown suffix fails closed', () => {
  assert.deepEqual(nameProblems({ ...name, first: 'Juan2' }), ['first']);
  assert.deepEqual(nameProblems({ ...name, last: '<b>' }), ['last']);
  assert.deepEqual(nameProblems({ ...name, suffix: 'Esq.' }), ['suffix']);
  assert.deepEqual(nameProblems({ ...name, first: 'José', last: 'Ñiño-Santos', middle: "D'Souza" }), []);
});

test('postal code is optional but must be 4 digits when given', () => {
  assert.deepEqual(addressProblems({ ...address, postalCode: '1400' }), []);
  assert.deepEqual(addressProblems({ ...address, postalCode: '14' }), ['postalCode']);
});

test('the order payload carries trimmed atomic parts and leaves blank optional parts out', () => {
  assert.deepEqual(toOrderCustomerFields(name, address), {
    customer_first_name: 'Juan',
    customer_middle_name: undefined,
    customer_last_name: 'Dela Cruz',
    customer_name_suffix: 'Jr.',
    customer_address_line: '12 Rizal St.',
    customer_barangay_code: '137501001',
    customer_postal_code: undefined,
  });
  assert.equal(formatPersonName(name), 'Juan Dela Cruz Jr.');
});

test('the map searches the barangay first, then the city; nothing before a city is chosen', () => {
  assert.deepEqual(geocodeQueries({ barangay: 'Barangay 1', city: 'City of Caloocan', province: '', region: 'NCR' }), [
    'Barangay 1, City of Caloocan, NCR, Philippines',
    'City of Caloocan, NCR, Philippines',
  ]);
  assert.deepEqual(geocodeQueries({ barangay: '', city: 'Angat', province: 'Bulacan', region: 'Central Luzon' }), ['Angat, Bulacan, Philippines']);
  assert.deepEqual(geocodeQueries(null), []);
});

test('both public checkouts send atomic name and address fields, never the old single-text ones', () => {
  const root = path.join(process.cwd(), 'src/pages/shared');
  for (const file of ['Shop.jsx', 'InfluencerCheckout.jsx']) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    assert.match(source, /toOrderCustomerFields\(/, `${file} builds the payload from the shared helper`);
    assert.match(source, /<PhAddressFields/, `${file} uses the PSGC pickers`);
    assert.match(source, /searchQueries=\{/, `${file} moves the map to the chosen barangay`);
    assert.doesNotMatch(source, /customer_name:|customer_address:/, `${file} must not send the old fields`);
  }
});
