import { useState, useEffect, useCallback } from 'react';
import { Spinner } from 'flowbite-react';
import { HiUpload, HiCheckCircle } from 'react-icons/hi';
import { FiPackage } from 'react-icons/fi';
import StatusBadge from '@/components/StatusBadge';
import StatusProgressBar from '@/components/StatusProgressBar';
import PaymentCountdownTimer from '@/components/PaymentCountdownTimer';
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
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [uploading, setUploading] = useState(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(ORDERS.LIST, { params: { limit: 50 } });
      const list = Array.isArray(data.data) ? data.data : (data.data?.items || []);
      setOrders(list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const filtered = orders.filter(o =>
    tab === 'active'
      ? ['pending', 'approved', 'delivering'].includes(o.status)
      : ['delivered', 'cancelled', 'rejected'].includes(o.status)
  );

  const handleUploadProof = async (orderId, file) => {
    setUploading(orderId);
    const formData = new FormData();
    formData.append('proof', file);
    try {
      await api.post(ORDERS.PAYMENT_PROOF(orderId), formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      showToast('Payment proof uploaded successfully!', 'success');
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

      {/* Tabs */}
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
          filtered.map(order => {
            const isExpanded = expandedId === order.id;
            const isActive = ['pending', 'approved', 'delivering'].includes(order.status);

            return (
              <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Order header — always visible */}
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
                    <StatusProgressBar steps={STATUS_STEPS} current={order.status} />
                  )}
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 py-4 space-y-3 bg-gray-50/50">
                    {/* Items */}
                    {order.items && order.items.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Items</p>
                        <div className="space-y-1">
                          {order.items.map((item, i) => (
                            <div key={i} className="flex justify-between text-sm">
                              <span className="text-gray-700">{item.product_name} × {item.quantity}</span>
                              <span className="font-medium text-gray-900">
                                {formatCurrency((item.subtotal || item.quantity * item.unit_price) || 0)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Payment section */}
                    {order.status === 'approved' && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Payment</p>
                        {order.payment_status === 'paid' ? (
                          <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
                            <HiCheckCircle className="w-4 h-4" />
                            Payment verified
                          </div>
                        ) : order.payment_proof_url ? (
                          <div className="text-sm text-blue-600">
                            ✓ Proof uploaded — awaiting verification
                          </div>
                        ) : (
                          <div className="mt-1">
                            {uploading === order.id ? (
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Spinner size="sm" color="warning" /> Uploading…
                              </div>
                            ) : (
                              <label className="flex items-center gap-2 text-sm text-blue-600 font-medium cursor-pointer hover:text-blue-700">
                                <HiUpload size={15} />
                                Upload Payment Proof
                                <input
                                  type="file"
                                  accept="image/*,application/pdf"
                                  className="hidden"
                                  onChange={e => {
                                    const file = e.target.files[0];
                                    if (file) handleUploadProof(order.id, file);
                                  }}
                                />
                              </label>
                            )}
                            {order.payment_deadline && (
                              <p className="text-xs text-amber-600 mt-1">
                                Pay by: {formatDate(order.payment_deadline, true)}
                              </p>
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
