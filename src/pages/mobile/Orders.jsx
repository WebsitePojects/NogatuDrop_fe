import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Spinner } from 'flowbite-react';
import { HiUpload, HiCheckCircle, HiX } from 'react-icons/hi';
import { FiPackage } from 'react-icons/fi';
import StatusBadge from '@/components/StatusBadge';
import OrderStatusTimeline from '@/components/OrderStatusTimeline';
import { ToastContainer, useToast } from '@/components/Toast';
import api from '@/services/api';
import { ORDERS } from '@/services/endpoints';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDate } from '@/utils/formatDate';

const STATUS_STEPS = ['pending', 'approved', 'delivering', 'delivered'];

export default function MobileOrders() {
  const { toasts, showToast, dismiss } = useToast();

  const [tab, setTab] = useState('active');
  const [orders, setOrders] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [uploading, setUploading] = useState(null);
  // previewByOrder: { [orderId]: { file, objectUrl } }
  const [previewByOrder, setPreviewByOrder] = useState({});
  const fileInputRefs = useRef({});

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(ORDERS.LIST, { params: { limit: 50 } });
      const list = Array.isArray(data.data) ? data.data : (data.data?.items || []);
      setOrders(list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    } catch {
      // Keep the mobile surface resilient; detailed errors are surfaced on action flows.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Realtime-ish: refresh every 30s (paused while a card is expanded or uploading).
  useEffect(() => {
    const id = setInterval(() => { if (!expandedId && !uploading) fetchOrders(); }, 30000);
    return () => clearInterval(id);
  }, [fetchOrders, expandedId, uploading]);

  // Notification deep-link: clear ?highlight after the glow plays.
  useEffect(() => {
    if (!highlightId) return undefined;
    const t = setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      next.delete('highlight');
      setSearchParams(next, { replace: true });
    }, 4000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightId]);

  const filtered = orders.filter((o) => (
    tab === 'active'
      ? ['pending', 'approved', 'delivering'].includes(o.status)
      : ['delivered', 'cancelled', 'rejected'].includes(o.status)
  ));

  const handleFileSelect = (orderId, file) => {
    if (!file) return;
    const objectUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
    setPreviewByOrder((prev) => {
      if (prev[orderId]?.objectUrl) URL.revokeObjectURL(prev[orderId].objectUrl);
      return { ...prev, [orderId]: { file, objectUrl } };
    });
    // Reset input so same file can be reselected after clearing.
    if (fileInputRefs.current[orderId]) fileInputRefs.current[orderId].value = '';
  };

  const handleClearPreview = (orderId) => {
    setPreviewByOrder((prev) => {
      if (prev[orderId]?.objectUrl) URL.revokeObjectURL(prev[orderId].objectUrl);
      const next = { ...prev };
      delete next[orderId];
      return next;
    });
  };

  const handleUploadProof = async (orderId) => {
    const preview = previewByOrder[orderId];
    if (!preview?.file) return;
    setUploading(orderId);
    const formData = new FormData();
    formData.append('proof', preview.file);
    try {
      await api.post(ORDERS.PAYMENT_PROOF(orderId), formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      showToast('Payment proof uploaded successfully!', 'success');
      handleClearPreview(orderId);
      fetchOrders();
    } catch (err) {
      showToast(err?.response?.data?.message || 'Upload failed', 'error');
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="bg-white min-h-screen">
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4">
        <div className="flex">
          {[{ v: 'active', l: 'Active' }, { v: 'history', l: 'History' }].map(({ v, l }) => (
            <button
              key={v}
              onClick={() => setTab(v)}
              className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${
                tab === v
                  ? 'text-orange-500 border-b-2 border-orange-500'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 pb-24 space-y-3">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" color="warning" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <FiPackage size={40} className="mb-3 opacity-30" />
            <p className="text-sm">No orders found</p>
          </div>
        ) : (
          filtered.map((order) => {
            const isExpanded = expandedId === order.id;
            const isActive = ['pending', 'approved', 'delivering'].includes(order.status);

            return (
              <div key={order.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${highlightId && String(order.id) === highlightId ? 'border-amber-400 ring-2 ring-amber-300 animate-pulse' : 'border-gray-100'}`}>
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-mono font-bold text-sm text-gray-900">
                        #{order.order_number || order.id}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(order.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm text-orange-500">
                        {formatCurrency(order.total_amount)}
                      </p>
                      <div className="mt-1">
                        <StatusBadge status={order.status} />
                      </div>
                    </div>
                  </div>

                  {isActive && (
                    <OrderStatusTimeline status={order.status} paymentStatus={order.payment_status} />
                  )}
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 py-4 space-y-3 bg-gray-50/50">
                    {order.items && order.items.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Items</p>
                        <div className="space-y-1">
                          {order.items.map((item, i) => (
                            <div key={i} className="flex justify-between text-sm">
                              <span className="text-gray-700">{item.product_name} x {item.quantity}</span>
                              <span className="font-medium text-gray-900">
                                {formatCurrency((item.subtotal || item.quantity * item.unit_price) || 0)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {order.status === 'approved' && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Payment</p>
                        {order.payment_status === 'paid' ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
                              <HiCheckCircle className="w-4 h-4" />
                              Payment verified
                            </div>
                            {order.payment_proof_url && (
                              <a href={order.payment_proof_url} target="_blank" rel="noreferrer" className="block">
                                <img
                                  src={order.payment_proof_url}
                                  alt="Payment proof"
                                  className="w-full max-h-40 object-contain rounded-lg border border-emerald-100 bg-white cursor-zoom-in"
                                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                              </a>
                            )}
                          </div>
                        ) : order.payment_proof_url ? (
                          <div className="space-y-2">
                            <p className="text-sm text-blue-600 font-medium">Proof uploaded — awaiting verification</p>
                            <a href={order.payment_proof_url} target="_blank" rel="noreferrer" className="block">
                              <img
                                src={order.payment_proof_url}
                                alt="Payment proof"
                                className="w-full max-h-40 object-contain rounded-lg border border-blue-100 bg-white cursor-zoom-in"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            </a>
                          </div>
                        ) : (
                          <div className="space-y-2 mt-1">
                            {order.payment_deadline && (
                              <p className="text-xs text-amber-600">
                                Pay by: {formatDate(order.payment_deadline)}
                              </p>
                            )}

                            {/* Preview selected image before upload */}
                            {previewByOrder[order.id] && !uploading && (
                              <div className="rounded-lg border border-amber-200 bg-white p-2 space-y-2">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs font-semibold text-gray-600">Selected image</p>
                                  <button
                                    type="button"
                                    onClick={() => handleClearPreview(order.id)}
                                    className="text-gray-400 hover:text-gray-700 p-0.5"
                                  >
                                    <HiX size={14} />
                                  </button>
                                </div>
                                {previewByOrder[order.id].objectUrl ? (
                                  <img
                                    src={previewByOrder[order.id].objectUrl}
                                    alt="Proof preview"
                                    className="w-full max-h-40 object-contain rounded border border-gray-100"
                                  />
                                ) : (
                                  <p className="text-xs text-gray-500 italic">{previewByOrder[order.id].file.name}</p>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleUploadProof(order.id)}
                                  className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600"
                                >
                                  <HiUpload size={14} />
                                  Confirm & Upload
                                </button>
                              </div>
                            )}

                            {uploading === order.id ? (
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Spinner size="sm" color="warning" /> Uploading...
                              </div>
                            ) : (
                              <label className="flex items-center gap-2 text-sm text-orange-500 font-semibold cursor-pointer hover:text-orange-600">
                                <HiUpload size={15} />
                                {previewByOrder[order.id] ? 'Choose a different image' : 'Choose Payment Proof'}
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  ref={(el) => { fileInputRefs.current[order.id] = el; }}
                                  onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (file) handleFileSelect(order.id, file);
                                  }}
                                />
                              </label>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
