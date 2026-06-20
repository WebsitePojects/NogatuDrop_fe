export const PUBLIC_ORDER_SHIPPING_ZONES = {
  metro_manila: 120,
  luzon: 180,
  visayas_mindanao: 250,
};

export const PUBLIC_ORDER_SHIPPING_ZONE_OPTIONS = [
  {
    value: 'metro_manila',
    label: 'Metro Manila',
    description: 'Best for NCR deliveries and nearby urban drop-offs.',
  },
  {
    value: 'luzon',
    label: 'Provincial Luzon',
    description: 'Additional shipping fee applies for deliveries outside Metro Manila.',
  },
  {
    value: 'visayas_mindanao',
    label: 'Visayas / Mindanao',
    description: 'Highest public checkout shipping tier based on longer delivery distance.',
  },
];

export const PUBLIC_ORDER_VAT_RATE = 0.12;
// TODO: awaiting data - confirm fixed zone rates for Metro Manila, Luzon, and Visayas/Mindanao.
// TODO: awaiting data - confirm whether public shipping should stay zone-based or move to distance-based API pricing.
// TODO: awaiting data - member discount verification flow needs the confirmed username-validation approach before checkout UI can auto-apply it.

function roundCurrency(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export function getPublicOrderPricingTotals(merchandiseSubtotal, options = {}) {
  const {
    shippingZone = 'metro_manila',
    memberDiscountPct = 0,
  } = options;

  const subtotal = roundCurrency(merchandiseSubtotal);
  const discountAmount = subtotal > 0 ? roundCurrency(subtotal * (Number(memberDiscountPct || 0) / 100)) : 0;
  const discountedSubtotal = roundCurrency(subtotal - discountAmount);
  const shippingFee = discountedSubtotal > 0
    ? (PUBLIC_ORDER_SHIPPING_ZONES[shippingZone] ?? PUBLIC_ORDER_SHIPPING_ZONES.metro_manila)
    : 0;
  const vatAmount = discountedSubtotal > 0 ? roundCurrency(discountedSubtotal * PUBLIC_ORDER_VAT_RATE) : 0;
  const totalDue = roundCurrency(discountedSubtotal + shippingFee + vatAmount);

  return {
    merchandiseSubtotal: subtotal,
    memberDiscountPct: Number(memberDiscountPct || 0),
    discountAmount,
    discountedSubtotal,
    shippingZone,
    shippingFee,
    vatAmount,
    systemFee: vatAmount,
    totalDue,
  };
}
