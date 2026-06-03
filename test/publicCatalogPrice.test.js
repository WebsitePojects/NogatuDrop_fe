import test from 'node:test';
import assert from 'node:assert/strict';

import { getPublicCatalogPrice } from '../src/utils/publicCatalogPrice.js';

test('public catalog pricing prefers the retail price for anonymous storefront buyers', () => {
  assert.equal(
    getPublicCatalogPrice({ retail_price: 70, partner_price: 45, price: 999 }),
    70,
  );
});

test('public catalog pricing falls back safely when retail price is unavailable', () => {
  assert.equal(getPublicCatalogPrice({ retail_price: null, partner_price: 45, price: 55 }), 55);
  assert.equal(getPublicCatalogPrice({ retail_price: undefined, partner_price: 45 }), 45);
});
