import test from 'node:test';
import assert from 'node:assert/strict';
import { isCenterStaff, centerStaffLabel, CENTER_LEVEL } from '../src/utils/partnerLevel.js';

test('isCenterStaff is true only for partner_level "center"', () => {
  assert.equal(isCenterStaff({ partner_level: CENTER_LEVEL }), true);
  assert.equal(isCenterStaff({ partner_level: 'city_stockist' }), false);
  assert.equal(isCenterStaff({ partner_level: 'provincial_stockist' }), false);
});

test('isCenterStaff falls back to false for older sessions without partner_level', () => {
  assert.equal(isCenterStaff({}), false);
  assert.equal(isCenterStaff({ partner_level: null }), false);
  assert.equal(isCenterStaff(null), false);
  assert.equal(isCenterStaff(undefined), false);
});

test('centerStaffLabel names the center and survives a missing partner_name', () => {
  assert.equal(centerStaffLabel({ partner_name: 'CALOOCAN' }), 'CALOOCAN Center Staff');
  assert.equal(centerStaffLabel({ partner_name: 'TYCOON' }), 'TYCOON Center Staff');
  assert.equal(centerStaffLabel({}), 'Center Staff');
  assert.equal(centerStaffLabel(null), 'Center Staff');
});
