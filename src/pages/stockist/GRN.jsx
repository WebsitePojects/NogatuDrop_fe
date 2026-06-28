import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/AnimatedModal';
import { useState, useEffect, useCallback } from 'react';
import {
  Button, TextInput, Textarea, Label, Select, Spinner, Tabs, TabItem } from 'flowbite-react';
import { HiPlus, HiX } from 'react-icons/hi';
import { FiCheckCircle, FiAlertTriangle } from 'react-icons/fi';
import ConfirmModal from '@/components/ConfirmModal';
import StatusBadge from '@/components/StatusBadge';
import { ToastContainer, useToast } from '@/components/Toast';
import api from '@/services/api';
import { GRN, WAREHOUSES, PRODUCTS } from '@/services/endpoints';
import { formatDate } from '@/utils/formatDate';
import { formatCurrency } from '@/utils/formatCurrency';

const EMPTY_ITEM = {
  product_id: '',
  expected_qty: '',
  received_qty: '',
  batch_number: '',
  expiry_date: '',
  unit_cost: '',
};

export default function StockistGRN() {
  const { toasts, showToast, dismiss } = useToast();

  const [grns, setGrns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGRN, setSelectedGRN] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [confirmComplete, setConfirmComplete] = useState(null);
  const [completing, setCompleting] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    warehouse_id: '',
    supplier: '',
    delivery_reference: '',
    notes: '',
    items: [{ ...EMPTY_ITEM }],
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchGRNs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(GRN.LIST, { params: { limit: 50 } });
      const list = Array.isArray(data.data) ? data.data : (data.data?.items || []);
      setGrns(list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    } catch {
      showToast('Failed to load GRNs', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOptions = useCallback(async () => {
    try {
      const [wRes, pRes] = await Promise.allSettled([
        api.get(WAREHOUSES.LIST, { params: { limit: 50 } }),
        api.get(PRODUCTS.LIST, { params: { limit: 200 } }),
      ]);
      if (wRes.status === 'fulfilled') {
        const w = wRes.value.data.data?.items || wRes.value.data.data || [];
        setWarehouses(Array.isArray(w) ? w : []);
      }
      if (pRes.status === 'fulfilled') {
        const p = pRes.value.data.data?.items || pRes.value.data.data || [];
        setProducts(Array.isArray(p) ? p : []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchGRNs(); fetchOptions(); }, [fetchGRNs, fetchOptions]);

  const openDetail = async (grn) => {
    setSelectedGRN(grn);
    setDetailLoading(true);
    try {
      const { data } = await api.get(GRN.BY_ID(grn.id));
      setDetailData(data.data);
    } catch {
      showToast('Failed to load GRN details', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!confirmComplete) return;
    setCompleting(true);
    try {
      await api.patch(GRN.COMPLETE(confirmComplete));
      showToast('GRN completed. Stock has been updated.', 'success');
      setConfirmComplete(null);
      setSelectedGRN(null);
      setDetailData(null);
      fetchGRNs();
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to complete GRN', 'error');
    } finally {
      setCompleting(false);
    }
  };

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }));
  const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const updateItem = (i, field, val) =>
    setForm(f => ({ ...f, items: f.items.map((it, idx) => idx === i ? { ...it, [field]: val } : it) }));

  const handleCreate = async () => {
    if (!form.warehouse_id) { showToast('Please select a warehouse', 'warning'); return; }
    if (form.items.some(i => !i.product_id || !i.received_qty)) {
      showToast('Please complete all item fields', 'warning'); return;
    }
    setSubmitting(true);
    try {
      await api.post(GRN.CREATE, {
        warehouse_id: form.warehouse_id,
        supplier: form.supplier,
        delivery_reference: form.delivery_reference,
        notes: form.notes,
        items: form.items.map(i => ({
          product_id: i.product_id,
          expected_qty: parseInt(i.expected_qty) || 0,
          received_qty: parseInt(i.received_qty) || 0,
          batch_number: i.batch_number || null,
          expiry_date: i.expiry_date || null,
          unit_cost: parseFloat(i.unit_cost) || 0,
        })),
      });
      showToast('GRN created successfully', 'success');
      setCreateModal(false);
      setForm({ warehouse_id: '', supplier: '', delivery_reference: '', notes: '', items: [{ ...EMPTY_ITEM }] });
      fetchGRNs();
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to create GRN', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filterByStatus = (statuses) =>
    statuses ? grns.filter(g => statuses.includes(g.status)) : grns;

  const renderTable = (list) => {
    if (loading) {
      return <div className="flex justify-center py-12"><Spinner size="lg" color="warning" /></div>;
    }
    if (list.length === 0) {
      return (
        <div className="flex flex-col items-center py-12 text-gray-400">
          <FiCheckCircle size={36} className="mb-2 opacity-30" />
          <p className="text-sm">No GRNs found</p>
        </div>
      );
    }
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-[var(--dark-card)] border-b border-gray-100 dark:border-[var(--dark-border)]">
            <tr>
              {['GRN #', 'Supplier', 'Warehouse', 'Received By', 'Status', 'Date', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-[var(--dark-muted)] uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map(grn => (
              <tr
                key={grn.id}
                className="border-b border-gray-50 hover:bg-amber-50/30 cursor-pointer transition-colors"
                onClick={() => openDetail(grn)}
              >
                <td className="px-4 py-3 font-mono font-semibold text-xs text-gray-800 dark:text-[var(--dark-text)]">
                  #{grn.grn_number || grn.id}
                </td>
                <td className="px-4 py-3 text-gray-700 dark:text-[var(--dark-text)]">{grn.supplier || '—'}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-[var(--dark-muted)] text-xs">{grn.warehouse_name || '—'}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-[var(--dark-muted)] text-xs">{grn.received_by_name || '—'}</td>
                <td className="px-4 py-3"><StatusBadge status={grn.status} /></td>
                <td className="px-4 py-3 text-gray-500 dark:text-[var(--dark-muted)] text-xs">{formatDate(grn.created_at)}</td>
                <td className="px-4 py-3">
                  <button className="text-xs text-amber-600 hover:text-amber-700 font-medium">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const detail = detailData || selectedGRN;

  return (
    <div className="p-4 md:p-6 min-h-screen page-enter bg-[#FFF8F0] dark:bg-[var(--dark-bg)]">
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-[var(--dark-text)]">Goods Receipt Notes</h1>
          <p className="text-sm text-gray-500 dark:text-[var(--dark-muted)] mt-0.5">Record incoming stock from your supplier</p>
        </div>
        <Button color="warning" onClick={() => setCreateModal(true)}>
          <HiPlus className="mr-2 w-4 h-4" />
          New GRN
        </Button>
      </div>

      <div className="bg-white dark:bg-[var(--dark-card)] rounded-2xl border border-gray-100 dark:border-[var(--dark-border)] shadow-sm overflow-hidden">
        <Tabs aria-label="GRN tabs" variant="underline">
          <TabItem title="All">{renderTable(grns)}</TabItem>
          <TabItem title="Draft">{renderTable(filterByStatus(['draft']))}</TabItem>
          <TabItem title="Completed">{renderTable(filterByStatus(['completed']))}</TabItem>
          <TabItem title="Discrepancy">{renderTable(filterByStatus(['discrepancy']))}</TabItem>
        </Tabs>
      </div>

      {/* GRN Detail Modal */}
      <Modal show={!!selectedGRN} onClose={() => { setSelectedGRN(null); setDetailData(null); }} size="xl" backdropClasses="bg-black/50 backdrop-blur-sm">
        <ModalHeader>
          GRN Details
          {detail?.grn_number && (
            <span className="ml-2 font-mono text-sm font-normal text-gray-500">#{detail.grn_number}</span>
          )}
        </ModalHeader>
        <ModalBody className="space-y-4">
          {detailLoading ? (
            <div className="flex justify-center py-8"><Spinner size="lg" color="warning" /></div>
          ) : detail ? (
            <>
              {/* Header info */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Status', value: <StatusBadge status={detail.status} /> },
                  { label: 'Warehouse', value: detail.warehouse_name || '—' },
                  { label: 'Received By', value: detail.received_by_name || '—' },
                  { label: 'Supplier', value: detail.supplier || '—' },
                  { label: 'Delivery Ref', value: detail.delivery_reference || '—' },
                  { label: 'Date', value: formatDate(detail.created_at) },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 dark:bg-[var(--dark-card2)] rounded-xl p-3">
                    <p className="text-xs text-gray-500 dark:text-[var(--dark-muted)] mb-0.5">{label}</p>
                    <div className="text-sm font-semibold text-gray-900 dark:text-[var(--dark-text)]">{value}</div>
                  </div>
                ))}
              </div>

              {/* Items */}
              {detail.items && detail.items.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-[var(--dark-text)] mb-2">Items</h3>
                  <div className="border border-gray-100 dark:border-[var(--dark-border)] rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-[var(--dark-card)]">
                        <tr>
                          {['Product', 'Expected', 'Received', 'Discrepancy', 'Batch', 'Expiry', 'Unit Cost'].map(h => (
                            <th key={h} className="text-left px-3 py-2 text-xs text-gray-500 dark:text-[var(--dark-muted)] font-semibold">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {detail.items.map((item, i) => {
                          const disc = (item.expected_qty || 0) - (item.received_qty || 0);
                          return (
                            <tr key={i} className="border-t border-gray-50 dark:border-[var(--dark-border)]">
                              <td className="px-3 py-2.5 font-medium text-gray-800 dark:text-[var(--dark-text)]">
                                {item.product_name || `Product #${item.product_id}`}
                              </td>
                              <td className="px-3 py-2.5 text-gray-600 dark:text-[var(--dark-muted)]">{item.expected_qty}</td>
                              <td className="px-3 py-2.5 text-gray-600 dark:text-[var(--dark-muted)]">{item.received_qty}</td>
                              <td className={`px-3 py-2.5 font-semibold ${disc !== 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                {disc !== 0 ? (
                                  <span className="flex items-center gap-1">
                                    <FiAlertTriangle size={13} />
                                    {disc > 0 ? `-${disc}` : `+${Math.abs(disc)}`}
                                  </span>
                                ) : '—'}
                              </td>
                              <td className="px-3 py-2.5 text-xs text-gray-500 dark:text-[var(--dark-muted)] font-mono">{item.batch_number || '—'}</td>
                              <td className="px-3 py-2.5 text-xs text-gray-500 dark:text-[var(--dark-muted)]">
                                {item.expiry_date ? formatDate(item.expiry_date) : '—'}
                              </td>
                              <td className="px-3 py-2.5 text-gray-600 dark:text-[var(--dark-muted)]">
                                {item.unit_cost ? formatCurrency(item.unit_cost) : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Complete button */}
              {detail.status === 'draft' && (
                <div className="pt-2">
                  <Button color="success" onClick={() => setConfirmComplete(detail.id)}>
                    <FiCheckCircle className="mr-2" />
                    Complete GRN
                  </Button>
                </div>
              )}
            </>
          ) : null}
        </ModalBody>
      </Modal>

      {/* Complete Confirm */}
      <ConfirmModal
        show={!!confirmComplete}
        title="Complete GRN"
        message="This will mark the GRN as completed and update inventory stock. Are you sure?"
        confirmLabel="Complete"
        confirmColor="success"
        loading={completing}
        onConfirm={handleComplete}
        onClose={() => setConfirmComplete(null)}
      />

      {/* Create GRN Modal */}
      <Modal show={createModal} onClose={() => setCreateModal(false)} size="2xl" backdropClasses="bg-black/50 backdrop-blur-sm">
        <ModalHeader>Create New GRN</ModalHeader>
        <ModalBody className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label value="Warehouse *" className="mb-1.5" />
              <Select value={form.warehouse_id} onChange={e => setForm(f => ({ ...f, warehouse_id: e.target.value }))}>
                <option value="">Select warehouse…</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </Select>
            </div>
            <div>
              <Label value="Supplier" className="mb-1.5" />
              <TextInput
                placeholder="Supplier name"
                value={form.supplier}
                onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))}
              />
            </div>
            <div>
              <Label value="Delivery Reference" className="mb-1.5" />
              <TextInput
                placeholder="Delivery reference / DR no."
                value={form.delivery_reference}
                onChange={e => setForm(f => ({ ...f, delivery_reference: e.target.value }))}
              />
            </div>
            <div>
              <Label value="Notes" className="mb-1.5" />
              <TextInput
                placeholder="Optional notes"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label value="Items *" />
              <button
                type="button"
                onClick={addItem}
                className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
              >
                <HiPlus className="w-3.5 h-3.5" /> Add Item
              </button>
            </div>

            <div className="space-y-3">
              {form.items.map((item, i) => (
                <div key={i} className="border border-gray-100 dark:border-[var(--dark-border)] rounded-xl p-3 bg-gray-50 dark:bg-[var(--dark-card2)]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-500 dark:text-[var(--dark-muted)]">Item {i + 1}</span>
                    {form.items.length > 1 && (
                      <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600">
                        <HiX className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div className="col-span-2 sm:col-span-3">
                      <Select
                        value={item.product_id}
                        onChange={e => updateItem(i, 'product_id', e.target.value)}
                        sizing="sm"
                      >
                        <option value="">Select product…</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </Select>
                    </div>
                    <div>
                      <Label value="Expected Qty" className="text-xs mb-0.5" />
                      <TextInput
                        type="number" min={0} sizing="sm"
                        placeholder="0"
                        value={item.expected_qty}
                        onChange={e => updateItem(i, 'expected_qty', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label value="Received Qty *" className="text-xs mb-0.5" />
                      <TextInput
                        type="number" min={0} sizing="sm"
                        placeholder="0"
                        value={item.received_qty}
                        onChange={e => updateItem(i, 'received_qty', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label value="Unit Cost" className="text-xs mb-0.5" />
                      <TextInput
                        type="number" min={0} step="0.01" sizing="sm"
                        placeholder="0.00"
                        value={item.unit_cost}
                        onChange={e => updateItem(i, 'unit_cost', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label value="Batch #" className="text-xs mb-0.5" />
                      <TextInput
                        sizing="sm"
                        placeholder="Batch number"
                        value={item.batch_number}
                        onChange={e => updateItem(i, 'batch_number', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label value="Expiry Date" className="text-xs mb-0.5" />
                      <TextInput
                        type="date" sizing="sm"
                        value={item.expiry_date}
                        onChange={e => updateItem(i, 'expiry_date', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="warning" onClick={handleCreate} disabled={submitting}>
            Create GRN
          </Button>
          <Button color="gray" onClick={() => setCreateModal(false)}>Cancel</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
