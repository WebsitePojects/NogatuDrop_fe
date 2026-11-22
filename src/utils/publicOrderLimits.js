// Mirrors NogatuDrop_be/src/services/publicOrderLimits.js; the server enforces it, this only shapes the UI.
// At most 10 items per store order in total, any mix (Sir Dino, 2026-11-10).
export const PUBLIC_ORDER_MAX_ITEMS = 10;
export const PUBLIC_ORDER_MAX_QUANTITY_PER_LINE = PUBLIC_ORDER_MAX_ITEMS;

export const ITEM_LIMIT_MESSAGE = `An order can hold up to ${PUBLIC_ORDER_MAX_ITEMS} items in total. Place a second order for more.`;

/** Total quantity in a cart of { quantity } lines. */
export function cartItemCount(cart) {
  return (cart || []).reduce((sum, line) => sum + Number(line.quantity || 0), 0);
}

/** Highest quantity a buyer may pick: the public cap, or less when fewer are in stock. */
export function maxOrderableQuantity(availableQty) {
  const available = Number(availableQty);
  if (!Number.isFinite(available)) return PUBLIC_ORDER_MAX_QUANTITY_PER_LINE;
  return Math.max(0, Math.min(PUBLIC_ORDER_MAX_QUANTITY_PER_LINE, Math.floor(available)));
}

/** Highest quantity one cart line may reach, given what the other lines already hold. */
export function maxLineQuantity(cart, productId, availableQty) {
  const others = cartItemCount((cart || []).filter((line) => line.product_id !== productId));
  return Math.max(0, Math.min(maxOrderableQuantity(availableQty), PUBLIC_ORDER_MAX_ITEMS - others));
}

/** Keeps a typed or stepped quantity inside 1..max (0 when nothing can be ordered). */
export function clampQuantity(value, max) {
  if (max <= 0) return 0;
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, max);
}
