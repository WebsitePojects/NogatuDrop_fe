function toFinitePrice(value) {
  if (value == null || value === '') {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : null;
}

export function getPublicCatalogPrice(product) {
  return (
    toFinitePrice(product?.retail_price)
    ?? toFinitePrice(product?.price)
    ?? toFinitePrice(product?.partner_price)
    ?? 0
  );
}
