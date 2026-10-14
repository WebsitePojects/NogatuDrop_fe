export const PUBLIC_ORDER_SHIPPING_FEE = 159;
// Store orders carry no VAT line (management, 2026-10-14): the total is merchandise + shipping, and the
// server computes the same. Orders placed before then keep the 12% VAT stored in `system_fee`; this
// label shows it on those orders only.
export const VAT_LABEL = 'VAT (12%)';

function roundCurrency(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export function getPublicOrderPricingTotals(merchandiseSubtotal) {
  const subtotal = roundCurrency(merchandiseSubtotal);
  const shippingFee = subtotal > 0 ? PUBLIC_ORDER_SHIPPING_FEE : 0;
  const systemFee = 0;
  const totalDue = roundCurrency(subtotal + shippingFee + systemFee);

  return {
    merchandiseSubtotal: subtotal,
    shippingFee,
    systemFee,
    totalDue,
  };
}
