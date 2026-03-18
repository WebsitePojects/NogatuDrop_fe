import React, { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiArrowRight } from 'react-icons/fi';
import api from '@/services/api';
import { STOCK_TRANSFERS, WAREHOUSES, PRODUCTS } from '@/services/endpoints';
import Modal from '@/components/Modal';
import { STATUS_BADGE } from '@/utils/constants';
import { formatDate } from '@/utils/formatDate';

const inputCls = 'w-full px-4 py-3 bg-gray-100 border-0 rounded-xl text-sm placeholder-gray-400 focus:ring-2 focus:ring-orange-400 outline-none';
const labelCls = 'block text-sm font-semibold text-gray-800 mb-1';

const StockTransfers = () => {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completing, setCompleting] = useState(null);
  const [showMonitor, setShowMonitor] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    from_warehouse_id: '',
    to_warehouse_id: '',
    product_id: '',
    quantity: '',
  });

  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(STOCK_TRANSFERS.LIST, { params: { limit: 50 } });
      setTransfers(data.data || []);
    } catch {
      setTransfers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

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
    setForm({ from_warehouse_id: '', to_warehouse_id: '', product_id: '', quantity: '' });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post(STOCK_TRANSFERS.CREATE, {
        ...form,
        quantity: Number(form.quantity),
      });
      setShowModal(false);
      fetchTransfers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create transfer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async (transferId) => {
    setCompleting(transferId);
    try {
      await api.patch(STOCK_TRANSFERS.COMPLETE(transferId));
      fetchTransfers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to complete transfer');
    } finally {
      setCompleting(null);
    }
  };

  const getStatusStyle = (status) => {
    if (status === 'completed') return { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' };
    if (status === 'in_transit') return { bg: 'bg-orange-100', text: 'text-orange-800', label: 'In Transit' };
    return STATUS_BADGE[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status };
  };

  const activeTransfers = transfers.filter((t) => t.status === 'in_transit');

  return (
    <div style={{ backgroundColor: '#FFF3E0', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-wide uppercase">STOCK TRANSFERS</h1>
          <p className="text-sm text-gray-500 mt-1">Manage stock movement between warehouses</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowMonitor(true)}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
          >
            Monitor
          </button>
          <button
            onClick={openModal}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
          >
            <FiPlus /> + New Transfer
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : transfers.length === 0 ? (
        <div className="text-center py-20 text-gray-400">No stock transfers found</div>
      ) : (
        <div className="space-y-4">
          {transfers.map((transfer) => {
            const st = getStatusStyle(transfer.status);
            const isInTransit = transfer.status === 'in_transit';
            return (
              <div key={transfer.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                {/* Transfer Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{transfer.transfer_number}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Created {formatDate(transfer.created_at)}</p>
                    {transfer.completed_at && (
                      <p className="text-xs text-gray-400">Completed {formatDate(transfer.completed_at)}</p>
                    )}
                  </div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${st.bg} ${st.text}`}>
                    {st.label}
                  </span>
                </div>

                {/* Warehouse Route */}
                <div className="flex items-center gap-3 mb-3 p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs">
                    <p className="text-gray-400">From</p>
                    <p className="font-semibold text-gray-800">{transfer.from_warehouse_name || transfer.from_warehouse?.name || 'N/A'}</p>
                  </div>
                  <FiArrowRight className="text-orange-500 flex-shrink-0" />
                  <div className="text-xs">
                    <p className="text-gray-400">To</p>
                    <p className="font-semibold text-gray-800">{transfer.to_warehouse_name || transfer.to_warehouse?.name || 'N/A'}</p>
                  </div>
                </div>

                {/* Product & Quantity */}
                {(transfer.items || [{ product_name: transfer.product_name, quantity: transfer.quantity }]).map((item, i) => (
                  <div key={i} className="mb-1">
                    <p className="text-xs text-gray-400">Product</p>
                    <p className="text-sm font-bold text-gray-900 uppercase">{item.product_name || transfer.product_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{(item.quantity || transfer.quantity || 0).toLocaleString()} units</p>
                  </div>
                ))}

                {/* Mark as Complete */}
                {isInTransit && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => handleComplete(transfer.id)}
                      disabled={completing === transfer.id}
                      className="px-4 py-2 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                      style={{ backgroundColor: '#16a34a' }}
                    >
                      {completing === transfer.id ? 'Completing...' : 'Mark as Complete'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Stock Transfer Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-extrabold text-gray-900 uppercase">CREATE STOCK TRANSFER</h2>
          <p className="text-sm text-gray-500 mt-1">Transfer stock between warehouses</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelCls}>From Warehouse</label>
            <select required value={form.from_warehouse_id} onChange={(e) => setForm({ ...form, from_warehouse_id: e.target.value })} className={inputCls}>
              <option value="">Choose...</option>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>To Warehouse</label>
            <select required value={form.to_warehouse_id} onChange={(e) => setForm({ ...form, to_warehouse_id: e.target.value })} className={inputCls}>
              <option value="">Choose...</option>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Product</label>
            <select required value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} className={inputCls}>
              <option value="">Product</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Quantity</label>
            <input type="number" required min="1" placeholder="Quantity" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className={inputCls} />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 text-white font-bold uppercase rounded-xl tracking-widest transition-colors disabled:opacity-50"
            style={{ backgroundColor: '#6B2D0E' }}
          >
            {submitting ? 'Creating...' : 'ADD STOCK'}
          </button>
        </form>
      </Modal>

      <Modal isOpen={showMonitor} onClose={() => setShowMonitor(false)} title="Active Transfer Monitor" maxWidth="max-w-2xl">
        {activeTransfers.length === 0 ? (
          <div className="text-sm text-gray-500">No in-transit transfers right now.</div>
        ) : (
          <div className="space-y-3">
            {activeTransfers.map((transfer) => (
              <div key={transfer.id} className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                <p className="text-sm font-semibold text-gray-800">{transfer.transfer_number}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {transfer.from_warehouse_name || 'N/A'} -> {transfer.to_warehouse_name || 'N/A'}
                </p>
                <p className="text-xs text-gray-500">Created {formatDate(transfer.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default StockTransfers;
