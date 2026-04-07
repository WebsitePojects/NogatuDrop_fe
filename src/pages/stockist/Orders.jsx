import { useState, useEffect, useCallback } from 'react';
import {
  Modal, ModalHeader, ModalBody, Button, Spinner, Tabs, TabItem,
} from 'flowbite-react';
import {
  HiShoppingCart, HiX, HiCheckCircle, HiExclamationCircle,
} from 'react-icons/hi';
import { FiPackage } from 'react-icons/fi';
import ConfirmModal from '@/components/ConfirmModal';
import StatusBadge from '@/components/StatusBadge';
import StatusProgressBar from '@/components/StatusProgressBar';
import PaymentCountdownTimer from '@/components/PaymentCountdownTimer';
import { ToastContainer, useToast } from '@/components/Toast';
import api from '@/services/api';
import { ORDERS, BANK_ACCOUNTS } from '@/services/endpoints';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDate, formatDateTime } from '@/utils/formatDate';

const STATUS_STEPS = ['pending', 'approved', 'delivering', 'delivered'];

const TAB_STATUSES = {
  all: null,
  pending: ['pending'],
  approved: ['approved'],
  delivering: ['delivering'],
  delivered: ['delivered'],
  cancelled: ['cancelled', 'rejected'],
};

export default function StockistOrders() {
  const { toasts, showToast, dismiss } = useToast();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetail, setOrderDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [bankAccount, setBankAccount] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(ORDERS.LIST, { params: { limit: 100 } });
      const list = Array.isArray(data.data) ? data.data : (data.data?.items || []);
      setOrders(list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    } catch {
      showToast('Failed to load orders', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const openDetail = async (order) => {
    setSelectedOrder(order);
    setDetailLoading(true);
    setBankAccount(null);
    try {
      const { data } = await api.get(ORDERS.BY_ID(order.id));
      setOrderDetail(data.data);

      // Fetch bank account if approved and unpaid
      if (data.data?.status === 'approved' && data.data?.payment_status !== 'paid') {
        try {
          const ba = await api.get(BANK_ACCOUNTS.FOR_ORDER(order.id));
          setBankAccount(ba.data.data);
        } catch {
          // no bank account available
        }
      }
    } catch {
      showToast('Failed to load order details', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedOrder(null);
    setOrderDetail(null);
  };

  const handleCancel = async () => {
    if (!confirmCancel) return;
    setCancelling(true);
    try {
      await api.patch(ORDERS.CANCEL(confirmCancel));
      showToast('Order cancelled', 'info');
      setConfirmCancel(null);
      closeDetail();
      fetchOrders();
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to cancel order', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const handleUploadProof = async (file) => {
    if (!orderDetail) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('proof', file);
    try {
      await api.post(ORDERS.PAYMENT_PROOF(orderDetail.id), formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      showToast('Payment proof uploaded!', 'success');
      // Refresh detail
      const { data } = await api.get(ORDERS.BY_ID(orderDetail.id));
      setOrderDetail(data.data);
      fetchOrders();
    } catch (err) {
      showToast(err?.response?.data?.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const filteredOrders = (status) => {
    const statuses = TAB_STATUSES[status];
    if (!statuses) return orders;
    return orders.filter(o => statuses.includes(o.status));
  };

  const tabCounts = Object.fromEntries(
    Object.entries(TAB_STATUSES).map(([k, v]) => [k, v ? orders.filter(o => v.includes(o.status)).length : orders.length])
  );

  const renderOrderTable = (list) => {
    if (loading) {
      return (
        <div className="flex justify-center py-12">
          <Spinner size="lg" color="warning" />
        </div>
      );
    }
    if (list.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <FiPackage size={40} className="mb-3 opacity-30" />
          <p className="text-sm">No orders found</p>
        </div>
      );
    }
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-[var(--dark-border)] bg-gray-50 dark:bg-[var(--dark-card)]">
              <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-500 dark:text-[var(--dark-muted)] uppercase tracking-wide">Order #</th>
              <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-500 dark:text-[var(--dark-muted)] uppercase tracking-wide">Total</th>
              <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-500 dark:text-[var(--dark-muted)] uppercase tracking-wide">Status</th>
              <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-500 dark:text-[var(--dark-muted)] uppercase tracking-wide">Payment</th>
              <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-500 dark:text-[var(--dark-muted)] uppercase tracking-wide">Date</th>
              <th className="py-2.5 px-4" />
            </tr>
          </thead>
          <tbody>
            {list.map(order => (
              <tr
                key={order.id}
                className="border-b border-gray-50 hover:bg-amber-50/40 cursor-pointer transition-colors"
                onClick={() => openDetail(order)}
              >
                <td className="py-3 px-4 font-mono font-semibold text-xs text-gray-800 dark:text-[var(--dark-text)]">
                  #{order.order_number || order.id}
                </td>
                <td className="py-3 px-4 font-semibold text-gray-900 dark:text-[var(--dark-text)]">
                  {formatCurrency(order.total_amount)}
                </td>
                <td className="py-3 px-4">
                  <StatusBadge status={order.status} />
                </td>
                <td className="py-3 px-4">
                  <StatusBadge status={order.payment_status || 'unpaid'} />
                </td>
                <td className="py-3 px-4 text-gray-500 dark:text-[var(--dark-muted)] text-xs">
                  {formatDate(order.created_at)}
                </td>
                <td className="py-3 px-4">
                  <button className="text-xs text-amber-600 hover:text-amber-700 font-medium">
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const detail = orderDetail || selectedOrder;

  return (
    <div className="p-4 md:p-6 min-h-screen page-enter bg-[#FFF8F0] dark:bg-[var(--dark-bg)]">
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-[var(--dark-text)] flex items-center gap-2">
          <HiShoppingCart className="text-amber-500" />
          My Orders
        </h1>
        <p className="text-sm text-gray-500 dark:text-[var(--dark-muted)] mt-0.5">Track and manage your orders</p>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-[var(--dark-card)] rounded-2xl border border-gray-100 dark:border-[var(--dark-border)] shadow-sm overflow-hidden">
        <Tabs
          aria-label="Orders tabs"
          variant="underline"
          onActiveTabChange={idx => {
            const keys = Object.keys(TAB_STATUSES);
            setActiveTab(keys[idx]);
          }}
        >
          {Object.entries(TAB_STATUSES).map(([key]) => (
            <TabItem
              key={key}
              title={
                <span className="flex items-center gap-1.5 capitalize">
                  {key}
                  {tabCounts[key] > 0 && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full font-normal">
                      {tabCounts[key]}
                    </span>
                  )}
                </span>
              }
            >
              <div className="p-0">
                {renderOrderTable(filteredOrders(key))}
              </div>
            </TabItem>
          ))}
        </Tabs>
      </div>

      {/* Order Detail Modal */}
      <Modal show={!!selectedOrder} onClose={closeDetail} size="xl" backdropClasses="bg-black/50 backdrop-blur-sm">
        <ModalHeader>
          Order Details
          {detail && (
            <span className="ml-2 font-mono text-sm font-normal text-gray-500">
              #{detail.order_number || detail.id}
            </span>
          )}
        </ModalHeader>
        <ModalBody className="space-y-5">
          {detailLoading ? (
            <div className="flex justify-center py-8">
              <Spinner size="lg" color="warning" />
            </div>
          ) : !detail ? null : (
            <>
              {/* Status progress */}
              {!['cancelled', 'rejected'].includes(detail.status) && (
                <StatusProgressBar steps={STATUS_STEPS} current={detail.status} />
              )}

              {/* Header info */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Order #', value: `#${detail.order_number || detail.id}` },
                  { label: 'Date', value: formatDate(detail.created_at) },
                  { label: 'Status', value: <StatusBadge status={detail.status} /> },
                  { label: 'Payment', value: <StatusBadge status={detail.payment_status || 'unpaid'} /> },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 dark:bg-[var(--dark-card2)] rounded-xl p-3">
                    <p className="text-xs text-gray-500 dark:text-[var(--dark-muted)] mb-0.5">{label}</p>
                    <div className="font-semibold text-sm text-gray-900 dark:text-[var(--dark-text)]">{value}</div>
                  </div>
                ))}
              </div>

              {/* Items */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-[var(--dark-text)] mb-2">Order Items</h3>
                {(!detail.items || detail.items.length === 0) ? (
                  <p className="text-sm text-gray-400 bg-gray-50 dark:bg-[var(--dark-card2)] rounded-xl px-4 py-3">No items found</p>
                ) : (
                  <div className="border border-gray-100 dark:border-[var(--dark-border)] rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-[var(--dark-card)]">
                        <tr>
                          <th className="text-left px-4 py-2.5 text-xs text-gray-500 dark:text-[var(--dark-muted)] font-semibold">Product</th>
                          <th className="text-center px-4 py-2.5 text-xs text-gray-500 dark:text-[var(--dark-muted)] font-semibold">Qty</th>
                          <th className="text-right px-4 py-2.5 text-xs text-gray-500 dark:text-[var(--dark-muted)] font-semibold">Price</th>
                          <th className="text-right px-4 py-2.5 text-xs text-gray-500 dark:text-[var(--dark-muted)] font-semibold">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.items.map((item, i) => (
                          <tr key={i} className="border-t border-gray-50 dark:border-[var(--dark-border)]">
                            <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-[var(--dark-text)]">{item.product_name}</td>
                            <td className="px-4 py-2.5 text-center text-gray-600 dark:text-[var(--dark-muted)]">{item.quantity}</td>
                            <td className="px-4 py-2.5 text-right text-gray-600 dark:text-[var(--dark-muted)]">{formatCurrency(item.unit_price)}</td>
                            <td className="px-4 py-2.5 text-right font-semibold text-gray-900 dark:text-[var(--dark-text)]">
                              {formatCurrency(item.subtotal ?? (item.quantity * item.unit_price))}
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-gray-200 dark:border-[var(--dark-border)] bg-gray-50 dark:bg-[var(--dark-card2)]">
                          <td colSpan={3} className="px-4 py-3 text-right font-bold text-gray-900 dark:text-[var(--dark-text)]">Total</td>
                          <td className="px-4 py-3 text-right font-bold text-amber-600 text-base">
                            {formatCurrency(detail.total_amount)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Payment section */}
              {detail.status === 'approved' && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-[var(--dark-text)] mb-2">Payment</h3>
                  <PaymentCountdownTimer
                    deadline={detail.payment_deadline}
                    bankAccount={bankAccount}
                    onUpload={handleUploadProof}
                    uploading={uploading}
                    paymentProofUrl={detail.payment_proof_url}
                  />
                  {detail.payment_status === 'paid' && (
                    <div className="mt-2 flex items-center gap-2 text-emerald-600 text-sm font-medium">
                      <HiCheckCircle className="w-4 h-4" />
                      Payment verified
                    </div>
                  )}
                </div>
              )}

              {/* Cancel button */}
              {detail.status === 'pending' && (
                <div className="pt-2">
                  <Button
                    color="failure"
                    size="sm"
                    onClick={() => setConfirmCancel(detail.id)}
                  >
                    <HiX className="mr-2 w-4 h-4" />
                    Cancel Order
                  </Button>
                </div>
              )}
            </>
          )}
        </ModalBody>
      </Modal>

      {/* Cancel Confirm */}
      <ConfirmModal
        show={!!confirmCancel}
        title="Cancel Order"
        message="Are you sure you want to cancel this order? This action cannot be undone."
        confirmLabel="Cancel Order"
        confirmColor="failure"
        loading={cancelling}
        onConfirm={handleCancel}
        onClose={() => setConfirmCancel(null)}
      />
    </div>
  );
}
