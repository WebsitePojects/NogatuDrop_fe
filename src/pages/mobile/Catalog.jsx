import { useState, useEffect, useCallback } from 'react';
import { HiSearch } from 'react-icons/hi';
import { Spinner } from 'flowbite-react';
import { ToastContainer, useToast } from '@/components/Toast';
import { useCart } from '@/context/CartContext';
import api from '@/services/api';
import { PRODUCTS } from '@/services/endpoints';
import { formatCurrency } from '@/utils/formatCurrency';
import { getProductImageSrc, attachProductImageFallback } from '@/utils/productImages';

export default function MobileCatalog() {
  const { toasts, showToast, dismiss } = useToast();
  const { items: cartItems, addToCart, updateQty } = useCart();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [addingId, setAddingId] = useState(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(PRODUCTS.LIST, {
        params: { limit: 50, search, is_active: 1 },
      });
      const list = Array.isArray(data.data) ? data.data : (data.data?.items || []);
      setProducts(list);
    } catch {
      showToast('Failed to load products', 'error');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => fetchProducts(), 300);
    return () => clearTimeout(t);
  }, [fetchProducts]);

  const getCartQty = (productId) => {
    const item = cartItems.find(i => i.product_id === productId || i.id === productId);
    return item?.quantity || 0;
  };

  const handleAddToCart = async (product) => {
    setAddingId(product.id);
    try {
      await addToCart(product.id, product.warehouse_id || null, 1);
      showToast(`${product.name} added to cart`, 'success');
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to add to cart', 'error');
    } finally {
      setAddingId(null);
    }
  };

  const handleUpdateQty = async (product, newQty) => {
    const cartItem = cartItems.find(i => i.product_id === product.id || i.id === product.id);
    if (!cartItem) {
      await handleAddToCart(product);
      return;
    }
    try {
      await updateQty(cartItem.id, newQty);
    } catch {
      showToast('Failed to update quantity', 'error');
    }
  };

  return (
    <div className="bg-white min-h-screen">
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      {/* Sticky search */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3">
        <div className="relative">
          <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products…"
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 bg-gray-50"
          />
        </div>
      </div>

      <div className="px-4 pt-4 pb-28">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-3 border border-gray-100 animate-pulse">
                <div className="bg-gray-200 w-full h-32 rounded-xl mb-3" />
                <div className="h-3.5 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <HiSearch size={40} className="mb-3 opacity-30" />
            <p className="text-sm">No products found</p>
            {search && (
              <button onClick={() => setSearch('')} className="mt-2 text-orange-500 text-sm">
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {products.map(product => {
              const qty = getCartQty(product.id);
              const isAdding = addingId === product.id;
              return (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm"
                >
                  <div className="aspect-square bg-gray-50 overflow-hidden">
                    <img
                      src={getProductImageSrc(product)}
                      alt={product.name}
                      onError={e => attachProductImageFallback(e, product)}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 leading-snug mb-1">
                      {product.name}
                    </h3>
                    <p className="text-orange-500 font-bold text-sm mb-2.5">
                      {formatCurrency(product.partner_price || product.price || 0)}
                    </p>
                    {qty > 0 ? (
                      <div className="flex items-center justify-between bg-orange-50 rounded-xl px-2 py-1">
                        <button
                          onClick={() => handleUpdateQty(product, qty - 1)}
                          className="w-7 h-7 rounded-lg bg-white flex items-center justify-center font-bold text-gray-600 hover:bg-gray-100 shadow-sm"
                        >
                          −
                        </button>
                        <span className="text-sm font-bold text-gray-900">{qty}</span>
                        <button
                          onClick={() => handleUpdateQty(product, qty + 1)}
                          className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center font-bold text-white hover:bg-orange-600 shadow-sm"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAddToCart(product)}
                        disabled={isAdding}
                        className="w-full py-2 bg-orange-500 text-white rounded-xl text-xs font-semibold hover:bg-orange-600 active:scale-95 transition-all disabled:opacity-60"
                      >
                        {isAdding ? (
                          <span className="flex items-center justify-center gap-1">
                            <Spinner size="xs" color="white" />
                          </span>
                        ) : (
                          'Add to Cart'
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
