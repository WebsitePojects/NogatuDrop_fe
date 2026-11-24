import test from 'node:test';
import assert from 'node:assert/strict';
import { getPublicOrderPricingTotals } from '../src/utils/publicCheckoutPricing.js';

// Must match NogatuDrop_be/src/services/publicCheckoutPricing.js: the server recomputes every total.
test('total is merchandise plus the quoted shipping fee (no VAT line since 2026-10-14)', () => {
  assert.deepEqual(getPublicOrderPricingTotals(7998, 335), { merchandiseSubtotal: 7998, shippingFee: 335, systemFee: 0, totalDue: 8333 });
});

test('member price skips ineligible products (packages), like the server', async () => {
  const { memberPriceSubtotal } = await import('../src/utils/publicCheckoutPricing.js');
  const cart = [{ product_id: 1, quantity: 2, unit_price: 710 }, { product_id: 9, quantity: 1, unit_price: 2500 }];
  assert.equal(memberPriceSubtotal(cart, 30), 2744);
  assert.equal(memberPriceSubtotal(cart, 30, (line) => line.product_id !== 9), 3494);
});

test('without a quote there is no shipping fee and no total, never a guessed one', () => {
  assert.deepEqual(getPublicOrderPricingTotals(7998), { merchandiseSubtotal: 7998, shippingFee: null, systemFee: 0, totalDue: null });
  assert.equal(getPublicOrderPricingTotals(7998, undefined).totalDue, null);
});
