import { NOGATU_PRODUCT_IMAGE_MAP } from './nogatuCatalog';

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

  // Legacy local-upload paths are no longer served; use catalog fallback image instead.
  if (/^\/?uploads\//i.test(imageUrl) || imageUrl.includes('/uploads/')) {
    return '';
  }

  if (/^https?:\/\//i.test(imageUrl)) {
    return imageUrl;
  }

  if (imageUrl.startsWith('//')) {
    return `https:${imageUrl}`;
  }

  if (imageUrl.startsWith('/legacy-img/') || imageUrl.startsWith('/assets/')) {
    return imageUrl;
  }

  const baseOrigin = getApiOrigin();
  if (imageUrl.startsWith('/')) {
    return `${baseOrigin}${imageUrl}`;
  }

  return `${baseOrigin}/${imageUrl}`;
}

export function getDesignatedProductImage(productName = '', sku = '') {
  const key = `${productName} ${sku}`.toLowerCase();

  const match = NOGATU_PRODUCT_IMAGE_MAP.find((entry) =>
    entry.match.some((token) => key.includes(token))
  );

  if (match) return match.image;

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
