export const PUBLIC_ORDER_SHIPPING_FEE = 159;
export const PUBLIC_ORDER_SYSTEM_FEE_RATE = 0.12;
// Management asked buyers and staff to see this charge as plain VAT (2026-10-06); the stored
// column is still `system_fee`.
export const VAT_LABEL = `VAT (${Math.round(PUBLIC_ORDER_SYSTEM_FEE_RATE * 100)}%)`;

function roundCurrency(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export function getPublicOrderPricingTotals(merchandiseSubtotal) {
  const subtotal = roundCurrency(merchandiseSubtotal);
  const shippingFee = subtotal > 0 ? PUBLIC_ORDER_SHIPPING_FEE : 0;
  const systemFee = subtotal > 0 ? roundCurrency(subtotal * PUBLIC_ORDER_SYSTEM_FEE_RATE) : 0;
  const totalDue = roundCurrency(subtotal + shippingFee + systemFee);

  return {
    merchandiseSubtotal: subtotal,
    shippingFee,
    systemFee,
    totalDue,
  };
}
