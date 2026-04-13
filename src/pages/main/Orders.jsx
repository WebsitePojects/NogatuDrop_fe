import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/AnimatedModal';
import { useState, useEffect, useCallback } from 'react';
import {
  Button, Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell, Badge, Card, Spinner, Tabs, TabItem, TextInput, Select, Label, Textarea, Pagination } from 'flowbite-react';
import {
  HiOutlineSearch, HiOutlineEye, HiOutlineCheck, HiOutlineX,
  HiOutlineClock, HiOutlinePhotograph, HiOutlineExternalLink,
  HiOutlineUser, HiOutlineCalendar, HiOutlineXCircle,
  HiOutlineLink, HiOutlineClipboardCopy, HiOutlineCheckCircle, HiOutlinePaperAirplane
} from 'react-icons/hi';
import api from '@/services/api';
import { DELIVERY_TOKENS, ORDERS } from '@/services/endpoints';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDate, formatDateTime } from '@/utils/formatDate';
import { useAuth } from '@/context/AuthContext';
import StatusBadge from '@/components/StatusBadge';
import ConfirmModal from '@/components/ConfirmModal';
import PageHeader from '@/components/PageHeader';
import { ToastContainer, useToast } from '@/components/Toast';

const STATUSES = ['all', 'pending', 'approved', 'delivering', 'delivered', 'cancelled'];
const toStatusKey = (value) => String(value || '').trim().toLowerCase();

export default function Orders() {
  const { user } = useAuth();
  const { toasts, showToast, dismiss } = useToast();
  const isSuperAdmin = user?.role_slug === 'super_admin';

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  const [confirmAction, setConfirmAction] = useState(null); // { type, order }
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectOrder, setRejectOrder] = useState(null);
  const [deliveryLinkInfo, setDeliveryLinkInfo] = useState(null); // { orderId, magicLink, expiresAt }
  const [copiedOrderId, setCopiedOrderId] = useState(null);

  const statusFilter = STATUSES[activeTab] === 'all' ? '' : STATUSES[activeTab];

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(ORDERS.LIST, {
        params: { page, search: search || undefined, status: statusFilter || undefined, limit: 15 },
      });
      setOrders(data.data || []);
      setTotalPages(data.pagination?.pages || 1);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const openDetail = async (order) => {
    setCopiedOrderId(null);
    setDeliveryLinkInfo((prev) => {
      if (!prev) return null;
      return String(prev.orderId) === String(order.id) ? prev : null;
    });

    setShowDetail(true);
    setDetailLoading(true);
    try {
      const { data } = await api.get(ORDERS.BY_ID(order.id));
      setSelectedOrder(data.data);
      await hydrateDeliveryLinkForOrder(data.data);
    } catch {
      setSelectedOrder(order);
      await hydrateDeliveryLinkForOrder(order);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleApprove = (order) => {
    setConfirmAction({ type: 'approve', order });
  };

  const handleReject = (order) => {
    setRejectOrder(order);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleCancel = (order) => {
    setConfirmAction({ type: 'cancel', order });
  };

  const hydrateDeliveryLinkForOrder = async (orderLike) => {
    if (!orderLike?.id) return;

    const paymentKey = toStatusKey(orderLike.payment_status);
    const statusKey = toStatusKey(orderLike.status);
    const paymentEligible = ['paid', 'verified'].includes(paymentKey);
    const statusEligible = !['delivered', 'cancelled', 'rejected'].includes(statusKey);

    if (!paymentEligible || !statusEligible) {
      setDeliveryLinkInfo((prev) => {
        if (!prev) return null;
        return String(prev.orderId) === String(orderLike.id) ? null : prev;
      });
      return;
    }

    try {
      const { data } = await api.get(DELIVERY_TOKENS.BY_ORDER(orderLike.id));
      const existingLink = data?.data?.magic_link || null;
      if (existingLink) {
        setDeliveryLinkInfo({
          orderId: orderLike.id,
          magicLink: existingLink,
          expiresAt: data.data?.expires_at || null,
        });
      } else {
        setDeliveryLinkInfo((prev) => {
          if (!prev) return null;
          return String(prev.orderId) === String(orderLike.id) ? null : prev;
        });
      }
    } catch {
      // Retrieval failure is non-blocking; manual generate still works.
    }
  };

  const handleGenerateDelivery = async (order) => {
    setActionLoading(true);
    try {
      const { data } = await api.post(DELIVERY_TOKENS.GENERATE, { order_id: order.id });
      const generatedLink = data.data?.magic_link || null;
      setCopiedOrderId(null);
      if (generatedLink) {
        setDeliveryLinkInfo({
          orderId: order.id,
          magicLink: generatedLink,
          expiresAt: data.data?.expires_at || null,
        });
      }

      showToast('Delivery link generated. Copy it from this modal and send it to the Stockist chat.', 'success');

      fetchOrders();
      if (String(selectedOrder?.id) === String(order.id)) {
        try {
          const { data: detail } = await api.get(ORDERS.BY_ID(order.id));
          setSelectedOrder(detail.data);
          await hydrateDeliveryLinkForOrder(detail.data);
        } catch {
          // Keep existing modal state if detail refresh fails.
        }
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to generate delivery link', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyDeliveryLink = async () => {
    const link = deliveryLinkInfo?.magicLink;
    if (!link || !selectedOrder?.id) return;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = link;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      setCopiedOrderId(String(selectedOrder.id));
      showToast('Delivery link copied. You can now paste it in Stockist chat.', 'success');
    } catch {
      showToast('Failed to copy link. Please copy it manually from the field.', 'error');
    }
  };

  const handleVerifyPayment = async (order) => {
    setActionLoading(true);
    try {
      await api.patch(ORDERS.VERIFY_PAYMENT(order.id));

      // Optimistic update so delivery-link action appears immediately after verification.
      setSelectedOrder((prev) => {
        if (!prev || String(prev.id) !== String(order.id)) return prev;
        return { ...prev, payment_status: 'paid' };
      });

      let autoLinkGenerated = false;
      try {
        const { data } = await api.post(DELIVERY_TOKENS.GENERATE, { order_id: order.id });
        const generatedLink = data.data?.magic_link || null;
        if (generatedLink) {
          setDeliveryLinkInfo({
            orderId: order.id,
            magicLink: generatedLink,
            expiresAt: data.data?.expires_at || null,
          });
          setCopiedOrderId(null);
          autoLinkGenerated = true;
        }
      } catch {
        autoLinkGenerated = false;
      }

      if (autoLinkGenerated) {
        showToast('Payment verified and delivery link generated. Copy it below and send to the Stockist chat.', 'success');
      } else {
        showToast('Payment verified. Auto-generate failed, click Generate Delivery Link below.', 'warning');
      }

      fetchOrders();
      if (String(selectedOrder?.id) === String(order.id)) {
        try {
          const { data } = await api.get(ORDERS.BY_ID(order.id));
          setSelectedOrder(data.data);
          await hydrateDeliveryLinkForOrder(data.data);
        } catch {
          // Keep optimistic state if detail refresh fails.
        }
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to mark payment as paid', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const executeConfirm = async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    try {
      const { type, order } = confirmAction;
      if (type === 'approve') {
        await api.patch(ORDERS.APPROVE(order.id));
        showToast('Order approved successfully', 'success');
      } else if (type === 'cancel') {
        await api.patch(ORDERS.CANCEL(order.id));
        showToast('Order cancelled', 'info');
      }
      setConfirmAction(null);
      fetchOrders();
      if (selectedOrder?.id === order.id) {
        const { data } = await api.get(ORDERS.BY_ID(order.id));
        setSelectedOrder(data.data);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Action failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const executeReject = async () => {
    if (!rejectOrder) return;
    setActionLoading(true);
    try {
      await api.patch(ORDERS.REJECT(rejectOrder.id), { reason: rejectReason });
      showToast('Order rejected', 'info');
      setShowRejectModal(false);
      fetchOrders();
      if (selectedOrder?.id === rejectOrder.id) {
        const { data } = await api.get(ORDERS.BY_ID(rejectOrder.id));
        setSelectedOrder(data.data);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to reject order', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const selectedStatusKey = toStatusKey(selectedOrder?.status);
  const selectedPaymentStatusKey = toStatusKey(selectedOrder?.payment_status);
  const isPaymentVerified = ['paid', 'verified'].includes(selectedPaymentStatusKey);
  const isTerminalStatus = ['delivered', 'cancelled', 'rejected'].includes(selectedStatusKey);
  const canGenerateDeliveryLink = isPaymentVerified && !isTerminalStatus;
  const isActiveOrderLink = selectedOrder && deliveryLinkInfo && String(deliveryLinkInfo.orderId) === String(selectedOrder.id);
  const deliveryLinkLabel = isTerminalStatus
    ? 'Generate Delivery Link (Order Closed)'
    : isPaymentVerified
      ? (actionLoading ? 'Generating Delivery Link...' : 'Generate Delivery Link')
      : 'Generate Delivery Link (Payment Required)';

  return (
    <div className="page-enter">
      <PageHeader title="Orders" subtitle="Manage and process all stockist orders" />

      <Card className="mb-0">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-48">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <TextInput
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search order number or stockist..."
              className="pl-8"
              sizing="sm"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs onActiveTabChange={(i) => { setActiveTab(i); setPage(1); }}>
          {STATUSES.map((s) => (
            <TabItem key={s} title={s.charAt(0).toUpperCase() + s.slice(1)}>
              {/* Table */}
              <div className="overflow-x-auto">
                <Table striped>
                  <TableHead>
                    <TableRow>
                      <TableHeadCell>Order #</TableHeadCell>
                      <TableHeadCell>Stockist</TableHeadCell>
                      <TableHeadCell>Items</TableHeadCell>
                      <TableHeadCell>Total</TableHeadCell>
                      <TableHeadCell>Payment</TableHeadCell>
                      <TableHeadCell>Status</TableHeadCell>
                      <TableHeadCell>Deadline</TableHeadCell>
                      <TableHeadCell>Date</TableHeadCell>
                      <TableHeadCell>Actions</TableHeadCell>
                    </TableRow>
                  </TableHead>
                  <TableBody className="divide-y">
                    {loading ? (
                      Array.from({ length: 6 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 9 }).map((__, j) => (
                            <TableCell key={j}><div className="skeleton h-4 w-full rounded" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : orders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-gray-400 py-10">
                          No orders found
                        </TableCell>
                      </TableRow>
                    ) : (
                      orders.map((order) => (
                        <TableRow key={order.id} className="hover:bg-amber-50/30 cursor-pointer" onClick={() => openDetail(order)}>
                          <TableCell className="font-mono font-medium text-gray-900 dark:text-[var(--dark-text)] text-xs">
                            {order.order_number}
                          </TableCell>
                          <TableCell className="text-xs">{order.partner_name || order.business_name || 'N/A'}</TableCell>
                          <TableCell className="text-xs">{order.items_count ?? order.items?.length ?? '—'}</TableCell>
                          <TableCell className="font-semibold text-xs">{formatCurrency(order.total_amount)}</TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <StatusBadge status={order.payment_status || 'unpaid'} />
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <StatusBadge status={order.status} />
                          </TableCell>
                          <TableCell className="text-xs">
                            {order.payment_deadline ? (
                              <span className="text-amber-700 font-medium">
                                {formatDateTime(order.payment_deadline)}
                              </span>
                            ) : '—'}
                          </TableCell>
                          <TableCell className="text-xs text-gray-500 dark:text-[var(--dark-muted)]">{formatDate(order.created_at)}</TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Button size="xs" color="light" onClick={() => openDetail(order)}>
                              <HiOutlineEye className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <div className="flex justify-center mt-4">
                  <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} showIcons />
                </div>
              )}
            </TabItem>
          ))}
        </Tabs>
      </Card>

      {/* Detail Modal */}
      <Modal show={showDetail} onClose={() => setShowDetail(false)} size="3xl" backdropClasses="bg-black/50 backdrop-blur-sm">
        <ModalHeader className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 px-6 py-4">
          <div className="flex flex-col">
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              Order Details
            </span>
            {selectedOrder && (
              <span className="text-sm font-medium text-gray-500 mt-1 dark:text-gray-400 font-mono tracking-wide">
                {selectedOrder.order_number}
              </span>
            )}
          </div>
        </ModalHeader>
        <ModalBody className="px-6 py-6 custom-scrollbar">
          {detailLoading ? (
            <div className="flex justify-center items-center py-20">
              <Spinner size="xl" color="warning" />
            </div>
          ) : selectedOrder ? (
            <div className="space-y-8">
              {/* Order Info Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-50 dark:bg-gray-800/80 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wider uppercase mb-1.5 flex items-center gap-1.5 whitespace-nowrap">
                    <HiOutlineUser className="w-3.5 h-3.5" /> Stockist
                  </p>
                  <p className="font-bold text-gray-900 dark:text-white text-sm line-clamp-2">
                    {selectedOrder.partner_name || selectedOrder.business_name || 'N/A'}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/80 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wider uppercase mb-1.5 flex items-center gap-1.5 whitespace-nowrap">
                    <HiOutlineCalendar className="w-3.5 h-3.5" /> Date Ordered
                  </p>
                  <p className="font-bold text-gray-900 dark:text-white text-sm line-clamp-2">
                    {formatDateTime(selectedOrder.created_at)}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/80 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wider uppercase mb-1.5 whitespace-nowrap">
                    Order Status
                  </p>
                  <div className="mt-1">
                    <StatusBadge status={selectedOrder.status} />
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/80 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wider uppercase mb-1.5 whitespace-nowrap">
                    Payment Status
                  </p>
                  <div className="mt-1">
                    <StatusBadge status={selectedOrder.payment_status || 'unpaid'} />
                  </div>
                </div>
              </div>

              {/* Items Section */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
                  <h3 className="text-sm font-bold tracking-wider text-gray-700 dark:text-gray-300 uppercase">Order Items</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400 tracking-wide">
                    <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">
                      <tr>
                        <th className="px-5 py-3 rounded-bl-none">Product</th>
                        <th className="px-5 py-3 text-center">Qty</th>
                        <th className="px-5 py-3 text-right">Unit Price</th>
                        <th className="px-5 py-3 text-right tracking-widest rounded-br-none">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {(selectedOrder.items || []).map((item, i) => (
                        <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                          <td className="px-5 py-4 font-medium text-gray-900 dark:text-gray-200">{item.product_name}</td>
                          <td className="px-5 py-4 text-center font-bold">{item.quantity}</td>
                          <td className="px-5 py-4 text-right">{formatCurrency(item.unit_price)}</td>
                          <td className="px-5 py-4 text-right font-black text-gray-900 dark:text-white">
                            {formatCurrency(item.subtotal || item.quantity * item.unit_price)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-200 dark:border-gray-700 flex justify-end items-center">
                  <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase mr-4 tracking-wider">Total Amount</span>
                  <span className="text-2xl font-black text-[var(--dark-text)] dark:text-white tracking-tight">
                    {formatCurrency(selectedOrder.total_amount)}
                  </span>
                </div>
              </div>

              {/* Extra Details Row: Proof + Deadline */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedOrder.payment_proof_url && (
                  <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 p-4 rounded-xl flex items-center justify-between shadow-sm transition-all hover:bg-blue-50 dark:hover:bg-blue-900/20">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-800/50 rounded-lg">
                        <HiOutlinePhotograph className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider mb-0.5">Payment Proof</p>
                        <p className="text-xs text-blue-600/80 dark:text-blue-400/80">Attached document</p>
                      </div>
                    </div>
                    <a href={selectedOrder.payment_proof_url} target="_blank" rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow transition-colors inline-flex items-center gap-1.5 focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800">
                      View File
                      <HiOutlineExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}

                {selectedOrder.payment_deadline && selectedStatusKey !== 'cancelled' && selectedStatusKey !== 'rejected' && selectedPaymentStatusKey === 'unpaid' && (
                  <div className="bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800 p-4 rounded-xl flex items-center gap-3 shadow-sm">
                    <div className="p-2 bg-amber-100 dark:bg-amber-800/50 rounded-lg">
                      <HiOutlineClock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider mb-0.5">Deadline</p>
                      <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
                        {formatDateTime(selectedOrder.payment_deadline)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Delivery Link Area */}
              {isActiveOrderLink && deliveryLinkInfo?.magicLink && (
                <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 p-5 rounded-xl shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-purple-100 dark:bg-purple-800/20 rounded-bl-full -mr-4 -mt-4 z-0"></div>
                  <div className="relative z-10">
                    <div className="flex items-start gap-3 flex-col sm:flex-row sm:items-center justify-between mb-4">
                      <div>
                        <p className="text-sm font-bold text-purple-900 dark:text-purple-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                          <HiOutlineLink className="w-4 h-4" /> Delivery Magic Link
                        </p>
                        <p className="text-sm text-purple-700/80 dark:text-purple-400/80">
                          Copy and send this link to the Stockist for tracking
                        </p>
                      </div>
                      {deliveryLinkInfo.expiresAt && (
                        <span className="text-xs font-bold bg-purple-100 dark:bg-purple-800/40 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-full whitespace-nowrap border border-purple-200 dark:border-purple-800/50">
                          Expires: {formatDateTime(deliveryLinkInfo.expiresAt)}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
                      <TextInput 
                        value={deliveryLinkInfo.magicLink} 
                        readOnly 
                        className="flex-1 font-mono text-xs shadow-inner"
                        color="purple"
                      />
                      <Button color="purple" onClick={handleCopyDeliveryLink} className="flex-shrink-0 font-bold whitespace-nowrap shadow-sm hover:shadow">
                        {String(copiedOrderId) === String(selectedOrder.id) ? (
                          <><HiOutlineCheck className="w-4 h-4 mr-2" /> Copied</>
                        ) : (
                          <><HiOutlineClipboardCopy className="w-4 h-4 mr-2" /> Copy Link</>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Cancellation string */}
              {selectedOrder.cancellation_reason && (
                <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 p-4 rounded-xl shadow-sm flex gap-3">
                  <div className="mt-0.5">
                    <HiOutlineXCircle className="w-5 h-5 text-red-500 dark:text-red-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-red-800 dark:text-red-300 uppercase tracking-wide mb-1">
                      Cancellation Note
                    </h4>
                    <p className="text-sm text-red-700 dark:text-red-400 font-medium">
                      {selectedOrder.cancellation_reason}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </ModalBody>
        {selectedOrder && isSuperAdmin && (
          <ModalFooter className="border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 px-6 py-4 justify-between items-center flex-wrap gap-y-3">
            <div className="flex gap-2 items-center flex-wrap">
              {selectedStatusKey === 'pending' && (
                <>
                  <Button color="success" onClick={() => { setShowDetail(false); handleApprove(selectedOrder); }} className="font-bold shadow-sm">
                    <HiOutlineCheck className="w-4 h-4 mr-1.5" /> Approve
                  </Button>
                  <Button color="failure" outline onClick={() => { setShowDetail(false); handleReject(selectedOrder); }} className="font-bold bg-white dark:bg-transparent">
                    <HiOutlineX className="w-4 h-4 mr-1.5" /> Reject
                  </Button>
                </>
              )}
              {selectedStatusKey === 'approved' && selectedPaymentStatusKey !== 'paid' && (
                 <Button
                 color={selectedOrder.payment_proof_url ? "success" : "light"}
                 disabled={!selectedOrder.payment_proof_url || actionLoading}
                 onClick={() => handleVerifyPayment(selectedOrder)}
                 className="font-bold shadow-sm"
               >
                 <HiOutlineCheckCircle className="w-4 h-4 mr-1.5" />
                 {selectedOrder.payment_proof_url
                   ? (actionLoading ? 'Processing...' : 'Verify Payment')
                   : 'Waiting for Proof'}
               </Button>
              )}
            </div>
            
            <div className="flex items-center gap-2 flex-wrap justify-end">
               <Button
                  color="purple"
                  disabled={!canGenerateDeliveryLink || actionLoading}
                  onClick={() => handleGenerateDelivery(selectedOrder)}
                  className="font-bold shadow-sm"
                >
                  <HiOutlinePaperAirplane className="w-4 h-4 mr-1.5 rotate-45 -mt-0.5" />
                  {isTerminalStatus ? 'Link unavailable' : isPaymentVerified ? (actionLoading ? 'Working...' : 'Send Delivery Link') : 'Payment required'}
                </Button>

                {!['delivered', 'cancelled', 'rejected'].includes(selectedStatusKey) && (
                  <Button color="failure" outline onClick={() => { setShowDetail(false); handleCancel(selectedOrder); }} className="font-bold bg-white dark:bg-transparent">
                    Cancel Task
                  </Button>
                )}
                <Button color="gray" onClick={() => setShowDetail(false)} className="font-bold shadow-sm">
                  Close
                </Button>
            </div>
          </ModalFooter>
        )}
      </Modal>

      {/* Confirm Modal */}
      <ConfirmModal
        show={!!confirmAction}
        title={confirmAction?.type === 'approve' ? 'Approve Order' : 'Cancel Order'}
        message={
          confirmAction?.type === 'approve'
            ? `Approve order ${confirmAction?.order?.order_number}? This will notify the stockist to complete payment within 24 hours.`
            : `Cancel order ${confirmAction?.order?.order_number}? This action cannot be undone.`
        }
        confirmLabel={confirmAction?.type === 'approve' ? 'Approve' : 'Cancel Order'}
        confirmColor={confirmAction?.type === 'approve' ? 'success' : 'failure'}
        onConfirm={executeConfirm}
        onClose={() => setConfirmAction(null)}
        loading={actionLoading}
      />

      {/* Reject Modal */}
      <Modal show={showRejectModal} onClose={() => setShowRejectModal(false)} size="md" backdropClasses="bg-black/50 backdrop-blur-sm">
        <ModalHeader>Reject Order</ModalHeader>
        <ModalBody>
          <Label htmlFor="rejectReason" value="Reason for rejection (optional)" className="mb-2" />
          <Textarea
            id="rejectReason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            placeholder="Provide a reason..."
          />
        </ModalBody>
        <ModalFooter>
          <Button color="failure" onClick={executeReject} disabled={actionLoading}>
            {actionLoading ? 'Rejecting...' : 'Reject Order'}
          </Button>
          <Button color="gray" onClick={() => setShowRejectModal(false)}>Cancel</Button>
        </ModalFooter>
      </Modal>

      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
