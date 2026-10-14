import test from 'node:test';
import assert from 'node:assert/strict';
import { getPublicOrderPricingTotals } from '../src/utils/publicCheckoutPricing.js';

// Must match NogatuDrop_be/src/services/publicCheckoutPricing.js: the server recomputes every total.
test('store total is merchandise plus shipping only (VAT removed, management 2026-10-14)', () => {
  assert.deepEqual(getPublicOrderPricingTotals(7998), { merchandiseSubtotal: 7998, shippingFee: 159, systemFee: 0, totalDue: 8157 });
  assert.deepEqual(getPublicOrderPricingTotals(0), { merchandiseSubtotal: 0, shippingFee: 0, systemFee: 0, totalDue: 0 });
});
