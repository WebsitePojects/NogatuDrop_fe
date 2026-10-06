import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  EMPTY_PLACE, addressFromRecord, addressToPayload, addressPickerProblems, hasLegacyAddressOnly, hasPin,
} from '../src/utils/addressValue.js';
import { INDEPENDENT_PROVINCE } from '../src/utils/publicCustomer.js';

// What the API returns for a warehouse saved with parts (decimal columns arrive as strings).
const savedWarehouse = {
  address_line: '12 Rizal St.', barangay_code: '137404001', postal_code: '1100',
  address_region_code: '130000000', address_province_code: null, address_city_code: '137404000',
  address_display: '12 Rizal St., Alicia, Quezon City, NCR, 1100', location: 'old text',
  lat: '14.65070000', lng: '121.05020000',
};
const cebuRecord = {
  ...savedWarehouse, barangay_code: '072201001', address_region_code: '070000000',
  address_province_code: '072200000', address_city_code: '072201000',
};

test('a saved record prefills every picker level, the street, the postal code and the pin as numbers', () => {
  assert.deepEqual(addressFromRecord(cebuRecord), {
    regionCode: '070000000', provinceKey: '072200000', cityCode: '072201000', barangayCode: '072201001',
    line: '12 Rizal St.', postalCode: '1100', lat: 14.6507, lng: 121.0502,
  });
});

test('a city with no province (Metro Manila) maps to the pickers\' "independent" province choice', () => {
  assert.equal(addressFromRecord(savedWarehouse).provinceKey, INDEPENDENT_PROVINCE);
});

test('a legacy record (old text only) gets empty parts but keeps its pin and is flagged for the hint', () => {
  const legacy = { address_line: null, barangay_code: null, address_display: 'Somewhere, Cebu', location: 'Somewhere, Cebu', lat: '10.31', lng: '123.88' };
  assert.deepEqual(addressFromRecord(legacy), { ...EMPTY_PLACE, lat: 10.31, lng: 123.88 });
  assert.equal(hasLegacyAddressOnly(legacy), true);
  assert.equal(hasLegacyAddressOnly(savedWarehouse), false);
  assert.equal(hasLegacyAddressOnly(null), false, 'adding a record has no legacy text');
  assert.equal(hasLegacyAddressOnly({ barangay_code: null }), false, 'nothing saved at all');
});

test('a missing pin stays null rather than becoming 0', () => {
  const record = addressFromRecord({ ...savedWarehouse, lat: null, lng: null });
  assert.equal(record.lat, null);
  assert.equal(record.lng, null);
  assert.equal(hasPin(record), false);
});

test('the payload carries trimmed parts, null for a blank postal code, and the pin only when asked', () => {
  const place = { ...addressFromRecord(cebuRecord), line: '  12   Rizal St. ', postalCode: '' };
  assert.deepEqual(addressToPayload(place, { withPin: false }), {
    address_line: '12 Rizal St.', barangay_code: '072201001', postal_code: null,
  });
  assert.deepEqual(addressToPayload(place, { withPin: true }), {
    address_line: '12 Rizal St.', barangay_code: '072201001', postal_code: null, lat: 14.6507, lng: 121.0502,
  });
});

test('clearing the pin sends null/null so the server clears it', () => {
  const place = { ...addressFromRecord(cebuRecord), lat: null, lng: null };
  const payload = addressToPayload(place, { withPin: true });
  assert.equal(payload.lat, null);
  assert.equal(payload.lng, null);
});

test('saving is blocked for a missing barangay, a short street, a bad postal code and a pin outside the Philippines', () => {
  const ok = addressFromRecord(cebuRecord);
  assert.deepEqual(addressPickerProblems(ok, { withPin: true }), []);
  assert.deepEqual(addressPickerProblems(EMPTY_PLACE, { withPin: true }), ['barangay', 'line']);
  assert.deepEqual(addressPickerProblems({ ...ok, postalCode: '14' }, { withPin: true }), ['postalCode']);
  assert.deepEqual(addressPickerProblems({ ...ok, lat: 48.85, lng: 2.35 }, { withPin: true }), ['pin']);
  assert.deepEqual(addressPickerProblems({ ...ok, lat: 0, lng: 0 }, { withPin: true }), ['pin']);
  assert.deepEqual(addressPickerProblems({ ...ok, lat: 121.05, lng: 14.65 }, { withPin: true }), ['pin'], 'swapped lat/lng');
});

test('a form without a map ignores the pin', () => {
  const ok = { ...addressFromRecord(cebuRecord), lat: 48.85, lng: 2.35 };
  assert.deepEqual(addressPickerProblems(ok, { withPin: false }), []);
  assert.equal('lat' in addressToPayload(ok, { withPin: false }), false);
});

test('a legacy record can be saved untouched, but typing any part makes the whole address required', () => {
  assert.deepEqual(addressPickerProblems(EMPTY_PLACE, { withPin: true, keepLegacy: true }), []);
  assert.deepEqual(addressPickerProblems({ ...EMPTY_PLACE, line: '12 Rizal St.' }, { withPin: true, keepLegacy: true }), ['barangay']);
  assert.deepEqual(addressPickerProblems({ ...EMPTY_PLACE, barangayCode: '137404001' }, { withPin: true, keepLegacy: true }), ['line']);
  assert.deepEqual(addressPickerProblems({ ...EMPTY_PLACE, lat: 0, lng: 0 }, { withPin: true, keepLegacy: true }), ['pin'], 'the pin rule still applies');
});

// The wiring: each address form uses the one shared picker and sends the atomic fields.
const read = (file) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

test('warehouse, Stockist and Mobile Stockist forms all use the shared AddressPicker and atomic payload', () => {
  const warehouseForm = read('src/components/WarehouseFormModal.jsx');
  assert.match(warehouseForm, /<AddressPicker/);
  assert.match(warehouseForm, /addressToPayload\(/);
  for (const file of ['src/pages/main/Partners.jsx', 'src/pages/stockist/MobileStockists.jsx']) {
    const source = read(file);
    assert.match(source, /<AddressPicker/, `${file} uses the picker`);
    assert.match(source, /addressToPayload\(/, `${file} sends the atomic fields`);
    assert.doesNotMatch(source, /\baddress:\s*form\.|region:\s*form\./, `${file} must not send free-text address or region`);
  }
  for (const file of ['src/pages/main/Warehouses.jsx', 'src/pages/stockist/Warehouses.jsx']) {
    assert.match(read(file), /<WarehouseFormModal/, `${file} adds and edits through the shared form`);
  }
});

test('the Stockist form has no map (Stockists store no coordinates); the other two do', () => {
  assert.match(read('src/pages/main/Partners.jsx'), /withMap=\{WITH_PIN\}/);
  assert.match(read('src/pages/main/Partners.jsx'), /const WITH_PIN = false;/);
  assert.doesNotMatch(read('src/pages/stockist/MobileStockists.jsx'), /withMap=\{false\}/);
  assert.doesNotMatch(read('src/components/WarehouseFormModal.jsx'), /withMap=\{false\}/);
});

test('the old map picker is gone and no page imports it', () => {
  assert.equal(fs.existsSync(path.join(process.cwd(), 'src/components/MapLocationPicker.jsx')), false);
});
