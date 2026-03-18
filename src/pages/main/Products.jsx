import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FiPlus, FiSearch, FiFilter } from 'react-icons/fi';
import api from '@/services/api';
import { PRODUCTS } from '@/services/endpoints';
import Modal from '@/components/Modal';
import { PRODUCT_CATEGORIES } from '@/utils/constants';
import { getProductImageSrc, attachProductImageFallback } from '@/utils/productImages';

const inputCls = 'w-full px-4 py-3 bg-gray-100 border-0 rounded-xl text-sm placeholder-gray-400 focus:ring-2 focus:ring-orange-400 outline-none';
const labelCls = 'block text-sm font-semibold text-gray-800 mb-1';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({
    name: '',
    sku: '',
    category: '',
    retail_price: '',
    partner_price: '',
    unit: '',
    description: '',
  });

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(PRODUCTS.LIST, {
        params: { page, search, category: categoryFilter || undefined, limit: 12 },
      });
      setProducts(data.data || []);
      setPagination(data.pagination || null);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, categoryFilter]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => formData.append(k, v));
      if (imageFile) formData.append('image', imageFile);
      await api.post(PRODUCTS.CREATE, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setShowModal(false);
      fetchProducts();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add product');
    } finally {
      setSubmitting(false);
    }
  };

  const openModal = () => {
    setForm({ name: '', sku: '', category: '', retail_price: '', partner_price: '', unit: '', description: '' });
    setImageFile(null);
    setShowModal(true);
  };

  return (
    <div style={{ backgroundColor: '#FFF3E0', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-wide uppercase">PRODUCTS CATALOG</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your product inventory</p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
        >
          <FiPlus /> + Add a Product
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search"
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-400 outline-none"
          />
        </div>
        <div className="relative">
          <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            className="pl-10 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-400 outline-none appearance-none"
          >
            <option value="">Filter</option>
            {PRODUCT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 text-gray-400">No products found</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.map((product) => (
            <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
              {/* Product Image */}
              <div className="h-44 bg-gray-100 overflow-hidden">
                <img
                  src={getProductImageSrc(product)}
                  alt={product.name}
                  onError={(e) => attachProductImageFallback(e, product)}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Card Body */}
              <div className="p-4">
                <p className="text-sm font-bold text-gray-900 uppercase">{product.name}</p>
                <p className="text-xs text-gray-400 mt-0.5 uppercase">{product.category}</p>

                {/* Prices */}
                <div className="flex gap-6 mt-3">
                  <div>
                    <p className="text-xs text-gray-400">Retail Price</p>
                    <p className="text-sm font-bold" style={{ color: '#FF8C00' }}>₱{Number(product.retail_price || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Partner Price</p>
                    <p className="text-sm font-bold" style={{ color: '#FF8C00' }}>₱{Number(product.partner_price || 0).toLocaleString()}</p>
                  </div>
                </div>

                {/* Stock */}
                <div className="mt-3">
                  <p className="text-xs text-gray-400">Total Stock</p>
                  <p className="text-sm font-bold text-gray-800">{(product.total_stock || 0).toLocaleString()}</p>
                  {product.unit && <p className="text-xs text-gray-400">{product.unit}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-5">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-4 py-2 text-sm bg-white border rounded-lg disabled:opacity-30">Previous</button>
          <span className="px-4 py-2 text-sm text-gray-600">{page} / {pagination.totalPages}</span>
          <button disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)} className="px-4 py-2 text-sm bg-white border rounded-lg disabled:opacity-30">Next</button>
        </div>
      )}

      {/* Add Product Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-extrabold text-gray-900 uppercase">ADD NEW PRODUCT</h2>
          <p className="text-sm text-gray-500 mt-1">Create a new product in your catalog</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelCls}>Product</label>
            <input required type="text" placeholder="Product" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>SKU</label>
              <input type="text" placeholder="Type" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputCls}>
                <option value="">Category</option>
                {PRODUCT_CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Retail Price</label>
              <input type="number" min="0" step="0.01" placeholder="Amount" value={form.retail_price} onChange={(e) => setForm({ ...form, retail_price: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Partner Price</label>
              <input type="number" min="0" step="0.01" placeholder="Amount" value={form.partner_price} onChange={(e) => setForm({ ...form, partner_price: e.target.value })} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Unit</label>
            <input type="text" placeholder="Unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea rows={3} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls + ' resize-none'} />
          </div>
          {/* Add Picture button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <FiPlus /> Add Picture
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files[0])} />
          </div>
          {imageFile && <p className="text-xs text-gray-500 text-right">{imageFile.name}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 text-white font-bold uppercase rounded-xl tracking-widest transition-colors disabled:opacity-50"
            style={{ backgroundColor: '#6B2D0E' }}
          >
            {submitting ? 'Adding...' : 'ADD PRODUCT'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Products;
