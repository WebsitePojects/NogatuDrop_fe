import React, { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiMapPin, FiUser } from 'react-icons/fi';
import { MdWarehouse } from 'react-icons/md';
import api from '@/services/api';
import { WAREHOUSES } from '@/services/endpoints';
import Badge from '@/components/Badge';
import Modal from '@/components/Modal';
import StatusProgressBar from '@/components/StatusProgressBar';
import { WAREHOUSE_TYPES } from '@/utils/constants';

const inputCls = 'w-full px-4 py-3 bg-gray-100 border-0 rounded-xl text-sm placeholder-gray-400 focus:ring-2 focus:ring-orange-400 outline-none';
const labelCls = 'block text-sm font-semibold text-gray-800 mb-1';

const Warehouses = () => {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    type: 'region',
    location: '',
    manager_name: '',
    capacity: '10000',
    current_stock: '0',
  });

  const fetchWarehouses = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(WAREHOUSES.LIST, { params: { limit: 100 } });
      setWarehouses(data.data || []);
    } catch {
      setWarehouses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post(WAREHOUSES.CREATE, {
        ...form,
        capacity: Number(form.capacity),
        current_stock: Number(form.current_stock),
      });
      setShowModal(false);
      fetchWarehouses();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add warehouse');
    } finally {
      setSubmitting(false);
    }
  };

  const openModal = () => {
    setForm({ name: '', type: 'region', location: '', manager_name: '', capacity: '10000', current_stock: '0' });
    setShowModal(true);
  };

  return (
    <div style={{ backgroundColor: '#FFF3E0', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-wide uppercase">WAREHOUSE MANAGEMENT</h1>
          <p className="text-sm text-gray-500 mt-1">Manage warehouse locations and capacity</p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
        >
          <FiPlus />Add Warehouse
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {warehouses.length === 0 ? (
            <div className="col-span-full text-center py-20 text-gray-400">No warehouses found</div>
          ) : (
            warehouses.map((wh) => {
              const typeBadge = WAREHOUSE_TYPES[wh.type] || WAREHOUSE_TYPES.region;
              const usedStock = wh.current_stock || 0;
              const capacity = wh.capacity || 10000;
              const pct = capacity > 0 ? Math.min(Math.round((usedStock / capacity) * 100), 100) : 0;

              return (
                <div key={wh.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                  {/* Card Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <MdWarehouse className="text-xl text-gray-500" />
                      <h3 className="text-sm font-bold text-gray-800 uppercase">{wh.name}</h3>
                    </div>
                    <Badge {...typeBadge} />
                  </div>

                  {/* Location & Manager */}
                  <div className="space-y-1.5 mb-4">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <FiMapPin className="text-orange-500 flex-shrink-0" />
                      <span>{wh.location || 'No location set'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <FiUser className="text-orange-500 flex-shrink-0" />
                      <span>{wh.manager_name || 'No manager assigned'}</span>
                    </div>
                  </div>

                  {/* Capacity Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-500">Capacity</span>
                      <span className="text-xs font-semibold text-gray-700">
                        {usedStock.toLocaleString()} / {capacity.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-2.5 rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#FF8C00',
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1 text-right">{pct}% used</p>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                    <div>
                      <p className="text-xs text-gray-400">Products</p>
                      <p className="text-sm font-bold text-gray-800">{wh.product_count ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Low Stock Items</p>
                      <p className="text-sm font-bold text-orange-600">{wh.low_stock_count ?? 0}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Add Warehouse Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-extrabold text-gray-900 uppercase">ADD NEW WAREHOUSE</h2>
          <p className="text-sm text-gray-500 mt-1">Create a new warehouse location</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelCls}>Warehouse Name</label>
            <input required type="text" placeholder="Warehouse Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputCls}>
              <option value="manufacturer">Manufacturer</option>
              <option value="region">Regional</option>
              <option value="city">City</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Location</label>
            <input required type="text" placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Capacity (Units)</label>
            <input type="number" min="1" placeholder="Capacity" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Manager Name</label>
            <input type="text" placeholder="Manager Name" value={form.manager_name} onChange={(e) => setForm({ ...form, manager_name: e.target.value })} className={inputCls} />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 text-white font-bold uppercase rounded-xl tracking-widest transition-colors disabled:opacity-50"
            style={{ backgroundColor: '#6B2D0E' }}
          >
            {submitting ? 'Adding...' : 'ADD WAREHOUSE'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Warehouses;
