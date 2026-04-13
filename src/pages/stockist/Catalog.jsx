import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextInput, Spinner } from 'flowbite-react';
import { HiSearch, HiShoppingCart } from 'react-icons/hi';
import { FiShoppingBag } from 'react-icons/fi';
import { ToastContainer, useToast } from '@/components/Toast';
import { useCart } from '@/context/CartContext';
import api from '@/services/api';
import { PRODUCTS } from '@/services/endpoints';
import { formatCurrency } from '@/utils/formatCurrency';
import { getProductImageSrc, attachProductImageFallback } from '@/utils/productImages';

export default function StockistCatalog() {
  const navigate = useNavigate();
  const { toasts, showToast, dismiss } = useToast();
  const { addToCart } = useCart();

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

  const handleAddToCart = async (product) => {
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

      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Product Catalog</h1>
        <p className="text-sm text-gray-500 mt-0.5">Browse and order products for your distribution</p>
      </div>

      {/* Search */}
      <div className="mb-4">
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

            return (
              <div
                key={product.id}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 flex flex-col group"
                onMouseEnter={() => setHoveredId(product.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* Image */}
                <div
                  className="relative aspect-square bg-gray-50 overflow-hidden cursor-pointer"
                  onClick={() => navigate(`/stockist/catalog/${product.id}`)}
                >
                  <img
                    src={getProductImageSrc(product)}
                    alt={product.name}
                    onError={e => attachProductImageFallback(e, product)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
                    className="text-xs text-gray-400 font-mono mb-0.5 truncate"
                    title={product.sku}
                  >
                    {product.sku || 'SKU —'}
                  </p>
                  <h3
                    className="text-sm font-semibold text-gray-800 leading-snug mb-1 line-clamp-2 cursor-pointer hover:text-amber-600 transition-colors"
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

                  {/* Qty stepper — visible on hover/focus */}
                  <div className={`flex items-center gap-1 mb-2 transition-opacity duration-150 ${isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    <button
                      onClick={() => setQty(product.id, (quantities[product.id] || 1) - 1)}
                      className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 font-bold text-base"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={quantities[product.id] || 1}
                      onChange={e => setQty(product.id, parseInt(e.target.value) || 1)}
                      className="w-12 h-7 text-center text-sm font-semibold border border-gray-200 rounded-lg focus:outline-none focus:border-amber-400"
                    />
                    <button
                      onClick={() => setQty(product.id, (quantities[product.id] || 1) + 1)}
                      className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 font-bold text-base"
                    >
                      +
                    </button>
                  </div>

                  {/* Add to cart */}
                  <button
                    onClick={() => handleAddToCart(product)}
                    disabled={isAdding}
                    className="mt-auto w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    {isAdding ? (
                      <Spinner size="sm" color="white" />
                    ) : (
                      <HiShoppingCart className="w-4 h-4" />
                    )}
                    {isAdding ? 'Adding…' : 'Add to Cart'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
