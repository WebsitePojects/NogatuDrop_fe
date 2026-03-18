import React, { useState, useEffect, useCallback } from 'react';
import { FiPlus } from 'react-icons/fi';
import api from '@/services/api';
import { PURCHASE_ORDERS, PRODUCTS } from '@/services/endpoints';
import { STATUS_BADGE } from '@/utils/constants';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDate } from '@/utils/formatDate';
import Modal from '@/components/Modal';

const PurchaseOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [products, setProducts] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    supplier: '',
    product_id: '',
    quantity: '',
    unit_price: '',
    notes: '',
  });

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(PURCHASE_ORDERS.LIST, { params: { page, limit: 20 } });
      setOrders(data.data || []);
      setPagination(data.pagination || null);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const openModal = async () => {
    try {
      const { data } = await api.get(PRODUCTS.LIST, { params: { limit: 200 } });
      setProducts(data.data || []);
    } catch {
      setProducts([]);
    }
    setForm({ supplier: '', product_id: '', quantity: '', unit_price: '', notes: '' });
    setShowModal(true);
  };

  const handleCreatePO = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post(PURCHASE_ORDERS.CREATE, {
        supplier: form.supplier || 'Nogatu Manufacturing',
        notes: form.notes || undefined,
        items: [
          {
            product_id: Number(form.product_id),
            quantity: Number(form.quantity),
            unit_price: Number(form.unit_price),
            supplier: form.supplier || 'Nogatu Manufacturing',
          },
        ],
      });
      setShowModal(false);
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create purchase order');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    return STATUS_BADGE[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status || 'Unknown' };
  };

  return (
    <div style={{ backgroundColor: '#FFF3E0', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-wide uppercase">PURCHASE ORDERS</h1>
          <p className="text-sm text-gray-500 mt-1">Manage supplier purchase orders</p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
        >
          <FiPlus /> + Create PO
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 text-gray-400">No purchase orders found</div>
      ) : (
        <div className="space-y-4">
          {orders.map((po) => {
            const statusBadge = getStatusBadge(po.status);
            return (
              <div key={po.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                {/* PO Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{po.po_number}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{po.supplier_name || 'N/A'}</p>
                    <p className="text-xs text-gray-400">Created {formatDate(po.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusBadge.bg} ${statusBadge.text}`}>
                      {statusBadge.label}
                    </span>
                    <span className="text-lg font-bold" style={{ color: '#FF8C00' }}>
                      {formatCurrency(po.total_amount)}
                    </span>
                  </div>
                </div>

                {/* PO Items */}
                {po.items && po.items.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-600 mb-2">Items:</p>
                    <div className="space-y-2">
                      {po.items.map((item, i) => (
                        <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="text-xs font-bold text-gray-800 uppercase">{item.product_name}</p>
                            <p className="text-xs text-gray-400">{item.supplier_name || ''}</p>
                          </div>
                          <span className="text-xs text-gray-500">
                            {item.quantity} × ₱{Number(item.unit_price || 0).toLocaleString()} = ₱{Number(item.line_total || (item.quantity * item.unit_price) || 0).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Purchase Order">
        <form onSubmit={handleCreatePO} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
            <input
              type="text"
              value={form.supplier}
              onChange={(e) => setForm({ ...form, supplier: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-400 outline-none"
              placeholder="Nogatu Manufacturing"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
            <select
              required
              value={form.product_id}
              onChange={(e) => setForm({ ...form, product_id: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-400 outline-none"
            >
              <option value="">Select product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input
                required
                min="1"
                type="number"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
              <input
                required
                min="0"
                step="0.01"
                type="number"
                value={form.unit_price}
                onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-400 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-400 outline-none"
              placeholder="Optional notes"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-[#6B2D0E] text-white font-semibold rounded-xl hover:bg-[#4A1C00] transition-colors disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create PO'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default PurchaseOrders;
