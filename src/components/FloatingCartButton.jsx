import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { HiShoppingCart } from 'react-icons/hi';
import { useCart } from '@/context/CartContext';

export default function FloatingCartButton({ destinationPath, hiddenPathPrefixes, label = 'Cart' }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { cartCount } = useCart();
  const previousCountRef = useRef(cartCount || 0);
  const [isShaking, setIsShaking] = useState(false);

  const isMobilePortal = pathname.startsWith('/mobile');
  const targetPath = destinationPath || (isMobilePortal ? '/mobile/cart' : '/stockist/cart');
  const hiddenPaths = hiddenPathPrefixes || (isMobilePortal ? ['/mobile/cart'] : ['/stockist/cart']);

  useEffect(() => {
    if (cartCount > previousCountRef.current) {
      setIsShaking(true);
      const timer = setTimeout(() => setIsShaking(false), 520);
      previousCountRef.current = cartCount;
      return () => clearTimeout(timer);
    }

    previousCountRef.current = cartCount;
    return undefined;
  }, [cartCount]);

  if (!cartCount || hiddenPaths.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => navigate(targetPath)}
      className={`floating-cart-button ${isShaking ? 'shake' : ''}`}
      aria-label={`Open cart with ${cartCount} items`}
      title="Open cart"
    >
      <HiShoppingCart className="h-5 w-5" />
      <span>{label}</span>
      <span className="floating-cart-count">{cartCount}</span>
    </button>
  );
}
