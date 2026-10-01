// Single source of truth for how a notification row is classified in the UI.
//
// The backend writes `notifications.type` from a fixed set (see
// ds-backend/src/utils/notificationWriter.js). On older databases the column is
// a narrow ENUM, so newer types are stored as a legacy fallback (e.g.
// `payment_proof_uploaded` -> `order_paid`, `public_order_placed` -> `system`).
// Classifying on `type` first and `entity_type` second keeps those fallback
// rows labelled sensibly instead of all landing in one bucket.

const STOCK_KINDS = {
  no_stock: 'no_stock',
  low_stock: 'low_stock',
  stock_replenished: 'replenished',
  replenished: 'replenished',
};

export const NOTIFICATION_KIND_LABELS = {
  no_stock: 'No stock',
  low_stock: 'Low Stock',
  replenished: 'Replenished',
  payment: 'Payment',
  order: 'Order',
  update: 'Update',
};

/** @returns {'no_stock'|'low_stock'|'replenished'|'payment'|'order'|'update'} */
export function getNotificationKind(notification) {
  const type = String(notification?.type || '');
  if (STOCK_KINDS[type]) return STOCK_KINDS[type];
  if (type.includes('payment') || type === 'order_paid') return 'payment';
  if (type.includes('order') || type === 'rider_dispatched') return 'order';
  if (notification?.entity_type === 'order') return 'order';
  return 'update';
}

export function getNotificationLabel(notification) {
  return NOTIFICATION_KIND_LABELS[getNotificationKind(notification)];
}

// NotificationToast keys its colours on these three stock types; everything
// else uses its neutral `default` styling.
const TOAST_TYPE_BY_KIND = {
  no_stock: 'no_stock',
  low_stock: 'low_stock',
  replenished: 'replenished',
};

export function getNotificationToastType(notification) {
  return TOAST_TYPE_BY_KIND[getNotificationKind(notification)] || 'default';
}
