import { useState, useEffect, useCallback } from 'react';
import {
  Modal, ModalHeader, ModalBody, ModalFooter, Button, TextInput, Textarea, Label, Spinner,
} from 'flowbite-react';
import { HiSearch, HiAdjustments } from 'react-icons/hi';
import { FiPackage } from 'react-icons/fi';
import StatusBadge from '@/components/StatusBadge';
import ConfirmModal from '@/components/ConfirmModal';
import { ToastContainer, useToast } from '@/components/Toast';
import api from '@/services/api';
import { INVENTORY, STOCK_ADJUSTMENTS } from '@/services/endpoints';
import { INVENTORY_BADGE } from '@/utils/constants';
import { formatDate } from '@/utils/formatDate';

const stockStatusColor = (status) => {
  if (status === 'out_of_stock') return 'text-red-600 font-bold';
  if (status === 'low_stock') return 'text-amber-600 font-semibold';
  return 'text-emerald-600 font-semibold';
};

export default function StockistInventory() {
  const { toasts, showToast, dismiss } = useToast();

  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [adjustModal, setAdjustModal] = useState(null); // the inventory item
  const [adjustForm, setAdjustForm] = useState({ requested_qty: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);
  const [confirmAdj, setConfirmAdj] = useState(false);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(INVENTORY.LIST, {
        params: { page, limit: 20, search },
      });
      const items = data.data?.items || data.data || [];
      setInventory(items);
      setTotalPages(data.data?.pagination?.pages || 1);
    } catch {
      showToast('Failed to load inventory', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchInventory(); }, [fetchInventory]);

  const openAdjust = (item) => {
    setAdjustModal(item);
    setAdjustForm({ requested_qty: '', reason: '' });
  };

  const handleAdjustSubmit = async () => {
    if (!adjustModal) return;
    if (!adjustForm.requested_qty || !adjustForm.reason.trim()) {
      showToast('Please fill in all fields', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(STOCK_ADJUSTMENTS.CREATE, {
        inventory_id: adjustModal.id,
        warehouse_id: adjustModal.warehouse_id,
        requested_qty: parseInt(adjustForm.requested_qty),
        reason: adjustForm.reason,
      });
      showToast('Adjustment request submitted. Awaiting admin approval.', 'success');
      setAdjustModal(null);
      setConfirmAdj(false);
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to submit request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const available = (item) => (item.current_stock || 0) - (item.reserved_stock || 0);

  return (
    <div className="p-4 md:p-6 min-h-screen page-enter" style={{ background: '#FFF8F0' }}>
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">My Inventory</h1>
        <p className="text-sm text-gray-500 mt-0.5">Current stock levels at your warehouse</p>
      </div>

      {/* Search */}
      <div className="mb-4">
        <TextInput
          icon={HiSearch}
          placeholder="Search products…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          sizing="md"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="xl" color="warning" />
          </div>
        ) : inventory.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <FiPackage size={40} className="mb-3 opacity-30" />
            <p className="text-sm">No inventory found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Product', 'Batch', 'Expiry', 'On Hand', 'Reserved', 'Available', 'Status', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inventory.map(item => {
                    const avail = available(item);
                    const badgeKey = item.status?.toLowerCase();
                    const badge = INVENTORY_BADGE[badgeKey] || INVENTORY_BADGE['in_stock'];
                    return (
                      <tr key={item.id} className="border-b border-gray-50 hover:bg-amber-50/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-800 text-sm">
                            {item.product?.name || item.product_name || `Item #${item.id}`}
                          </p>
                          {item.product?.sku && (
                            <p className="text-xs text-gray-400 font-mono">{item.product.sku}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 font-mono">
                          {item.batch_number || '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {item.expiry_date ? formatDate(item.expiry_date) : '—'}
                        </td>
                        <td className={`px-4 py-3 text-sm ${stockStatusColor(item.status)}`}>
                          {item.current_stock ?? 0}
                        </td>
                        <td className="px-4 py-3 text-sm text-amber-600 font-medium">
                          {item.reserved_stock || 0}
                        </td>
                        <td className={`px-4 py-3 text-sm font-semibold ${avail <= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {avail}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${badge.bg} ${badge.text}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => openAdjust(item)}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                          >
                            <HiAdjustments className="w-3.5 h-3.5" />
                            Request Adjustment
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">Page {page} of {totalPages}</p>
                <div className="flex gap-2">
                  <Button size="xs" color="gray" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                    Previous
                  </Button>
                  <Button size="xs" color="gray" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Adjustment Request Modal */}
      <Modal show={!!adjustModal} onClose={() => setAdjustModal(null)} size="md">
        <ModalHeader>Request Stock Adjustment</ModalHeader>
        <ModalBody className="space-y-4">
          {adjustModal && (
            <div className="bg-amber-50 rounded-xl p-3 text-sm">
              <p className="font-semibold text-gray-800">
                {adjustModal.product?.name || adjustModal.product_name}
              </p>
              <p className="text-gray-500 text-xs mt-0.5">
                Current stock: <span className="font-medium">{adjustModal.current_stock ?? 0}</span>
              </p>
            </div>
          )}
          <div>
            <Label htmlFor="req-qty" value="Requested Quantity" className="mb-1.5" />
            <TextInput
              id="req-qty"
              type="number"
              min={1}
              placeholder="Enter quantity to add/adjust"
              value={adjustForm.requested_qty}
              onChange={e => setAdjustForm(f => ({ ...f, requested_qty: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="adj-reason" value="Reason" className="mb-1.5" />
            <Textarea
              id="adj-reason"
              rows={3}
              placeholder="Explain why this adjustment is needed…"
              value={adjustForm.reason}
              onChange={e => setAdjustForm(f => ({ ...f, reason: e.target.value }))}
            />
          </div>
          <p className="text-xs text-gray-400">
            This request will be sent to the Super Admin for approval. Stock will only update after approval.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button
            color="warning"
            onClick={() => setConfirmAdj(true)}
            disabled={!adjustForm.requested_qty || !adjustForm.reason.trim()}
          >
            Submit Request
          </Button>
          <Button color="gray" onClick={() => setAdjustModal(null)}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>

      <ConfirmModal
        show={confirmAdj}
        title="Submit Adjustment Request"
        message="This will send an adjustment request to the admin for approval. Continue?"
        confirmLabel="Submit"
        confirmColor="warning"
        loading={submitting}
        onConfirm={handleAdjustSubmit}
        onClose={() => setConfirmAdj(false)}
      />
    </div>
  );
}
