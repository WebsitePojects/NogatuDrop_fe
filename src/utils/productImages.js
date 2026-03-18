const DEFAULT_API_BASE = 'http://localhost:5000/api/v1';

function getApiOrigin() {
  const apiBase = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE;
  try {
    return new URL(apiBase).origin;
  } catch {
    return 'http://localhost:5000';
  }
}

export function resolveImageUrl(imageUrl) {
  if (!imageUrl) return '';

  if (/^https?:\/\//i.test(imageUrl)) {
    return imageUrl;
  }

  if (imageUrl.startsWith('//')) {
    return `https:${imageUrl}`;
  }

  const baseOrigin = getApiOrigin();
  if (imageUrl.startsWith('/')) {
    return `${baseOrigin}${imageUrl}`;
  }

  return `${baseOrigin}/${imageUrl}`;
}

export function getDesignatedProductImage(productName = '', sku = '') {
  const key = `${productName} ${sku}`.toLowerCase();

  if (key.includes('barley')) return '/assets/productsCatalog-NogatuBarleyPureDrink.jpg';
  if (key.includes('mangosteen')) return '/assets/productsCatalog-NohgatuMangosteenCoffee.jpg';
  if (key.includes('chocolate')) return '/assets/productsCatalog-nogatuChocolateDrink.jpg';
  if (key.includes('coffee')) return '/assets/productsCatalog-NogatuCoffeeMix.jpg';

  return '/assets/products_removedBG.png';
}

export function getProductImageSrc(product = {}) {
  return resolveImageUrl(product.image_url) || getDesignatedProductImage(product.name, product.sku);
}

export function attachProductImageFallback(event, product = {}) {
  const fallbackSrc = getDesignatedProductImage(product.name, product.sku);
  if (event.currentTarget.src !== fallbackSrc) {
    event.currentTarget.src = fallbackSrc;
  }
  event.currentTarget.onerror = null;
}
