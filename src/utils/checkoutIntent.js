const fallbackId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function createCheckoutIntent(payload = null) {
  const id = globalThis.crypto?.randomUUID?.() || fallbackId();
  return {
    id,
    signature: payload === null ? null : JSON.stringify(payload),
    headers: { 'Idempotency-Key': id },
  };
}

export function getCheckoutIntent(previous, payload) {
  const signature = JSON.stringify(payload);
  if (previous?.id && previous.signature === signature) return previous;
  return createCheckoutIntent(payload);
}

export function createIntentHeaders(intent) {
  if (!intent?.id) throw new TypeError('Checkout intent is required');
  return { 'Idempotency-Key': intent.id };
}
