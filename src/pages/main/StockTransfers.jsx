import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/AnimatedModal';
import { useState, useEffect, useCallback } from 'react';
import {
  Button, Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell, Card, TextInput, Select, Label, Tabs, TabItem, Pagination, Badge } from 'flowbite-react';
import { 
  HiOutlinePlus, HiOutlineArrowRight, HiOutlineSearch, HiOutlineTrash,
  HiOutlineLocationMarker, HiOutlineCalendar, HiOutlineX, HiOutlineTruck, HiOutlineCheckCircle
} from 'react-icons/hi';
import React from 'react';
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
      <Modal show={showAddModal} onClose={() => setShowAddModal(false)} size="2xl" backdropClasses="bg-black/50 backdrop-blur-sm">
        <ModalHeader className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 px-6 py-4">
          <span className="text-xl font-bold text-gray-900 dark:text-white">New Stock Transfer</span>
        </ModalHeader>
        <ModalBody className="px-6 py-6">
          <div className="space-y-6">
            <div className="bg-gray-50/50 dark:bg-gray-800/50 p-5 rounded-xl border border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-4 tracking-wide">Route Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">From Warehouse</label>
                  <Select value={form.from_warehouse_id} onChange={fld('from_warehouse_id')} required className="w-full">
                    <option value="">Select origin...</option>
                    {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">To Warehouse</label>
                  <Select value={form.to_warehouse_id} onChange={fld('to_warehouse_id')} required className="w-full">
                    <option value="">Select destination...</option>
                    {warehouses.filter((w) => w.id !== Number(form.from_warehouse_id)).map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 tracking-wide">Transfer Items</h3>
                <Button size="xs" color="light" onClick={addItem} className="font-semibold shadow-sm">
                  <HiOutlinePlus className="w-4 h-4 mr-1.5" /> Add Item
                </Button>
              </div>
              <div className="space-y-3">
                {items.map((item, i) => (
                  <div key={i} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-gray-50 dark:bg-gray-800/40 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                    <div className="flex-1 w-full">
                      <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1 block sm:hidden">Product</label>
                      <Select
                        className="w-full"
                        value={item.product_id}
                        onChange={(e) => updateItem(i, 'product_id', e.target.value)}
                      >
                        <option value="">Select product...</option>
                        {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </Select>
                    </div>
                    <div className="w-full sm:w-32">
                      <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1 block sm:hidden">Quantity</label>
                      <TextInput
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                        className="w-full font-bold"
                      />
                    </div>
                    {items.length > 1 && (
                      <Button size="sm" color="failure" outline onClick={() => removeItem(i)} className="w-full sm:w-auto mt-2 sm:mt-0">
                        <HiOutlineTrash className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">Additional Notes</label>
              <TextInput value={form.notes} onChange={fld('notes')} placeholder="Any optional notes regarding this transfer..." />
            </div>
          </div>
        </ModalBody>
        <ModalFooter className="border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 px-6 py-4 flex justify-end gap-3">
          <Button color="gray" onClick={() => setShowAddModal(false)} className="font-bold shadow-sm">Cancel</Button>
          <Button color="warning" onClick={handleAdd} disabled={submitting} className="font-bold shadow-sm">
            {submitting ? 'Processing...' : 'Create Transfer'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Detail Modal */}
      <Modal show={showDetailModal} onClose={() => setShowDetailModal(false)} size="2xl" backdropClasses="bg-black/50 backdrop-blur-sm">
        <ModalHeader className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 px-6 py-4">
          <div className="flex flex-col">
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              Transfer Detail
            </span>
            {selected && (
              <span className="text-sm font-medium text-gray-500 mt-1 dark:text-gray-400 font-mono tracking-wide">
                {selected.transfer_number || `TRF-${selected.id}`}
              </span>
            )}
          </div>
        </ModalHeader>
        <ModalBody className="px-6 py-6 custom-scrollbar">
          {selected && (
            <div className="space-y-6">
              {/* Info Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-50 dark:bg-gray-800/80 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm col-span-2 md:col-span-1">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wider uppercase mb-1.5 flex items-center gap-1.5">
                    <HiOutlineArrowRight className="w-3 h-3 text-gray-400" /> From
                  </p>
                  <p className="font-bold text-gray-900 dark:text-white text-sm line-clamp-2">
                    {selected.from_warehouse_name}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/80 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm col-span-2 md:col-span-1">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wider uppercase mb-1.5 flex items-center gap-1.5">
                    <HiOutlineLocationMarker className="w-3.5 h-3.5 text-gray-400" /> To
                  </p>
                  <p className="font-bold text-gray-900 dark:text-white text-sm line-clamp-2">
                    {selected.to_warehouse_name}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/80 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wider uppercase mb-1.5">
                    Status
                  </p>
                  <div className="mt-1">
                    <StatusBadge status={selected.status} />
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/80 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wider uppercase mb-1.5 flex items-center gap-1.5">
                    <HiOutlineCalendar className="w-3.5 h-3.5" /> Date
                  </p>
                  <p className="font-bold text-[var(--dark-text)] text-sm">
                    {formatDate(selected.created_at)}
                  </p>
                </div>
              </div>

              {/* Status Timeline */}
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl p-5 shadow-sm overflow-x-auto">
                <div className="flex items-center min-w-[400px]">
                  {['pending', 'in_transit', 'completed'].map((s, i) => {
                    const steps = { pending: 0, in_transit: 1, completed: 2, cancelled: -1 };
                    const cur = steps[selected.status] ?? 0;
                    const stepIdx = i;
                    const done = cur >= stepIdx;
                    const isCancelled = selected.status === 'cancelled';
                    
                    return (
                      <React.Fragment key={s}>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold flex-shrink-0 transition-colors shadow-sm
                            ${isCancelled ? 'bg-red-100 text-red-500 dark:bg-red-900/30' 
                            : done 
                              ? 'bg-amber-500 text-white shadow-amber-200 dark:shadow-none' 
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-400 border border-gray-200 dark:border-gray-700'}`}>
                            {isCancelled ? <HiOutlineX className="w-4 h-4" /> : stepIdx + 1}
                          </div>
                          <span className={`text-xs font-bold tracking-wide uppercase 
                            ${isCancelled ? 'text-red-500' 
                            : done ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                            {s.replace(/_/g, ' ')}
                          </span>
                        </div>
                        {i < 2 && (
                          <div className={`flex-1 mx-3 h-0.5 rounded-full transition-colors 
                            ${isCancelled ? 'bg-red-200 dark:bg-red-900/50' 
                            : cur > stepIdx ? 'bg-amber-400' : 'bg-gray-100 dark:bg-gray-700'}`} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Items List */}
              {(selected.items || []).length > 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                  <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
                    <h3 className="text-sm font-bold tracking-wider text-gray-700 dark:text-gray-300 uppercase">Transfer Items</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400 tracking-wide">
                      <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">
                        <tr>
                          <th className="px-5 py-3 rounded-bl-none">Product</th>
                          <th className="px-5 py-3 text-right">Quantity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {selected.items.map((it, i) => (
                          <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                            <td className="px-5 py-4 font-medium text-gray-900 dark:text-gray-200">{it.product_name}</td>
                            <td className="px-5 py-4 text-right font-black text-gray-900 dark:text-white">{it.quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-200 dark:border-gray-700 flex justify-end items-center">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mr-4 tracking-wider">Total Items</span>
                    <span className="text-lg font-black text-[var(--dark-text)] dark:text-white tracking-tight">
                      {selected.items.reduce((sum, it) => sum + Number(it.quantity), 0)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </ModalBody>
        <ModalFooter className="border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 px-6 py-4 flex flex-wrap justify-between items-center gap-3">
          <div className="flex gap-2 items-center flex-wrap">
            {selected?.status === 'pending' && (
              <>
                <Button color="warning" onClick={() => setConfirmTarget({ action: 'in_transit', transfer: selected })} className="font-bold shadow-sm">
                  <HiOutlineTruck className="w-5 h-5 mr-1.5" /> Mark In Transit
                </Button>
                <Button color="failure" outline onClick={() => setConfirmTarget({ action: 'cancel', transfer: selected })} className="font-bold bg-white dark:bg-transparent">
                  Cancel
                </Button>
              </>
            )}
            {selected?.status === 'in_transit' && (
              <Button color="success" onClick={() => setConfirmTarget({ action: 'complete', transfer: selected })} className="font-bold shadow-sm">
                <HiOutlineCheckCircle className="w-5 h-5 mr-1.5" /> Mark Complete
              </Button>
            )}
          </div>
          <Button color="gray" onClick={() => setShowDetailModal(false)} className="font-bold shadow-sm">Close</Button>
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
