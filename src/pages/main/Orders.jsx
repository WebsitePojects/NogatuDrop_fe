import React, { useState, useEffect, useCallback } from 'react';
import { FiSearch, FiFilter, FiEye } from 'react-icons/fi';
import api from '@/services/api';
import { ORDERS, DASHBOARD } from '@/services/endpoints';
import Modal from '@/components/Modal';
import { STATUS_BADGE, PAYMENT_BADGE } from '@/utils/constants';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDate } from '@/utils/formatDate';
import { useAuth } from '@/context/AuthContext';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [actioningOrderId, setActioningOrderId] = useState(null);
  const { user } = useAuth();

  const isSuperAdmin = user?.role_slug === 'super_admin';

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(ORDERS.LIST, {
        params: { page, search, status: statusFilter || undefined, limit: 12 },
      });
      setOrders(data.data || []);
      setPagination(data.pagination || null);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchOrders();
    api.get(DASHBOARD.KPIS).then((r) => setKpis(r.data.data)).catch(() => {});
  }, [fetchOrders]);

  const viewOrder = async (order) => {
    try {
      const { data } = await api.get(ORDERS.BY_ID(order.id));
      setSelectedOrder(data.data);
    } catch {
      setSelectedOrder(order);
    }
    setShowDetail(true);
  };

  const refreshSelectedOrder = async (orderId) => {
    try {
      const { data } = await api.get(ORDERS.BY_ID(orderId));
      setSelectedOrder(data.data);
    } catch {
      setSelectedOrder(null);
      setShowDetail(false);
    }
  };

  const runOrderAction = async (order, action) => {
    if (!isSuperAdmin) {
      alert('Only super admin can perform this action');
      return;
    }

    setActioningOrderId(order.id);
    try {
      if (action === 'approve') {
        await api.patch(ORDERS.APPROVE(order.id));
      }

      if (action === 'reject') {
        const reason = window.prompt('Enter rejection reason (optional):') || '';
        await api.patch(ORDERS.REJECT(order.id), { reason });
      }

      if (action === 'pay') {
        await api.patch(ORDERS.PAY(order.id), {
          method: 'bank_transfer',
          amount: order.total_amount,
        });
      }

      if (action === 'deliver') {
        await api.patch(ORDERS.DELIVER(order.id));
      }

      await fetchOrders();
      if (selectedOrder?.id === order.id) {
        await refreshSelectedOrder(order.id);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed');
    } finally {
      setActioningOrderId(null);
    }
  };

  return (
    <div style={{ backgroundColor: '#FFF3E0', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-wide uppercase">ORDER MANAGEMENT</h1>
          <p className="text-sm text-gray-500 mt-1">Process and track partner orders</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { title: 'Total Revenue', value: formatCurrency(kpis?.total_revenue || 0) },
          { title: 'Inventory Value', value: formatCurrency(kpis?.inventory_value || 0) },
          { title: 'Pending Orders', value: kpis?.pending_orders ?? 0 },
          { title: 'Active Partners', value: kpis?.active_partners ?? 0 },
        ].map((k) => (
          <div key={k.title} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-sm text-gray-500 font-medium">{k.title}</p>
            <p className="text-2xl font-bold text-gray-800 mt-2">{k.value}</p>
          </div>
        ))}
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
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="delivering">Delivering</option>
            <option value="delivered">Delivered</option>
          </select>
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 text-gray-400">No orders found</div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const sBadge = STATUS_BADGE[order.status] || STATUS_BADGE.pending;
            const pBadge = PAYMENT_BADGE[order.payment_status] || PAYMENT_BADGE.unpaid;
            return (
              <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                {/* Order Header Row */}
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{order.order_number}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {order.partner_name || order.business_name || 'N/A'}
                    </p>
                    <p className="text-xs text-gray-400">
                      Ordered on {formatDate(order.created_at)}
                    </p>
                    {order.completed_at && (
                      <p className="text-xs text-gray-400">
                        Completed {formatDate(order.completed_at)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${sBadge.bg} ${sBadge.text}`}>
                        {sBadge.label}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${pBadge.bg} ${pBadge.text}`}>
                        {pBadge.label}
                      </span>
                    </div>
                    <span className="text-lg font-bold" style={{ color: '#FF8C00' }}>
                      {(order.total_amount || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Order Items */}
                {order.items && order.items.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-600 mb-2">Order Items ({order.items.length}):</p>
                    <div className="space-y-1">
                      {order.items.map((item, i) => (
                        <div key={i} className="flex justify-between text-xs text-gray-600">
                          <span className="font-medium">{item.product_name}</span>
                          <span className="text-gray-400">{item.supplier_name || ''}</span>
                          <span>{item.quantity} × ₱{Number(item.unit_price || 0).toLocaleString()} = ₱{Number(item.line_total || item.quantity * item.unit_price || 0).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* View Details Button */}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => viewOrder(order)}
                      className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      <FiEye /> View Details
                    </button>

                    {isSuperAdmin && order.status === 'pending' && (
                      <>
                        <button
                          onClick={() => runOrderAction(order, 'approve')}
                          disabled={actioningOrderId === order.id}
                          className="px-2.5 py-1.5 text-xs font-semibold rounded-lg text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => runOrderAction(order, 'reject')}
                          disabled={actioningOrderId === order.id}
                          className="px-2.5 py-1.5 text-xs font-semibold rounded-lg text-white bg-red-500 hover:bg-red-600 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </>
                    )}

                    {isSuperAdmin && order.status === 'approved' && order.payment_status !== 'paid' && (
                      <button
                        onClick={() => runOrderAction(order, 'pay')}
                        disabled={actioningOrderId === order.id}
                        className="px-2.5 py-1.5 text-xs font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                      >
                        Mark Paid
                      </button>
                    )}

                    {isSuperAdmin && ['approved', 'delivering'].includes(order.status) && (
                      <button
                        onClick={() => runOrderAction(order, 'deliver')}
                        disabled={actioningOrderId === order.id}
                        className="px-2.5 py-1.5 text-xs font-semibold rounded-lg text-white bg-[#FF8C00] hover:bg-[#E07B00] disabled:opacity-50"
                      >
                        Mark Delivered
                      </button>
                    )}
                  </div>
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

      {/* View Order Modal */}
      <Modal isOpen={showDetail} onClose={() => setShowDetail(false)} title="" maxWidth="max-w-2xl">
        {selectedOrder && (
          <div>
            {/* Modal Header */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-extrabold text-gray-900 uppercase">ORDER DETAILS</h2>
              <p className="text-sm text-gray-500 mt-1">{selectedOrder.order_number}</p>
            </div>

            {/* Date Info */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="text-center">
                <p className="text-sm text-gray-400 mb-1">Order Date</p>
                <p className="text-sm font-bold text-gray-800">{new Date(selectedOrder.created_at).toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-400 mb-1">Last Update</p>
                <p className="text-sm font-bold text-gray-800">{new Date(selectedOrder.updated_at || selectedOrder.created_at).toLocaleString()}</p>
              </div>
            </div>

            {/* Status badges */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="text-center">
                <p className="text-sm text-gray-400 mb-2">Status</p>
                {(() => {
                  const b = STATUS_BADGE[selectedOrder.status] || STATUS_BADGE.pending;
                  return <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold ${b.bg} ${b.text}`}>{b.label}</span>;
                })()}
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-400 mb-2">Payment Status</p>
                {(() => {
                  const b = PAYMENT_BADGE[selectedOrder.payment_status] || PAYMENT_BADGE.unpaid;
                  return <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold ${b.bg} ${b.text}`}>{b.label}</span>;
                })()}
              </div>
            </div>

            <hr className="border-gray-200 mb-4" />

            {/* Items */}
            {selectedOrder.items && selectedOrder.items.length > 0 && (
              <div className="space-y-3 mb-4">
                {selectedOrder.items.map((item, i) => (
                  <div key={i} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-bold text-gray-900 uppercase">{item.product_name}</p>
                      <p className="text-xs font-semibold text-gray-500 mt-0.5">{item.supplier_name || item.warehouse_name || ''}</p>
                    </div>
                    <span className="text-sm text-gray-500">
                      {item.quantity} × ₱{Number(item.unit_price || 0).toLocaleString()} = ₱{Number(item.line_total || (item.quantity * item.unit_price) || 0).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <hr className="border-gray-200 mb-4" />

            {/* Total */}
            <div className="flex justify-between items-center">
              <span className="text-xl font-extrabold text-gray-900">TOTAL:</span>
              <span className="text-2xl font-extrabold text-gray-900">
                {Number(selectedOrder.total_amount || 0).toLocaleString()}
              </span>
            </div>

            {isSuperAdmin && (
              <div className="mt-5 pt-4 border-t border-gray-200 flex flex-wrap gap-2">
                {selectedOrder.status === 'pending' && (
                  <>
                    <button
                      onClick={() => runOrderAction(selectedOrder, 'approve')}
                      disabled={actioningOrderId === selectedOrder.id}
                      className="px-3 py-2 text-xs font-semibold rounded-lg text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                    >
                      Approve Order
                    </button>
                    <button
                      onClick={() => runOrderAction(selectedOrder, 'reject')}
                      disabled={actioningOrderId === selectedOrder.id}
                      className="px-3 py-2 text-xs font-semibold rounded-lg text-white bg-red-500 hover:bg-red-600 disabled:opacity-50"
                    >
                      Reject Order
                    </button>
                  </>
                )}

                {selectedOrder.status === 'approved' && selectedOrder.payment_status !== 'paid' && (
                  <button
                    onClick={() => runOrderAction(selectedOrder, 'pay')}
                    disabled={actioningOrderId === selectedOrder.id}
                    className="px-3 py-2 text-xs font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    Mark as Paid
                  </button>
                )}

                {['approved', 'delivering'].includes(selectedOrder.status) && (
                  <button
                    onClick={() => runOrderAction(selectedOrder, 'deliver')}
                    disabled={actioningOrderId === selectedOrder.id}
                    className="px-3 py-2 text-xs font-semibold rounded-lg text-white bg-[#FF8C00] hover:bg-[#E07B00] disabled:opacity-50"
                  >
                    Mark as Delivered
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Orders;
