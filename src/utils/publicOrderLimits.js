// Mirrors NogatuDrop_be/src/services/publicOrderLimits.js; the server enforces it, this only shapes the UI.
export const PUBLIC_ORDER_MAX_QUANTITY_PER_LINE = 100;

/** Highest quantity a buyer may pick: the public cap, or less when fewer are in stock. */
export function maxOrderableQuantity(availableQty) {
  const available = Number(availableQty);
  if (!Number.isFinite(available)) return PUBLIC_ORDER_MAX_QUANTITY_PER_LINE;
  return Math.max(0, Math.min(PUBLIC_ORDER_MAX_QUANTITY_PER_LINE, Math.floor(available)));
}

/** Keeps a typed or stepped quantity inside 1..max (0 when nothing can be ordered). */
export function clampQuantity(value, max) {
  if (max <= 0) return 0;
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, max);
}
