import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/AnimatedModal';
import { useState, useEffect, useCallback } from 'react';
import {
  Button, Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell, Card, TextInput, Select, Label, Tabs, TabItem, Pagination, Badge } from 'flowbite-react';
import { HiOutlinePlus, HiOutlineArrowRight, HiOutlineSearch, HiOutlineTrash } from 'react-icons/hi';
import api from '@/services/api';
import { STOCK_TRANSFERS, WAREHOUSES, PRODUCTS } from '@/services/endpoints';
import { formatDate } from '@/utils/formatDate';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import ConfirmModal from '@/components/ConfirmModal';
import { ToastContainer, useToast } from '@/components/Toast';

const STATUSES = ['all', 'pending', 'in_transit', 'completed', 'cancelled'];

const EMPTY_FORM = { from_warehouse_id: '', to_warehouse_id: '', notes: '' };

export default function StockTransfers() {
  const { toasts, showToast, dismiss } = useToast();
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null); // { action, transfer }
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [items, setItems] = useState([{ product_id: '', quantity: '' }]);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const statusFilter = STATUSES[activeTab] === 'all' ? '' : STATUSES[activeTab];

  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(STOCK_TRANSFERS.LIST, {
        params: { page, status: statusFilter || undefined, limit: 15 },
      });
      setTransfers(data.data || []);
      setTotalPages(data.pagination?.pages || 1);
    } catch {
      setTransfers([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchTransfers(); }, [fetchTransfers]);

  useEffect(() => {
    Promise.allSettled([
      api.get(WAREHOUSES.LIST, { params: { limit: 100 } }),
      api.get(PRODUCTS.LIST, { params: { limit: 200 } }),
    ]).then(([wRes, pRes]) => {
      if (wRes.status === 'fulfilled') setWarehouses(wRes.value.data.data || []);
      if (pRes.status === 'fulfilled') setProducts(pRes.value.data.data || []);
    });
  }, []);

  const openDetail = async (t) => {
    try {
      const { data } = await api.get(STOCK_TRANSFERS.BY_ID(t.id));
      setSelected(data.data);
    } catch {
      setSelected(t);
    }
    setShowDetailModal(true);
  };

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setItems([{ product_id: '', quantity: '' }]);
    setShowAddModal(true);
  };

  const addItem = () => setItems((prev) => [...prev, { product_id: '', quantity: '' }]);
  const removeItem = (i) => setItems((prev) => prev.filter((_, idx) => idx !== i));
  const updateItem = (i, key, val) => setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, [key]: val } : it));

  const handleAdd = async () => {
    setSubmitting(true);
    try {
      await api.post(STOCK_TRANSFERS.CREATE, {
        ...form,
        items: items.filter((it) => it.product_id && it.quantity),
      });
      showToast('Stock transfer created', 'success');
      setShowAddModal(false);
      fetchTransfers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create transfer', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const executeAction = async () => {
    if (!confirmTarget) return;
    setActionLoading(true);
    try {
      const { action, transfer } = confirmTarget;
      if (action === 'complete') {
        await api.patch(STOCK_TRANSFERS.COMPLETE(transfer.id));
        showToast('Transfer marked as completed', 'success');
      } else if (action === 'in_transit') {
        await api.patch(`/stock-transfers/${transfer.id}/transit`);
        showToast('Transfer marked as in transit', 'success');
      } else if (action === 'cancel') {
        await api.patch(`/stock-transfers/${transfer.id}/cancel`);
        showToast('Transfer cancelled', 'info');
      }
      setConfirmTarget(null);
      setShowDetailModal(false);
      fetchTransfers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Action failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const fld = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="page-enter">
      <PageHeader
        title="Stock Transfers"
        subtitle="Transfer inventory between warehouses"
        actions={[{ label: 'New Transfer', icon: <HiOutlinePlus className="w-4 h-4" />, onClick: openAdd }]}
      />

      <Card>
        <Tabs onActiveTabChange={(i) => { setActiveTab(i); setPage(1); }}>
          {STATUSES.map((s) => (
            <TabItem key={s} title={s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}>
              <div className="overflow-x-auto">
                <Table striped>
                  <TableHead>
                    <TableRow>
                      <TableHeadCell>Transfer #</TableHeadCell>
                      <TableHeadCell>From</TableHeadCell>
                      <TableHeadCell>To</TableHeadCell>
                      <TableHeadCell>Status</TableHeadCell>
                      <TableHeadCell>Items</TableHeadCell>
                      <TableHeadCell>Date</TableHeadCell>
                      <TableHeadCell>Actions</TableHeadCell>
                    </TableRow>
                  </TableHead>
                  <TableBody className="divide-y">
                    {loading ? (
                      Array.from({ length: 6 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 7 }).map((__, j) => (
                            <TableCell key={j}><div className="skeleton h-4 w-full rounded" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : transfers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-gray-400 py-10">No transfers found</TableCell>
                      </TableRow>
                    ) : (
                      transfers.map((t) => (
                        <TableRow key={t.id} className="hover:bg-amber-50/30 cursor-pointer" onClick={() => openDetail(t)}>
                          <TableCell className="font-mono font-medium text-xs text-gray-900 dark:text-[var(--dark-text)]">{t.transfer_number || `TRF-${t.id}`}</TableCell>
                          <TableCell className="text-xs">{t.from_warehouse_name}</TableCell>
                          <TableCell className="text-xs">
                            <span className="flex items-center gap-1">
                              <HiOutlineArrowRight className="w-3 h-3 text-gray-400" />
                              {t.to_warehouse_name}
                            </span>
                          </TableCell>
                          <TableCell><StatusBadge status={t.status} /></TableCell>
                          <TableCell>{t.items_count ?? '—'}</TableCell>
                          <TableCell className="text-xs text-gray-500 dark:text-[var(--dark-muted)]">{formatDate(t.created_at)}</TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Button size="xs" color="light" onClick={() => openDetail(t)}>View</Button>
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

      {/* Add Modal */}
      <Modal show={showAddModal} onClose={() => setShowAddModal(false)} size="lg" backdropClasses="bg-black/50 backdrop-blur-sm">
        <ModalHeader>New Stock Transfer</ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label value="From Warehouse" className="mb-1" />
                <Select value={form.from_warehouse_id} onChange={fld('from_warehouse_id')} required>
                  <option value="">Select...</option>
                  {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </Select>
              </div>
              <div>
                <Label value="To Warehouse" className="mb-1" />
                <Select value={form.to_warehouse_id} onChange={fld('to_warehouse_id')} required>
                  <option value="">Select...</option>
                  {warehouses.filter((w) => w.id !== Number(form.from_warehouse_id)).map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </Select>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label value="Items" />
                <Button size="xs" color="light" onClick={addItem}>
                  <HiOutlinePlus className="w-3 h-3 mr-1" /> Add Item
                </Button>
              </div>
              <div className="space-y-2">
                {items.map((item, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Select
                      className="flex-1"
                      value={item.product_id}
                      onChange={(e) => updateItem(i, 'product_id', e.target.value)}
                    >
                      <option value="">Select product...</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </Select>
                    <TextInput
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                      className="w-24"
                    />
                    {items.length > 1 && (
                      <Button size="xs" color="failure" outline onClick={() => removeItem(i)}>
                        <HiOutlineTrash className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label value="Notes (optional)" className="mb-1" />
              <TextInput value={form.notes} onChange={fld('notes')} placeholder="Any notes..." />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="warning" onClick={handleAdd} disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Transfer'}
          </Button>
          <Button color="gray" onClick={() => setShowAddModal(false)}>Cancel</Button>
        </ModalFooter>
      </Modal>

      {/* Detail Modal */}
      <Modal show={showDetailModal} onClose={() => setShowDetailModal(false)} size="lg" backdropClasses="bg-black/50 backdrop-blur-sm">
        <ModalHeader>Transfer Detail — {selected?.transfer_number || `TRF-${selected?.id}`}</ModalHeader>
        <ModalBody>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-[var(--dark-muted)] text-xs">From</p>
                  <p className="font-semibold dark:text-[var(--dark-text)]">{selected.from_warehouse_name}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-[var(--dark-muted)] text-xs">To</p>
                  <p className="font-semibold dark:text-[var(--dark-text)]">{selected.to_warehouse_name}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-[var(--dark-muted)] text-xs">Status</p>
                  <StatusBadge status={selected.status} />
                </div>
                <div>
                  <p className="text-gray-500 dark:text-[var(--dark-muted)] text-xs">Date</p>
                  <p className="dark:text-[var(--dark-text)]">{formatDate(selected.created_at)}</p>
                </div>
              </div>
              {/* Status Timeline */}
              <div className="flex items-center gap-2 py-2">
                {['pending', 'in_transit', 'completed'].map((s, i) => {
                  const steps = { pending: 0, in_transit: 1, completed: 2 };
                  const cur = steps[selected.status] ?? 0;
                  const stepIdx = i;
                  const done = cur >= stepIdx;
                  return (
                    <div key={s} className="flex items-center gap-2 flex-1">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${done ? 'bg-amber-500 text-white' : 'bg-gray-200 dark:bg-[var(--dark-card2)] text-gray-400'}`}>
                        {stepIdx + 1}
                      </div>
                      <span className={`text-xs capitalize ${done ? 'text-gray-900 dark:text-[var(--dark-text)] font-medium' : 'text-gray-400 dark:text-[var(--dark-muted)]'}`}>
                        {s.replace(/_/g, ' ')}
                      </span>
                      {i < 2 && <div className={`flex-1 h-0.5 ${cur > stepIdx ? 'bg-amber-400' : 'bg-gray-200 dark:bg-[var(--dark-border)]'}`} />}
                    </div>
                  );
                })}
              </div>
              {/* Items */}
              {(selected.items || []).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-[var(--dark-muted)] uppercase mb-2">Items</p>
                  <div className="overflow-x-auto border border-gray-100 dark:border-[var(--dark-border)] rounded-lg">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeadCell>Product</TableHeadCell>
                          <TableHeadCell>Quantity</TableHeadCell>
                        </TableRow>
                      </TableHead>
                      <TableBody className="divide-y">
                        {selected.items.map((it, i) => (
                          <TableRow key={i}>
                            <TableCell>{it.product_name}</TableCell>
                            <TableCell>{it.quantity}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <div className="flex gap-2 flex-wrap">
            {selected?.status === 'pending' && (
              <>
                <Button color="warning" size="sm" onClick={() => setConfirmTarget({ action: 'in_transit', transfer: selected })}>
                  Mark In Transit
                </Button>
                <Button color="failure" size="sm" outline onClick={() => setConfirmTarget({ action: 'cancel', transfer: selected })}>
                  Cancel
                </Button>
              </>
            )}
            {selected?.status === 'in_transit' && (
              <Button color="success" size="sm" onClick={() => setConfirmTarget({ action: 'complete', transfer: selected })}>
                Mark Complete
              </Button>
            )}
            <Button color="gray" size="sm" onClick={() => setShowDetailModal(false)}>Close</Button>
          </div>
        </ModalFooter>
      </Modal>

      {/* Confirm Modal */}
      <ConfirmModal
        show={!!confirmTarget}
        title={
          confirmTarget?.action === 'complete' ? 'Complete Transfer'
          : confirmTarget?.action === 'in_transit' ? 'Mark In Transit'
          : 'Cancel Transfer'
        }
        message={`Confirm this action for transfer ${confirmTarget?.transfer?.transfer_number || `TRF-${confirmTarget?.transfer?.id}`}?`}
        confirmLabel="Confirm"
        confirmColor={confirmTarget?.action === 'cancel' ? 'failure' : 'success'}
        onConfirm={executeAction}
        onClose={() => setConfirmTarget(null)}
        loading={actionLoading}
      />

      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
