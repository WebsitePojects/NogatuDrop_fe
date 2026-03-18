import React, { useState, useEffect, useCallback } from 'react';
import { FiSearch, FiShoppingCart, FiFilter } from 'react-icons/fi';
import api from '@/services/api';
import { PRODUCTS } from '@/services/endpoints';
import { useCart } from '@/hooks/useCart';
import { formatCurrency } from '@/utils/formatCurrency';
import { getProductImageSrc, attachProductImageFallback } from '@/utils/productImages';

const ProductCatalog = () => {
  const { addToCart } = useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [quantities, setQuantities] = useState({});
  const [addingId, setAddingId] = useState(null);
  const [successId, setSuccessId] = useState(null);

  const fetchProducts = useCallback(async () => {
    try {
      const { data } = await api.get(PRODUCTS.LIST);
      const list = data.data || [];
      setProducts(list);
      const initQtys = {};
      list.forEach((p) => { initQtys[p.id] = 1; });
      setQuantities(initQtys);
    } catch (err) {
      console.error('ProductCatalog fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleQtyChange = (productId, delta) => {
    setQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(1, (prev[productId] || 1) + delta),
    }));
  };

  const handleAddToCart = async (product) => {
    setAddingId(product.id);
    try {
      await addToCart(product.id, product.warehouse_id || null, quantities[product.id] || 1);
      setSuccessId(product.id);
      setTimeout(() => setSuccessId(null), 1500);
    } catch (err) {
      console.error('Add to cart error:', err);
    } finally {
      setAddingId(null);
    }
  };

  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))];

  const filtered = products.filter((p) => {
    const matchSearch = p.name?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = !filter || p.category === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="min-h-screen" style={{ background: '#F0FFF0' }}>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-black" style={{ color: '#4A3000' }}>PRODUCT CATALOG</h1>
          <p className="text-sm text-gray-500 mt-1">Browse and order products for your business</p>
        </div>

        {/* Search + Filter */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex gap-3">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>
          <div className="relative">
            <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 bg-white appearance-none min-w-[140px]"
            >
              <option value="">Filter</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <FiShoppingCart className="text-5xl mx-auto mb-3" />
            <p>No products found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col"
              >
                {/* Product Image */}
                <div className="h-44 bg-gray-100 flex items-center justify-center overflow-hidden">
                  <img
                    src={getProductImageSrc(product)}
                    alt={product.name}
                    onError={(e) => attachProductImageFallback(e, product)}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Product Info */}
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-bold text-gray-800 text-sm leading-tight">{product.name}</h3>
                  {product.category && (
                    <p className="text-xs mt-0.5" style={{ color: '#2D8A2D' }}>{product.category}</p>
                  )}

                  <div className="flex gap-4 mt-3">
                    <div>
                      <p className="text-[10px] text-gray-400">Retail Price</p>
                      <p className="text-sm font-bold" style={{ color: '#FF8C00' }}>
                        {formatCurrency(product.retail_price || product.price || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400">Partner Price</p>
                      <p className="text-sm font-bold" style={{ color: '#FF8C00' }}>
                        {formatCurrency(product.partner_price || product.price || 0)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2">
                    <p className="text-[10px] text-gray-400">Total Stock</p>
                    <p className="text-sm font-semibold text-gray-700">
                      {(product.total_stock ?? product.stock ?? 0).toLocaleString()}
                    </p>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center mt-3 mb-3">
                    <button
                      onClick={() => handleQtyChange(product.id, -1)}
                      className="w-8 h-8 rounded-l-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 text-lg font-bold"
                    >
                      −
                    </button>
                    <span className="w-10 h-8 border-t border-b border-gray-300 flex items-center justify-center text-sm font-semibold text-gray-800">
                      {quantities[product.id] || 1}
                    </span>
                    <button
                      onClick={() => handleQtyChange(product.id, 1)}
                      className="w-8 h-8 rounded-r-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 text-lg font-bold"
                    >
                      +
                    </button>
                  </div>

                  <button
                    onClick={() => handleAddToCart(product)}
                    disabled={addingId === product.id}
                    className="mt-auto flex items-center justify-center gap-2 w-full py-2 text-xs font-bold text-white rounded-lg transition-all disabled:opacity-60"
                    style={{ background: successId === product.id ? '#2D8A2D' : '#0B3D0B' }}
                  >
                    <FiShoppingCart />
                    {addingId === product.id ? 'ADDING...' : successId === product.id ? 'ADDED!' : 'ADD TO CART'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductCatalog;
