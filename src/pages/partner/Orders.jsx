import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiSearch, FiFilter, FiEye } from 'react-icons/fi';
import api from '@/services/api';
import { ORDERS, DASHBOARD } from '@/services/endpoints';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDateTime } from '@/utils/formatDate';
import Badge from '@/components/Badge';
import Modal from '@/components/Modal';
import { STATUS_BADGE, PAYMENT_BADGE } from '@/utils/constants';

const Orders = () => {
  const navigate = useNavigate();
  const { id: orderIdParam } = useParams();
  const [orders, setOrders] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [ordersRes, kpiRes] = await Promise.all([
        api.get(ORDERS.LIST),
        api.get(DASHBOARD.KPIS),
      ]);
      setOrders(ordersRes.data.data || []);
      setKpis(kpiRes.data.data || {});
    } catch (err) {
      console.error('Orders fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderIdParam) {
        setSelectedOrder(null);
        return;
      }

      setDetailsLoading(true);
      try {
        const { data } = await api.get(ORDERS.BY_ID(orderIdParam));
        setSelectedOrder(data?.data || null);
      } catch (err) {
        console.error('Order details fetch error:', err);
        setSelectedOrder(null);
      } finally {
        setDetailsLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderIdParam]);

  const closeDetails = () => {
    setSelectedOrder(null);
    navigate('/partner/orders');
  };

  const filtered = orders.filter((o) => {
    const matchSearch = !search ||
      o.order_number?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="min-h-screen" style={{ background: '#F0FFF0' }}>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-black" style={{ color: '#4A3000' }}>ORDERS</h1>
          <p className="text-sm text-gray-500 mt-1">Track and manage your orders</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Revenue', value: loading ? '—' : formatCurrency(kpis?.total_revenue || 0) },
            { label: 'Inventory Value', value: loading ? '—' : formatCurrency(kpis?.inventory_value || 0) },
            { label: 'Pending Orders', value: loading ? '—' : (kpis?.pending_orders ?? 0) },
            { label: 'Active Partners', value: loading ? '—' : (kpis?.active_partners ?? 0) },
          ].map((card) => (
            <div
              key={card.label}
              className="bg-white rounded-xl border border-gray-200 p-5"
            >
              <p className="text-sm text-gray-500 font-medium">{card.label}</p>
              <p className="text-xl font-bold text-gray-800 mt-2">{card.value}</p>
            </div>
          ))}
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
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 bg-white appearance-none min-w-[140px]"
            >
              <option value="">Filter</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="delivering">Delivering</option>
              <option value="delivered">Delivered</option>
            </select>
          </div>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
            No orders found.
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((order) => {
              const statusBadge = STATUS_BADGE[order.status] || STATUS_BADGE.pending;
              const paymentBadge = PAYMENT_BADGE[order.payment_status] || PAYMENT_BADGE.unpaid;
              return (
                <div
                  key={order.id}
                  className="bg-white rounded-xl border border-gray-200 p-5"
                >
                  {/* Order Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-black" style={{ color: '#4A3000' }}>
                        {order.order_number}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Created on {formatDateTime(order.created_at)}
                      </p>
                      {order.completed_at && (
                        <p className="text-xs text-gray-500">
                          Completed on {formatDateTime(order.completed_at)}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <p className="text-lg font-bold text-gray-800">
                        {formatCurrency(order.total_amount || 0)}
                      </p>
                      <div className="flex gap-2">
                        <Badge {...statusBadge} />
                        <Badge {...paymentBadge} />
                      </div>
                    </div>
                  </div>

                  {/* Order Items */}
                  {order.items && order.items.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-semibold text-gray-700 mb-2">
                        Order Items ({order.items.length}):
                      </p>
                      <div className="space-y-2">
                        {order.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2"
                          >
                            <div>
                              <p className="text-sm font-semibold text-gray-800">{item.product_name}</p>
                              {item.supplier && (
                                <p className="text-xs text-gray-400">{item.supplier}</p>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              {item.quantity} × {formatCurrency(item.unit_price)} = {formatCurrency(item.quantity * item.unit_price)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex items-center gap-3">
                    <button
                      onClick={() => navigate(`/partner/orders/${order.id}`)}
                      className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
                    >
                      <FiEye className="text-sm" />
                      View Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        isOpen={!!orderIdParam}
        onClose={closeDetails}
        title={selectedOrder?.order_number ? `Order Details - ${selectedOrder.order_number}` : 'Order Details'}
        maxWidth="max-w-3xl"
      >
        {detailsLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !selectedOrder ? (
          <div className="text-center text-gray-500 py-10">Unable to load order details.</div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Order Number</p>
                <p className="font-semibold text-gray-800">{selectedOrder.order_number}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Created At</p>
                <p className="font-semibold text-gray-800">{formatDateTime(selectedOrder.created_at)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge {...(STATUS_BADGE[selectedOrder.status] || STATUS_BADGE.pending)} />
                <Badge {...(PAYMENT_BADGE[selectedOrder.payment_status] || PAYMENT_BADGE.unpaid)} />
              </div>
              <div className="text-right sm:text-left">
                <p className="text-xs text-gray-500">Total Amount</p>
                <p className="font-bold text-gray-900">{formatCurrency(selectedOrder.total_amount || 0)}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Items</p>
              {!Array.isArray(selectedOrder.items) || selectedOrder.items.length === 0 ? (
                <div className="text-sm text-gray-400 bg-gray-50 rounded-lg px-4 py-3">No items found for this order.</div>
              ) : (
                <div className="space-y-2">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id || `${item.product_id}-${item.product_name}`} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{item.product_name}</p>
                        <p className="text-xs text-gray-500">{item.supplier || 'Nogatu Manufacturing'}</p>
                      </div>
                      <p className="text-sm text-gray-700">
                        {item.quantity} x {formatCurrency(item.unit_price)} = {formatCurrency((item.subtotal ?? (item.quantity * item.unit_price)) || 0)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Orders;
