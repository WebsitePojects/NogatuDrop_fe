import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/AnimatedModal';
import { Button, Spinner } from 'flowbite-react';
import {
  HiShoppingCart,
  HiX,
  HiCheckCircle,
  HiExclamationCircle,
  HiOutlinePaperAirplane,
  HiOutlineClipboardCopy,
  HiOutlineCheck,
  HiOutlineExternalLink,
  HiOutlinePhotograph,
  HiOutlineClock,
} from 'react-icons/hi';
import { FiPackage } from 'react-icons/fi';
import ConfirmModal from '@/components/ConfirmModal';
import StatusBadge from '@/components/StatusBadge';
import StatusProgressBar from '@/components/StatusProgressBar';
import PaymentCountdownTimer from '@/components/PaymentCountdownTimer';
import ProofOfDeliveryPanel from '@/components/ProofOfDeliveryPanel';
import { ToastContainer, useToast } from '@/components/Toast';
import api from '@/services/api';
import { ORDERS, BANK_ACCOUNTS, DELIVERY_TOKENS } from '@/services/endpoints';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDate, formatDateTime } from '@/utils/formatDate';
import { useAuth } from '@/context/AuthContext';

const STATUS_STEPS = ['pending', 'approved', 'delivering', 'delivered'];
const TAB_STATUSES = {
  all: null,
  pending: ['pending'],
  approved: ['approved'],
  delivering: ['delivering'],
  delivered: ['delivered'],
  cancelled: ['cancelled', 'rejected'],
};

function roleLabel(roleSlug) {
  const normalized = String(roleSlug || '').trim().toLowerCase();
  if (normalized === 'mobile_stockist') return 'Mobile Stockist';
  if (normalized === 'city_stockist') return 'City Stockist';
  if (normalized === 'provincial_stockist') return 'Provincial Stockist';
  if (normalized === 'staff') return 'Staff';
  if (normalized === 'super_admin') return 'Super Admin';
  return normalized ? normalized.replace(/_/g, ' ') : 'Unknown';
}

function toStatusKey(value) {
  return String(value || '').trim().toLowerCase();
}

function isManagedChildOrder(order, viewerRole) {
  const placedByRole = toStatusKey(order?.placed_by_role_slug);
  if (viewerRole === 'city_stockist') {
    return placedByRole === 'mobile_stockist';
  }
  if (viewerRole === 'provincial_stockist') {
    return placedByRole === 'city_stockist';
  }
  return false;
}

function isOwnScopedOrder(order, viewerRole) {
  return !isManagedChildOrder(order, viewerRole);
}

function getSectionTitles(viewerRole) {
  if (viewerRole === 'city_stockist') {
    return {
      own: 'My City Orders',
      child: 'Mobile Stockist Orders',
      ownEmpty: 'No city orders match this filter.',
      childEmpty: 'No affiliated mobile stockist orders match this filter.',
    };
  }

  if (viewerRole === 'provincial_stockist') {
    return {
      own: 'My Provincial Orders',
      child: 'Affiliated City Orders',
      ownEmpty: 'No provincial orders match this filter.',
      childEmpty: 'No affiliated city orders match this filter.',
    };
  }

  return {
    own: 'Operational Orders',
    child: '',
    ownEmpty: 'No orders match this filter.',
    childEmpty: '',
  };
}

function buildDeliveryLinkState(order) {
  if (order?.has_active_delivery_link) {
    return { label: 'Generated', tone: 'success' };
  }
  const paymentStatus = toStatusKey(order?.payment_status);
  const orderStatus = toStatusKey(order?.status);
  if (['delivered', 'cancelled', 'rejected'].includes(orderStatus)) {
    return { label: 'Closed', tone: 'gray' };
  }
  if (!['paid', 'verified'].includes(paymentStatus)) {
    return { label: 'Waiting Payment', tone: 'warning' };
  }
  return { label: 'Ready', tone: 'info' };
}

function buildProofState(order) {
  if (order?.payment_proof_uploaded_at || order?.payment_proof_url) {
    return { label: 'Uploaded', tone: 'success' };
  }
  return { label: 'Missing', tone: 'gray' };
}

function SectionHeader({ title, count }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-700 dark:text-[var(--dark-text)]">
        {title}
      </h2>
      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-200">
        {count}
      </span>
    </div>
  );
}

function TonePill({ label, tone }) {
  const styles = {
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200',
    info: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200',
    gray: 'bg-gray-100 text-gray-600 dark:bg-gray-500/10 dark:text-gray-300',
  };

  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${styles[tone] || styles.gray}`}>
      {label}
    </span>
  );
}

function EmptyState({ label }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 px-4 py-10 text-center text-gray-400 dark:border-[var(--dark-border)] dark:text-[var(--dark-muted)]">
      <FiPackage size={34} className="mb-3 opacity-30" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

function OrderTable({ list, onOpenDetail }) {
  if (list.length === 0) {
    return null;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-[var(--dark-border)] dark:bg-[var(--dark-card)]">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-[var(--dark-card2)]">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-[var(--dark-muted)]">Order #</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-[var(--dark-muted)]">Placed By</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-[var(--dark-muted)]">Role</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-[var(--dark-muted)]">Total</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-[var(--dark-muted)]">Payment</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-[var(--dark-muted)]">Proof</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-[var(--dark-muted)]">Delivery Link</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-[var(--dark-muted)]">Status</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-[var(--dark-muted)]">Date</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-[var(--dark-muted)]">Actions</th>
          </tr>
        </thead>
        <tbody>
          {list.map((order) => {
            const proofState = buildProofState(order);
            const deliveryState = buildDeliveryLinkState(order);
            return (
              <tr
                key={order.id}
                className="cursor-pointer border-t border-gray-50 transition-colors hover:bg-amber-50/30 dark:border-[var(--dark-border)] dark:hover:bg-white/5"
                onClick={() => onOpenDetail(order)}
              >
                <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-900 dark:text-[var(--dark-text)]">
                  {order.order_number}
                </td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-gray-900 dark:text-[var(--dark-text)]">
                    {order.placed_by_name || order.customer_name || 'Unknown'}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-[var(--dark-muted)]">
                    {order.partner_name || 'Stockist'}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-600 dark:text-[var(--dark-muted)]">
                  {roleLabel(order.placed_by_role_slug)}
                </td>
                <td className="px-4 py-3 font-semibold text-gray-900 dark:text-[var(--dark-text)]">
                  {formatCurrency(order.total_amount)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={order.payment_status || 'unpaid'} />
                </td>
                <td className="px-4 py-3">
                  <TonePill {...proofState} />
                </td>
                <td className="px-4 py-3">
                  <TonePill {...deliveryState} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={order.status} />
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 dark:text-[var(--dark-muted)]">
                  {formatDate(order.created_at)}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpenDetail(order);
                    }}
                  >
                    View
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function StockistOrders() {
  const { user } = useAuth();
  const { toasts, showToast, dismiss } = useToast();
  const viewerRole = toStatusKey(user?.role_slug);
  const titles = getSectionTitles(viewerRole);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deliveryProof, setDeliveryProof] = useState(null);
  const [deliveryProofLoading, setDeliveryProofLoading] = useState(false);
  const [bankAccount, setBankAccount] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(null);
  const [confirmApprove, setConfirmApprove] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [approving, setApproving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [deliveryLinkInfo, setDeliveryLinkInfo] = useState(null);
  const [copiedOrderId, setCopiedOrderId] = useState(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(ORDERS.LIST, { params: { limit: 100 } });
      const list = Array.isArray(data.data) ? data.data : (data.data?.items || []);
      setOrders(list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    } catch (error) {
      setOrders([]);
      showToast(error?.response?.data?.message || 'Failed to load orders', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const hydrateDeliveryLinkForOrder = useCallback(async (orderLike) => {
    if (!orderLike?.id || !isManagedChildOrder(orderLike, viewerRole)) {
      setDeliveryLinkInfo(null);
      return;
    }

    const paymentKey = toStatusKey(orderLike.payment_status);
    const statusKey = toStatusKey(orderLike.status);
    if (!['paid', 'verified'].includes(paymentKey) || ['delivered', 'cancelled', 'rejected'].includes(statusKey)) {
      setDeliveryLinkInfo(null);
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
        setDeliveryLinkInfo(null);
      }
    } catch {
      setDeliveryLinkInfo(null);
    }
  }, [viewerRole]);

  const openDetail = async (order) => {
    setSelectedOrder(order);
    setDetailLoading(true);
    setBankAccount(null);
    setDeliveryProof(null);
    setDeliveryProofLoading(false);
    setDeliveryLinkInfo(null);
    setCopiedOrderId(null);

    try {
      const { data } = await api.get(ORDERS.BY_ID(order.id));
      const detail = data.data;
      setSelectedOrder(detail);

      if (detail?.status === 'approved' && detail?.payment_status !== 'paid') {
        try {
          const bank = await api.get(BANK_ACCOUNTS.FOR_ORDER(order.id));
          setBankAccount(bank.data.data || null);
        } catch {
          setBankAccount(null);
        }
      }

      await hydrateDeliveryLinkForOrder(detail);

      if (['delivering', 'delivered'].includes(toStatusKey(detail?.status))) {
        setDeliveryProofLoading(true);
        try {
          const pod = await api.get(DELIVERY_TOKENS.POD_BY_ORDER(order.id));
          setDeliveryProof(pod.data?.data || null);
        } catch {
          setDeliveryProof(null);
        } finally {
          setDeliveryProofLoading(false);
        }
      }
    } catch (error) {
      showToast(error?.response?.data?.message || 'Failed to load order details', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedOrder(null);
    setDeliveryProof(null);
    setDeliveryProofLoading(false);
    setDeliveryLinkInfo(null);
    setCopiedOrderId(null);
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
    } catch (error) {
      showToast(error?.response?.data?.message || 'Failed to cancel order', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const handleApprove = async () => {
    if (!confirmApprove) return;
    setApproving(true);
    try {
      await api.patch(ORDERS.APPROVE(confirmApprove));
      showToast('Child order approved. Waiting for payment proof.', 'success');
      const approvedOrderId = confirmApprove;
      setConfirmApprove(null);
      await fetchOrders();
      if (selectedOrder && String(selectedOrder.id) === String(approvedOrderId)) {
        await openDetail({ id: approvedOrderId });
      } else {
        closeDetail();
      }
    } catch (error) {
      showToast(error?.response?.data?.message || 'Failed to approve order', 'error');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!selectedOrder?.id) return;
    setRejecting(true);
    try {
      await api.patch(ORDERS.REJECT(selectedOrder.id), { reason: rejectReason });
      showToast('Child order rejected', 'info');
      setShowRejectModal(false);
      setRejectReason('');
      closeDetail();
      fetchOrders();
    } catch (error) {
      showToast(error?.response?.data?.message || 'Failed to reject order', 'error');
    } finally {
      setRejecting(false);
    }
  };

  const handleUploadProof = async (file) => {
    if (!selectedOrder) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('proof', file);
    try {
      await api.post(ORDERS.PAYMENT_PROOF(selectedOrder.id), formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      showToast('Payment proof uploaded!', 'success');
      await openDetail({ id: selectedOrder.id });
      fetchOrders();
    } catch (error) {
      showToast(error?.response?.data?.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleVerifyPayment = async () => {
    if (!selectedOrder?.id) return;
    setVerifyingPayment(true);
    try {
      await api.patch(ORDERS.VERIFY_PAYMENT(selectedOrder.id));

      let generatedLink = null;
      try {
        const { data } = await api.post(DELIVERY_TOKENS.GENERATE, { order_id: selectedOrder.id });
        generatedLink = data?.data?.magic_link || null;
        if (generatedLink) {
          setDeliveryLinkInfo({
            orderId: selectedOrder.id,
            magicLink: generatedLink,
            expiresAt: data.data?.expires_at || null,
          });
        }
      } catch {
        generatedLink = null;
      }

      showToast(
        generatedLink
          ? 'Payment verified and delivery link generated.'
          : 'Payment verified. Generate the delivery link if needed.',
        'success'
      );

      await fetchOrders();
      await openDetail({ id: selectedOrder.id });
    } catch (error) {
      showToast(error?.response?.data?.message || 'Failed to verify payment', 'error');
    } finally {
      setVerifyingPayment(false);
    }
  };

  const handleGenerateDelivery = async () => {
    if (!selectedOrder?.id) return;
    setVerifyingPayment(true);
    try {
      const { data } = await api.post(DELIVERY_TOKENS.GENERATE, { order_id: selectedOrder.id });
      const generatedLink = data?.data?.magic_link || null;
      if (generatedLink) {
        setDeliveryLinkInfo({
          orderId: selectedOrder.id,
          magicLink: generatedLink,
          expiresAt: data.data?.expires_at || null,
        });
      }
      showToast('Delivery link generated. Copy it below and send it to the delivery team.', 'success');
      await fetchOrders();
      await openDetail({ id: selectedOrder.id });
    } catch (error) {
      showToast(error?.response?.data?.message || 'Failed to generate delivery link', 'error');
    } finally {
      setVerifyingPayment(false);
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
      showToast('Delivery link copied.', 'success');
    } catch {
      showToast('Failed to copy link. Please copy it manually.', 'error');
    }
  };

  const filteredOrders = useMemo(() => {
    const statuses = TAB_STATUSES[activeTab];
    if (!statuses) return orders;
    return orders.filter((order) => statuses.includes(order.status));
  }, [activeTab, orders]);

  const ownOrders = useMemo(
    () => filteredOrders.filter((order) => isOwnScopedOrder(order, viewerRole)),
    [filteredOrders, viewerRole]
  );
  const childOrders = useMemo(
    () => filteredOrders.filter((order) => isManagedChildOrder(order, viewerRole)),
    [filteredOrders, viewerRole]
  );

  const tabCounts = useMemo(() => (
    Object.fromEntries(
      Object.entries(TAB_STATUSES).map(([key, statuses]) => [
        key,
        statuses ? orders.filter((order) => statuses.includes(order.status)).length : orders.length,
      ])
    )
  ), [orders]);

  const detail = selectedOrder;
  const placedByRole = toStatusKey(detail?.placed_by_role_slug);
  const isChildManagedOrder = isManagedChildOrder(detail, viewerRole);
  const isOwnOrder = detail ? isOwnScopedOrder(detail, viewerRole) : false;
  const selectedStatusKey = toStatusKey(detail?.status);
  const selectedPaymentKey = toStatusKey(detail?.payment_status);
  const isPaymentVerified = ['paid', 'verified'].includes(selectedPaymentKey);
  const isTerminalStatus = ['delivered', 'cancelled', 'rejected'].includes(selectedStatusKey);
  const canReviewPendingChildOrder = Boolean(detail?.status === 'pending' && isChildManagedOrder);
  const canVerifyChildPayment = Boolean(
    detail?.status === 'approved'
    && !isPaymentVerified
    && isChildManagedOrder
    && detail?.payment_proof_url
  );
  const canGenerateChildDeliveryLink = Boolean(isChildManagedOrder && isPaymentVerified && !isTerminalStatus);
  const canCancelOwnPendingOrder = Boolean(detail?.status === 'pending' && isOwnOrder);
  const canUploadOwnPaymentProof = Boolean(detail?.status === 'approved' && !isPaymentVerified && isOwnOrder);
  const hasActiveDetailLink = Boolean(
    detail
    && deliveryLinkInfo
    && String(deliveryLinkInfo.orderId) === String(detail.id)
    && deliveryLinkInfo.magicLink
  );

  return (
    <div className="min-h-screen bg-[#FFF8F0] p-4 md:p-6 dark:bg-[var(--dark-bg)]">
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-[var(--dark-text)]">
          <HiShoppingCart className="text-amber-500" />
          Orders
        </h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-[var(--dark-muted)]">
          Review your orders and the child-order queue routed to your Stockist level.
        </p>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {Object.keys(TAB_STATUSES).map((tabKey) => (
          <button
            key={tabKey}
            type="button"
            onClick={() => setActiveTab(tabKey)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === tabKey
                ? 'bg-amber-500 text-white'
                : 'bg-white text-gray-600 hover:bg-amber-50 dark:bg-[var(--dark-card)] dark:text-[var(--dark-muted)] dark:hover:bg-[var(--dark-card2)]'
            }`}
          >
            <span className="capitalize">{tabKey}</span>
            <span className="ml-2 rounded-full bg-black/10 px-2 py-0.5 text-[11px] font-bold text-current dark:bg-white/10">
              {tabCounts[tabKey]}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="xl" color="warning" />
        </div>
      ) : (
        <div className="space-y-6">
          <section>
            <SectionHeader title={titles.own} count={ownOrders.length} />
            {ownOrders.length === 0 ? (
              <EmptyState label={titles.ownEmpty} />
            ) : (
              <OrderTable list={ownOrders} onOpenDetail={openDetail} />
            )}
          </section>

          {titles.child ? (
            <section>
              <SectionHeader title={titles.child} count={childOrders.length} />
              {childOrders.length === 0 ? (
                <EmptyState label={titles.childEmpty} />
              ) : (
                <OrderTable list={childOrders} onOpenDetail={openDetail} />
              )}
            </section>
          ) : null}
        </div>
      )}

      <Modal show={Boolean(selectedOrder)} onClose={closeDetail} size="3xl" backdropClasses="bg-black/50 backdrop-blur-sm">
        <ModalHeader>
          Order Details
          {detail && (
            <span className="ml-2 font-mono text-sm font-normal text-gray-500 dark:text-[var(--dark-muted)]">
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
              {!['cancelled', 'rejected'].includes(detail.status) && (
                <StatusProgressBar steps={STATUS_STEPS} current={detail.status} />
              )}

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: 'Order #', value: `#${detail.order_number || detail.id}` },
                  { label: 'Date', value: formatDateTime(detail.created_at) },
                  { label: 'Status', value: <StatusBadge status={detail.status} /> },
                  { label: 'Payment', value: <StatusBadge status={detail.payment_status || 'unpaid'} /> },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl bg-gray-50 p-3 dark:bg-[var(--dark-card2)]">
                    <p className="mb-0.5 text-xs text-gray-500 dark:text-[var(--dark-muted)]">{label}</p>
                    <div className="text-sm font-semibold text-gray-900 dark:text-[var(--dark-text)]">{value}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl bg-gray-50 p-3 dark:bg-[var(--dark-card2)]">
                <p className="mb-0.5 text-xs text-gray-500 dark:text-[var(--dark-muted)]">Placed By</p>
                <div className="text-sm font-semibold text-gray-900 dark:text-[var(--dark-text)]">
                  {detail.placed_by_name || detail.customer_name || 'Unknown'}
                </div>
                <div className="mt-0.5 text-xs text-gray-500 dark:text-[var(--dark-muted)]">
                  {roleLabel(detail.placed_by_role_slug)}
                  {detail.placed_by_email ? ` - ${detail.placed_by_email}` : ''}
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-[var(--dark-border)]">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-[var(--dark-card)]">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-[var(--dark-muted)]">Product</th>
                      <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 dark:text-[var(--dark-muted)]">Qty</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 dark:text-[var(--dark-muted)]">Price</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 dark:text-[var(--dark-muted)]">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detail.items || []).map((item, index) => (
                      <tr key={`${item.product_id}-${index}`} className="border-t border-gray-50 dark:border-[var(--dark-border)]">
                        <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-[var(--dark-text)]">{item.product_name}</td>
                        <td className="px-4 py-2.5 text-center text-gray-600 dark:text-[var(--dark-muted)]">{item.quantity}</td>
                        <td className="px-4 py-2.5 text-right text-gray-600 dark:text-[var(--dark-muted)]">{formatCurrency(item.unit_price)}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-gray-900 dark:text-[var(--dark-text)]">
                          {formatCurrency(item.subtotal ?? (item.quantity * item.unit_price))}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-gray-200 bg-gray-50 dark:border-[var(--dark-border)] dark:bg-[var(--dark-card2)]">
                      <td colSpan={3} className="px-4 py-3 text-right font-bold text-gray-900 dark:text-[var(--dark-text)]">Total</td>
                      <td className="px-4 py-3 text-right text-base font-bold text-amber-600">
                        {formatCurrency(detail.total_amount)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {detail.payment_proof_url && (
                <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-500/20 dark:bg-blue-500/10">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-blue-100 p-2 text-blue-600 dark:bg-blue-500/10 dark:text-blue-200">
                      <HiOutlinePhotograph className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-800 dark:text-blue-200">Payment Proof</p>
                      <p className="text-xs text-blue-700/80 dark:text-blue-200/80">
                        {detail.payment_proof_uploaded_at ? `Uploaded ${formatDateTime(detail.payment_proof_uploaded_at)}` : 'Proof uploaded'}
                      </p>
                    </div>
                  </div>
                  <a
                    href={detail.payment_proof_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    View Proof
                    <HiOutlineExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}

              {detail.payment_deadline && selectedPaymentKey !== 'paid' && !['cancelled', 'rejected'].includes(selectedStatusKey) && (
                <div className="flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
                  <div className="rounded-lg bg-amber-100 p-2 text-amber-600 dark:bg-amber-500/10 dark:text-amber-200">
                    <HiOutlineClock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-800 dark:text-amber-200">Payment Deadline</p>
                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-100">
                      {formatDateTime(detail.payment_deadline)}
                    </p>
                  </div>
                </div>
              )}

              {canUploadOwnPaymentProof ? (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-[var(--dark-text)]">Payment</h3>
                  <PaymentCountdownTimer
                    deadline={detail.payment_deadline}
                    bankAccount={bankAccount}
                    onUpload={handleUploadProof}
                    uploading={uploading}
                    paymentProofUrl={detail.payment_proof_url}
                  />
                </div>
              ) : detail.status === 'approved' && detail.payment_status !== 'paid' && isChildManagedOrder ? (
                <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
                  This child order is awaiting payment verification. Review the uploaded proof, verify payment, and generate the delivery link once payment is confirmed.
                </div>
              ) : null}

              {hasActiveDetailLink && (
                <div className="rounded-xl border border-purple-200 bg-purple-50 p-5 dark:border-purple-500/20 dark:bg-purple-500/10">
                  <div className="mb-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-900 dark:text-purple-200">
                      Delivery Magic Link
                    </p>
                    <p className="text-sm text-purple-700/80 dark:text-purple-200/80">
                      Copy this link and send it to the delivery team.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 md:flex-row md:items-center">
                    <input
                      type="text"
                      readOnly
                      value={deliveryLinkInfo.magicLink}
                      className="w-full rounded-xl border border-purple-200 bg-white px-3 py-2 text-xs font-mono text-gray-700 dark:border-purple-500/20 dark:bg-[var(--dark-card2)] dark:text-[var(--dark-text)]"
                    />
                    <Button color="purple" onClick={handleCopyDeliveryLink}>
                      {String(copiedOrderId) === String(detail.id) ? (
                        <>
                          <HiOutlineCheck className="mr-2 h-4 w-4" />
                          Copied
                        </>
                      ) : (
                        <>
                          <HiOutlineClipboardCopy className="mr-2 h-4 w-4" />
                          Copy Link
                        </>
                      )}
                    </Button>
                  </div>
                  {deliveryLinkInfo.expiresAt && (
                    <p className="mt-3 text-xs text-purple-700/80 dark:text-purple-200/80">
                      Expires: {formatDateTime(deliveryLinkInfo.expiresAt)}
                    </p>
                  )}
                </div>
              )}

              {(deliveryProofLoading || deliveryProof || ['delivering', 'delivered'].includes(selectedStatusKey)) && (
                <ProofOfDeliveryPanel
                  proof={deliveryProof}
                  loading={deliveryProofLoading}
                  emptyMessage="The rider has not submitted proof of delivery yet. The map becomes live after the delivery magic link starts sending GPS pings."
                />
              )}
            </>
          )}
        </ModalBody>
        {detail && !detailLoading && (
          <ModalFooter>
            <div className="flex w-full flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {canReviewPendingChildOrder && (
                  <>
                    <Button color="success" onClick={() => setConfirmApprove(detail.id)}>
                      <HiCheckCircle className="mr-2 h-4 w-4" />
                      Approve Child Order
                    </Button>
                    <Button color="failure" outline onClick={() => setShowRejectModal(true)}>
                      <HiExclamationCircle className="mr-2 h-4 w-4" />
                      Reject Child Order
                    </Button>
                  </>
                )}
                {canVerifyChildPayment && (
                  <Button color="success" onClick={handleVerifyPayment} isProcessing={verifyingPayment} disabled={verifyingPayment}>
                    <HiCheckCircle className="mr-2 h-4 w-4" />
                    Verify Payment
                  </Button>
                )}
                {canGenerateChildDeliveryLink && (
                  <Button color="purple" onClick={handleGenerateDelivery} isProcessing={verifyingPayment} disabled={verifyingPayment}>
                    <HiOutlinePaperAirplane className="mr-2 h-4 w-4 rotate-45" />
                    {hasActiveDetailLink ? 'Regenerate Delivery Link' : 'Generate Delivery Link'}
                  </Button>
                )}
                {canCancelOwnPendingOrder && (
                  <Button color="failure" onClick={() => setConfirmCancel(detail.id)}>
                    <HiX className="mr-2 h-4 w-4" />
                    Cancel Order
                  </Button>
                )}
              </div>
              <Button color="gray" onClick={closeDetail}>
                Close
              </Button>
            </div>
          </ModalFooter>
        )}
      </Modal>

      <ConfirmModal
        show={Boolean(confirmCancel)}
        title="Cancel Order"
        message="Are you sure you want to cancel this order? This action cannot be undone."
        confirmLabel="Cancel Order"
        confirmColor="failure"
        loading={cancelling}
        onConfirm={handleCancel}
        onClose={() => setConfirmCancel(null)}
      />

      <ConfirmModal
        show={Boolean(confirmApprove)}
        title="Approve Child Order"
        message="Approve this child order and move it into payment collection?"
        confirmLabel="Approve Child Order"
        confirmColor="success"
        loading={approving}
        onConfirm={handleApprove}
        onClose={() => setConfirmApprove(null)}
      />

      <Modal show={showRejectModal} onClose={() => setShowRejectModal(false)} size="md" backdropClasses="bg-black/50 backdrop-blur-sm">
        <ModalHeader>Reject Child Order</ModalHeader>
        <ModalBody className="space-y-3">
          <p className="text-sm text-gray-500 dark:text-[var(--dark-muted)]">
            Provide a short reason so the child Stockist knows what to fix before resubmitting.
          </p>
          <textarea
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            rows={4}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-[var(--dark-border)] dark:bg-[var(--dark-card2)] dark:text-[var(--dark-text)]"
            placeholder="Reason for rejection"
          />
        </ModalBody>
        <ModalFooter>
          <Button color="failure" onClick={handleReject} isProcessing={rejecting} disabled={rejecting}>
            Reject Child Order
          </Button>
          <Button color="gray" onClick={() => setShowRejectModal(false)}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
