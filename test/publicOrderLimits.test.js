import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PUBLIC_ORDER_MAX_ITEMS, PUBLIC_ORDER_MAX_QUANTITY_PER_LINE, cartItemCount, maxOrderableQuantity, maxLineQuantity, clampQuantity,
} from '../src/utils/publicOrderLimits.js';

test('the storefront cap matches the server: 10 items per order in total (Sir Dino, 2026-11-10)', () => {
  assert.equal(PUBLIC_ORDER_MAX_ITEMS, 10);
  assert.equal(PUBLIC_ORDER_MAX_QUANTITY_PER_LINE, 10);
});

test('the most a buyer can pick is the cap, or less when fewer are in stock', () => {
  assert.equal(maxOrderableQuantity(10000), 10);
  assert.equal(maxOrderableQuantity(7), 7);
  assert.equal(maxOrderableQuantity(0), 0);
  assert.equal(maxOrderableQuantity(undefined), 10, 'unknown stock: the server still checks');
  assert.equal(maxOrderableQuantity(-5), 0);
});

test('a line can only grow into the room the rest of the cart leaves (any mix, 10 total)', () => {
  const cart = [{ product_id: 1, quantity: 5 }, { product_id: 2, quantity: 2 }, { product_id: 3, quantity: 3 }];
  assert.equal(cartItemCount(cart), 10);
  assert.equal(maxLineQuantity(cart, 1, 999), 5, 'full cart: Berry NAD+ stays at 5');
  assert.equal(maxLineQuantity(cart, 4, 999), 0, 'full cart: no room for a new product');
  assert.equal(maxLineQuantity([{ product_id: 1, quantity: 2 }], 1, 999), 10);
  assert.equal(maxLineQuantity([{ product_id: 1, quantity: 2 }], 2, 3), 3, 'stock is lower than the room left');
});

test('typed or stepped quantities stay inside 1..max', () => {
  assert.equal(clampQuantity(1, 10), 1);
  assert.equal(clampQuantity(0, 10), 1);
  assert.equal(clampQuantity('', 10), 1);
  assert.equal(clampQuantity('7', 10), 7);
  assert.equal(clampQuantity(2.9, 10), 2);
  assert.equal(clampQuantity(250, 10), 10);
  assert.equal(clampQuantity(5, 0), 0, 'nothing orderable when sold out');
});
