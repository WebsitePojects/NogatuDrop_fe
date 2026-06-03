import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextInput, Spinner } from 'flowbite-react';
import { HiSearch, HiShoppingCart } from 'react-icons/hi';
import { FiShoppingBag } from 'react-icons/fi';
import { ToastContainer, useToast } from '@/components/Toast';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { PRODUCTS } from '@/services/endpoints';
import { formatCurrency } from '@/utils/formatCurrency';
import { getProductImageSrc, attachProductImageFallback } from '@/utils/productImages';
import { PERMISSIONS, can } from '@/utils/permissions';
import PageHeader from '@/components/PageHeader';

export default function StockistCatalog() {
  const navigate = useNavigate();
  const { toasts, showToast, dismiss } = useToast();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const canUseCart = can(user?.role_slug, PERMISSIONS.CART_USE);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [quantities, setQuantities] = useState({});
  const [addingId, setAddingId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(PRODUCTS.LIST, { params: { limit: 100 } });
      const list = Array.isArray(data.data) ? data.data : (data.data?.items || []);
      setProducts(list);
      const init = {};
      list.forEach(p => { init[p.id] = 1; });
      setQuantities(init);
    } catch {
      showToast('Failed to load products', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const categories = ['All', ...new Set(products.map(p => p.category).filter(Boolean))];

  const filtered = products.filter(p => {
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === 'All' || p.category === activeCategory;
    return matchSearch && matchCat;
  });

  const setQty = (id, val) => setQuantities(prev => ({ ...prev, [id]: Math.max(1, val) }));
  const getAvailableQty = (product) => Number(product?.available_qty || 0);

  const handleAddToCart = async (product) => {
    if (!canUseCart) return;
    if (getAvailableQty(product) < 1) {
      showToast(`${product.name} is currently unavailable from your supply route`, 'error');
      return;
    }
    setAddingId(product.id);
    try {
      await addToCart(product.id, product.warehouse_id || null, quantities[product.id] || 1);
      showToast(`${product.name} added to cart`, 'success');
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to add to cart', 'error');
    } finally {
      setAddingId(null);
    }
  };

  const discountPct = (retail, partner) => {
    if (!retail || !partner || retail <= partner) return null;
    return Math.round(((retail - partner) / retail) * 100);
  };

  return (
    <div className="p-4 md:p-6 min-h-screen page-enter" style={{ background: '#FFF8F0' }}>
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      <PageHeader
        title="Product Catalog"
        subtitle="Browse live catalog inventory, compare Stockist pricing, and place cleaner, faster replenishment orders."
      />

      {/* Search */}
      <div className="enterprise-panel mb-4 p-4">
        <TextInput
          icon={HiSearch}
          placeholder="Search products or SKU…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          sizing="md"
        />
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeCategory === cat
                ? 'bg-amber-500 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-amber-400 hover:text-amber-600'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner size="xl" color="warning" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <FiShoppingBag size={48} className="mb-3 opacity-30" />
          <p className="text-sm">No products found</p>
          {search && (
            <button onClick={() => setSearch('')} className="mt-2 text-amber-600 text-sm hover:underline">
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(product => {
            const disc = discountPct(product.retail_price, product.partner_price);
            const isAdding = addingId === product.id;
            const isHovered = hoveredId === product.id;
            const availableQty = getAvailableQty(product);
            const isOrderable = availableQty > 0;

            return (
              <div
                key={product.id}
                className="catalog-product-card overflow-hidden flex flex-col group"
                onMouseEnter={() => setHoveredId(product.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* Image */}
                <div
                  className="relative aspect-square cursor-pointer overflow-hidden bg-[radial-gradient(circle_at_top,rgba(255,219,174,0.65),transparent_58%),linear-gradient(180deg,#fffaf3_0%,#f8ecdf_100%)]"
                  onClick={() => navigate(`/stockist/catalog/${product.id}`)}
                >
                  <img
                    src={getProductImageSrc(product)}
                    alt={product.name}
                    onError={e => attachProductImageFallback(e, product)}
                    className="h-full w-full object-contain p-4 transition-transform duration-300 group-hover:scale-105"
                  />
                  {disc && (
                    <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      -{disc}%
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="p-3 flex flex-col flex-1">
                  <p
                    className="mb-0.5 truncate text-xs font-mono text-gray-400"
                    title={product.sku}
                  >
                    {product.sku || 'SKU —'}
                  </p>
                  <h3
                    className="mb-1 line-clamp-2 cursor-pointer text-sm font-semibold leading-snug text-gray-800 transition-colors hover:text-amber-600"
                    onClick={() => navigate(`/stockist/catalog/${product.id}`)}
                    style={{ minHeight: '2.5rem' }}
                  >
                    {product.name}
                  </h3>

                  {/* Pricing */}
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-base font-bold text-amber-500">
                      {formatCurrency(product.partner_price || product.price || 0)}
                    </span>
                    {product.retail_price && product.retail_price > (product.partner_price || 0) && (
                      <span className="text-xs text-gray-400 line-through">
                        {formatCurrency(product.retail_price)}
                      </span>
                    )}
                  </div>

                  <div className="mb-2 flex items-center justify-between gap-2 text-xs">
                    <span className={`font-semibold ${isOrderable ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {isOrderable ? `${availableQty} available` : 'Unavailable from your route'}
                    </span>
                    {product.source_warehouse_id ? (
                      <span className="text-gray-400">Source #{product.source_warehouse_id}</span>
                    ) : null}
                  </div>

                  {/* Qty stepper — visible on hover/focus */}
                  {canUseCart && isOrderable && <div className={`flex items-center gap-1 mb-2 transition-opacity duration-150 ${isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    <button
                      onClick={() => setQty(product.id, (quantities[product.id] || 1) - 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 font-bold text-base text-gray-600 hover:bg-gray-100"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={quantities[product.id] || 1}
                      onChange={e => setQty(product.id, parseInt(e.target.value) || 1)}
                      className="h-7 w-12 rounded-lg border border-gray-200 text-center text-sm font-semibold focus:border-amber-400 focus:outline-none"
                    />
                    <button
                      onClick={() => setQty(product.id, (quantities[product.id] || 1) + 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 font-bold text-base text-gray-600 hover:bg-gray-100"
                    >
                      +
                    </button>
                  </div>}

                  {/* Add to cart */}
                  {canUseCart && <button
                    onClick={() => handleAddToCart(product)}
                    disabled={isAdding || !isOrderable}
                    className={`mt-auto w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 ${
                      isOrderable
                        ? 'bg-amber-500 hover:bg-amber-600 text-white'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {isAdding ? (
                      <Spinner size="sm" color="white" />
                    ) : (
                      <HiShoppingCart className="w-4 h-4" />
                    )}
                    {isAdding ? 'Adding...' : isOrderable ? 'Add to Cart' : 'Unavailable'}
                  </button>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
