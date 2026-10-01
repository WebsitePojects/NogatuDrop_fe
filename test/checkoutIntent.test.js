import test from 'node:test';
import assert from 'node:assert/strict';
import { createCheckoutIntent, createIntentHeaders, getCheckoutIntent } from '../src/utils/checkoutIntent.js';

test('checkout intent keeps one idempotency key across retries', () => {
  const intent = createCheckoutIntent();
  assert.equal(createIntentHeaders(intent)['Idempotency-Key'], intent.id);
  assert.equal(createIntentHeaders(intent)['Idempotency-Key'], intent.id);
});

test('same payload retries keep the key while a changed payload starts a new intent', () => {
  const first = createCheckoutIntent({ quantity: 1 });
  const retry = getCheckoutIntent(first, { quantity: 1 });
  const changed = getCheckoutIntent(retry, { quantity: 2 });
  assert.equal(retry.id, first.id);
  assert.notEqual(changed.id, first.id);
});

test('checkout intent rejects missing identity', () => {
  assert.throws(() => createIntentHeaders(null), /required/);
});
