import test from 'node:test';
import assert from 'node:assert/strict';
import { PUBLIC_ORDER_MAX_QUANTITY_PER_LINE, maxOrderableQuantity, clampQuantity } from '../src/utils/publicOrderLimits.js';

test('the storefront cap matches the server (100 per line)', () => {
  assert.equal(PUBLIC_ORDER_MAX_QUANTITY_PER_LINE, 100);
});

test('the most a buyer can pick is the cap, or less when fewer are in stock', () => {
  assert.equal(maxOrderableQuantity(10000), 100);
  assert.equal(maxOrderableQuantity(37), 37);
  assert.equal(maxOrderableQuantity(0), 0);
  assert.equal(maxOrderableQuantity(undefined), 100, 'unknown stock: the server still checks');
  assert.equal(maxOrderableQuantity(-5), 0);
});

test('typed or stepped quantities stay inside 1..max', () => {
  assert.equal(clampQuantity(1, 100), 1);
  assert.equal(clampQuantity(0, 100), 1);
  assert.equal(clampQuantity('', 100), 1);
  assert.equal(clampQuantity('7', 100), 7);
  assert.equal(clampQuantity(2.9, 100), 2);
  assert.equal(clampQuantity(250, 100), 100);
  assert.equal(clampQuantity(5, 0), 0, 'nothing orderable when sold out');
});
