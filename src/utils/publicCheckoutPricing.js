// Store orders carry no VAT line (management, 2026-10-14): the total is merchandise + shipping, and the
// server computes the same. Orders placed before then keep the 12% VAT stored in `system_fee`; this
// label shows it on those orders only.
export const VAT_LABEL = 'VAT (12%)';

function roundCurrency(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

/**
 * Totals shown at checkout. `shippingFee` is the server's quote for the buyer's address and cart weight
 * (POST /shipping/quote); null until there is one, and then `totalDue` is null too, so the page never shows a
 * total the server would not charge.
 */
export function getPublicOrderPricingTotals(merchandiseSubtotal, shippingFee = null) {
  const subtotal = roundCurrency(merchandiseSubtotal);
  const known = shippingFee != null && Number.isFinite(Number(shippingFee));
  return {
    merchandiseSubtotal: subtotal,
    shippingFee: known ? roundCurrency(shippingFee) : null,
    systemFee: 0,
    totalDue: known ? roundCurrency(subtotal + roundCurrency(shippingFee)) : null,
  };
}

/**
 * Products subtotal at the member price, rounded per unit exactly as the server does
 * (orderController.createPublicOrder): unit_price x (1 - pct/100), to the centavo, times quantity.
 * `isEligible(line)` says whether that product gets the member price (packages do not); others keep their price.
 */
export function memberPriceSubtotal(cart, discountPct, isEligible = () => true) {
  return roundCurrency((cart || []).reduce((sum, line) => {
    const unit = isEligible(line)
      ? roundCurrency(Number(line.unit_price) * (1 - Number(discountPct) / 100))
      : Number(line.unit_price);
    return sum + Number(line.quantity) * unit;
  }, 0));
}
