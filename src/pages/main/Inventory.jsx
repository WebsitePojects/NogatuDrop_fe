import React, { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiSearch, FiFilter } from 'react-icons/fi';
import api from '@/services/api';
import { INVENTORY, WAREHOUSES, PRODUCTS } from '@/services/endpoints';
import Modal from '@/components/Modal';
import { INVENTORY_BADGE } from '@/utils/constants';
import { formatDate } from '@/utils/formatDate';
import { getProductImageSrc, attachProductImageFallback } from '@/utils/productImages';

const inputCls = 'w-full px-4 py-3 bg-gray-100 border-0 rounded-xl text-sm placeholder-gray-400 focus:ring-2 focus:ring-orange-400 outline-none';
const labelCls = 'block text-sm font-semibold text-gray-800 mb-1';

const Inventory = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    product_id: '',
    warehouse_id: '',
    current_stock: '',
    reorder_threshold: '50',
    batch_number: '',
    expiry_date: '',
  });

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(INVENTORY.LIST, {
        params: { page, search, status: statusFilter || undefined, limit: 15 },
      });
      setItems(data.data || []);
      setPagination(data.pagination || null);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const fetchFormData = async () => {
    try {
      const [wRes, pRes] = await Promise.all([
        api.get(WAREHOUSES.LIST, { params: { limit: 100 } }),
        api.get(PRODUCTS.LIST, { params: { limit: 100 } }),
      ]);
      setWarehouses(wRes.data.data || []);
      setProducts(pRes.data.data || []);
    } catch {
      // silently fail
    }
  };

  const openModal = () => {
    fetchFormData();
    setForm({ product_id: '', warehouse_id: '', current_stock: '', reorder_threshold: '50', batch_number: '', expiry_date: '' });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post(INVENTORY.CREATE, {
        ...form,
        current_stock: Number(form.current_stock),
        reorder_threshold: Number(form.reorder_threshold),
      });
      setShowModal(false);
      fetchInventory();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add inventory');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusStyle = (status) => {
    const badge = INVENTORY_BADGE[status] || INVENTORY_BADGE.in_stock;
    return { bg: badge.bg, text: badge.text, label: badge.label };
  };

  return (
    <div style={{ backgroundColor: '#FFF3E0', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-wide uppercase">INVENTORY MANAGEMENT</h1>
          <p className="text-sm text-gray-500 mt-1">Track stock levels across all warehouses</p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
        >
          <FiPlus />Add Inventory
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
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="pl-10 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-400 outline-none appearance-none"
          >
            <option value="">Filter</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Inventory List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-gray-400">No inventory records found</div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const st = getStatusStyle(item.status);
            return (
              <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-100 flex items-center px-5 py-4 gap-5">
                {/* Product Image */}
                <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-orange-50 border border-gray-100">
                  <img
                    src={getProductImageSrc({ ...item, name: item.product_name })}
                    alt={item.product_name}
                    onError={(e) => attachProductImageFallback(e, { name: item.product_name, sku: item.sku })}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Product Name & Warehouse */}
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-gray-900 text-sm uppercase truncate">{item.product_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.warehouse_name}</p>
                </div>

                {/* Stats columns */}
                <div className="flex items-center gap-10 flex-shrink-0">
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-1">Current Stock</p>
                    <p className="text-sm font-bold text-gray-800">{(item.current_stock ?? 0).toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-1">Reorder Level</p>
                    <p className="text-sm font-bold text-gray-800">{(item.reorder_threshold ?? 0).toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-1">Batch Number</p>
                    <p className="text-sm font-bold text-gray-800">{item.batch_number || 'N/A'}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-1">Expiry Date</p>
                    <p className="text-sm font-bold text-gray-800">{formatDate(item.expiry_date)}</p>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="flex-shrink-0 ml-4">
                  <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide ${st.bg} ${st.text}`}>
                    {st.label}
                  </span>
                </div>
              </div>
            );
          })}
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

      {/* Add Inventory Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-extrabold text-gray-900 uppercase">ADD INVENTORY</h2>
          <p className="text-sm text-gray-500 mt-1">Add new stock to a warehouse location</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelCls}>Product</label>
            <select required value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} className={inputCls}>
              <option value="">Product</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Warehouse</label>
            <select required value={form.warehouse_id} onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })} className={inputCls}>
              <option value="">Warehouse</option>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Quantity</label>
              <input type="number" required min="0" placeholder="Quantity" value={form.current_stock} onChange={(e) => setForm({ ...form, current_stock: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Reorder Threshold</label>
              <input type="number" min="0" placeholder="Reorder Threshold" value={form.reorder_threshold} onChange={(e) => setForm({ ...form, reorder_threshold: e.target.value })} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Batch Number</label>
              <input type="text" placeholder="Batch Number" value={form.batch_number} onChange={(e) => setForm({ ...form, batch_number: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Expiry Date</label>
              <input type="date" placeholder="Expiry Date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} className={inputCls} />
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 text-white font-bold uppercase rounded-xl tracking-widest transition-colors disabled:opacity-50"
            style={{ backgroundColor: '#6B2D0E' }}
          >
            {submitting ? 'Adding...' : 'ADD INVENTORY'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Inventory;
