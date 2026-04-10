import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/AnimatedModal';
import { useState, useEffect, useCallback } from 'react';
import {
  Button, Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell, Badge, Card, Spinner, Tabs, TabItem, TextInput, Select, Label, Textarea, Pagination } from 'flowbite-react';
import {
  HiOutlineSearch, HiOutlineEye, HiOutlineCheck, HiOutlineX,
  HiOutlineClock, HiOutlinePhotograph, HiOutlineExternalLink,
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
      <Modal show={showDetail} onClose={() => setShowDetail(false)} size="2xl" backdropClasses="bg-black/50 backdrop-blur-sm">
        <ModalHeader>
          Order Details {selectedOrder ? `— ${selectedOrder.order_number}` : ''}
        </ModalHeader>
        <ModalBody>
          {detailLoading ? (
            <div className="flex justify-center py-10">
              <Spinner size="lg" />
            </div>
          ) : selectedOrder ? (
            <div className="space-y-5">
              {/* Header info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-[var(--dark-muted)] text-xs mb-0.5">Stockist</p>
                  <p className="font-semibold text-gray-900 dark:text-[var(--dark-text)]">{selectedOrder.partner_name || selectedOrder.business_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-[var(--dark-muted)] text-xs mb-0.5">Date Ordered</p>
                  <p className="font-semibold text-gray-900 dark:text-[var(--dark-text)]">{formatDateTime(selectedOrder.created_at)}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-[var(--dark-muted)] text-xs mb-0.5">Order Status</p>
                  <StatusBadge status={selectedOrder.status} />
                </div>
                <div>
                  <p className="text-gray-500 dark:text-[var(--dark-muted)] text-xs mb-0.5">Payment Status</p>
                  <StatusBadge status={selectedOrder.payment_status || 'unpaid'} />
                </div>
                {selectedOrder.payment_deadline && (
                  <div>
                    <p className="text-gray-500 dark:text-[var(--dark-muted)] text-xs mb-0.5">Payment Deadline</p>
                    <p className="font-semibold text-amber-700 flex items-center gap-1">
                      <HiOutlineClock className="w-3.5 h-3.5" />
                      {formatDateTime(selectedOrder.payment_deadline)}
                    </p>
                  </div>
                )}
              </div>

              {/* Items table */}
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-[var(--dark-muted)] uppercase mb-2">Order Items</p>
                <div className="overflow-x-auto border border-gray-100 dark:border-[var(--dark-border)] rounded-lg">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeadCell>Product</TableHeadCell>
                        <TableHeadCell>Qty</TableHeadCell>
                        <TableHeadCell>Unit Price</TableHeadCell>
                        <TableHeadCell>Subtotal</TableHeadCell>
                      </TableRow>
                    </TableHead>
                    <TableBody className="divide-y">
                      {(selectedOrder.items || []).map((item, i) => (
                        <TableRow key={i}>
                          <TableCell>{item.product_name}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                          <TableCell className="font-semibold">{formatCurrency(item.subtotal || item.quantity * item.unit_price)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-end mt-2">
                  <p className="text-base font-bold text-gray-900 dark:text-[var(--dark-text)]">
                    Total: {formatCurrency(selectedOrder.total_amount)}
                  </p>
                </div>
              </div>

              {/* Payment proof */}
              {selectedOrder.payment_proof_url && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-[var(--dark-muted)] uppercase mb-2">Payment Proof</p>
                  <a href={selectedOrder.payment_proof_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
                    <HiOutlinePhotograph className="w-4 h-4" />
                    View Payment Proof
                    <HiOutlineExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {isActiveOrderLink && deliveryLinkInfo?.magicLink && (
                <div className="p-3 bg-purple-50 border border-purple-100 rounded-lg">
                  <p className="text-xs font-semibold text-purple-700 uppercase mb-2">Delivery Magic Link</p>
                  <p className="text-xs text-purple-700 mb-2">
                    Copy and send this link to the order Stockist chat: {selectedOrder.partner_name || selectedOrder.business_name || 'Stockist'}
                  </p>
                  <div className="flex flex-col gap-2 md:flex-row md:items-center">
                    <TextInput value={deliveryLinkInfo.magicLink} readOnly sizing="sm" className="flex-1" />
                    <Button color="purple" size="sm" onClick={handleCopyDeliveryLink}>
                      {String(copiedOrderId) === String(selectedOrder.id) ? 'Copied' : 'Copy Link'}
                    </Button>
                  </div>
                  {deliveryLinkInfo.expiresAt && (
                    <p className="text-xs text-purple-700 mt-2">
                      Expires: {formatDateTime(deliveryLinkInfo.expiresAt)}
                    </p>
                  )}
                </div>
              )}

              {/* Cancellation reason */}
              {selectedOrder.cancellation_reason && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm">
                  <p className="font-semibold text-red-700 mb-1">Cancellation/Rejection Reason</p>
                  <p className="text-red-600">{selectedOrder.cancellation_reason}</p>
                </div>
              )}
            </div>
          ) : null}
        </ModalBody>
        {selectedOrder && isSuperAdmin && (
          <ModalFooter>
            <div className="flex flex-wrap gap-2">
              {selectedStatusKey === 'pending' && (
                <>
                  <Button color="success" size="sm" onClick={() => { setShowDetail(false); handleApprove(selectedOrder); }}>
                    <HiOutlineCheck className="w-4 h-4 mr-1" /> Approve
                  </Button>
                  <Button color="failure" size="sm" onClick={() => { setShowDetail(false); handleReject(selectedOrder); }}>
                    <HiOutlineX className="w-4 h-4 mr-1" /> Reject
                  </Button>
                </>
              )}
              <Button
                color="purple"
                size="sm"
                disabled={!canGenerateDeliveryLink || actionLoading}
                onClick={() => handleGenerateDelivery(selectedOrder)}
              >
                {deliveryLinkLabel}
              </Button>
              {selectedStatusKey === 'approved' && selectedPaymentStatusKey !== 'paid' && (
                <Button
                  color="success"
                  size="sm"
                  disabled={!selectedOrder.payment_proof_url || actionLoading}
                  onClick={() => handleVerifyPayment(selectedOrder)}
                >
                  {selectedOrder.payment_proof_url
                    ? (actionLoading ? 'Marking as Paid...' : 'Mark as Paid')
                    : 'Payment Proof Required'}
                </Button>
              )}
              {!['delivered', 'cancelled', 'rejected'].includes(selectedStatusKey) && (
                <Button color="failure" outline size="sm" onClick={() => { setShowDetail(false); handleCancel(selectedOrder); }}>
                  Cancel Order
                </Button>
              )}
              <Button color="gray" size="sm" onClick={() => setShowDetail(false)}>Close</Button>
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
