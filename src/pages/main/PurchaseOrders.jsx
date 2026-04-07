import { useState, useEffect, useCallback } from 'react';
import {
  Button, Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell,
  Modal, ModalHeader, ModalBody, ModalFooter,
  Card, TextInput, Select, Label, Tabs, TabItem, Pagination, Badge,
} from 'flowbite-react';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineCheck, HiOutlineX } from 'react-icons/hi';
import api from '@/services/api';
import { PURCHASE_ORDERS, PRODUCTS, WAREHOUSES } from '@/services/endpoints';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDate } from '@/utils/formatDate';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import ConfirmModal from '@/components/ConfirmModal';
import { ToastContainer, useToast } from '@/components/Toast';

const STATUSES = ['all', 'pending', 'approved', 'completed', 'rejected'];
const EMPTY_FORM = { supplier: '', warehouse_id: '', notes: '' };

export default function PurchaseOrders() {
  const { toasts, showToast, dismiss } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null); // { action, order }
  const [form, setForm] = useState(EMPTY_FORM);
  const [items, setItems] = useState([{ product_id: '', quantity: '', unit_price: '' }]);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const statusFilter = STATUSES[activeTab] === 'all' ? '' : STATUSES[activeTab];

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(PURCHASE_ORDERS.LIST, {
        params: { page, status: statusFilter || undefined, limit: 15 },
      });
      setOrders(data.data || []);
      setTotalPages(data.pagination?.pages || 1);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    Promise.allSettled([
      api.get(PRODUCTS.LIST, { params: { limit: 200 } }),
      api.get(WAREHOUSES.LIST, { params: { limit: 100 } }),
    ]).then(([pRes, wRes]) => {
      if (pRes.status === 'fulfilled') setProducts(pRes.value.data.data || []);
      if (wRes.status === 'fulfilled') setWarehouses(wRes.value.data.data || []);
    });
  }, []);

  const openDetail = async (o) => {
    try {
      const { data } = await api.get(PURCHASE_ORDERS.BY_ID(o.id));
      setSelected(data.data);
    } catch {
      setSelected(o);
    }
    setShowDetailModal(true);
  };

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setItems([{ product_id: '', quantity: '', unit_price: '' }]);
    setShowAddModal(true);
  };

  const addItem = () => setItems((prev) => [...prev, { product_id: '', quantity: '', unit_price: '' }]);
  const removeItem = (i) => setItems((prev) => prev.filter((_, idx) => idx !== i));
  const updateItem = (i, key, val) => setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, [key]: val } : it));

  const itemsTotal = items.reduce((sum, it) => sum + (Number(it.quantity || 0) * Number(it.unit_price || 0)), 0);

  const handleAdd = async () => {
    setSubmitting(true);
    try {
      await api.post(PURCHASE_ORDERS.CREATE, {
        ...form,
        items: items.filter((it) => it.product_id && it.quantity),
      });
      showToast('Purchase order created', 'success');
      setShowAddModal(false);
      fetchOrders();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create PO', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const executeAction = async () => {
    if (!confirmTarget) return;
    setActionLoading(true);
    try {
      const { action, order } = confirmTarget;
      if (action === 'approve') {
        await api.patch(PURCHASE_ORDERS.APPROVE(order.id));
        showToast('Purchase order approved', 'success');
      } else if (action === 'reject') {
        await api.patch(`/purchase-orders/${order.id}/reject`);
        showToast('Purchase order rejected', 'info');
      }
      setConfirmTarget(null);
      setShowDetailModal(false);
      fetchOrders();
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
        title="Purchase Orders"
        subtitle="Manage stock replenishment orders"
        actions={[{ label: 'Create PO', icon: <HiOutlinePlus className="w-4 h-4" />, onClick: openAdd }]}
      />

      <Card>
        <Tabs onActiveTabChange={(i) => { setActiveTab(i); setPage(1); }}>
          {STATUSES.map((s) => (
            <TabItem key={s} title={s.charAt(0).toUpperCase() + s.slice(1)}>
              <div className="overflow-x-auto">
                <Table striped>
                  <TableHead>
                    <TableHeadCell>PO #</TableHeadCell>
                    <TableHeadCell>Supplier</TableHeadCell>
                    <TableHeadCell>Warehouse</TableHeadCell>
                    <TableHeadCell>Status</TableHeadCell>
                    <TableHeadCell>Auto</TableHeadCell>
                    <TableHeadCell>Total</TableHeadCell>
                    <TableHeadCell>Date</TableHeadCell>
                    <TableHeadCell>Actions</TableHeadCell>
                  </TableHead>
                  <TableBody className="divide-y">
                    {loading ? (
                      Array.from({ length: 6 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 8 }).map((__, j) => (
                            <TableCell key={j}><div className="skeleton h-4 w-full rounded" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : orders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-gray-400 py-10">No purchase orders found</TableCell>
                      </TableRow>
                    ) : (
                      orders.map((o) => (
                        <TableRow key={o.id} className="hover:bg-amber-50/30 cursor-pointer" onClick={() => openDetail(o)}>
                          <TableCell className="font-mono font-medium text-xs">{o.po_number || `PO-${o.id}`}</TableCell>
                          <TableCell className="text-xs">{o.supplier}</TableCell>
                          <TableCell className="text-xs">{o.warehouse_name || '—'}</TableCell>
                          <TableCell><StatusBadge status={o.status} /></TableCell>
                          <TableCell>
                            {o.is_auto_generated ? (
                              <span className="badge-approved">Auto</span>
                            ) : <span className="text-gray-400 text-xs">Manual</span>}
                          </TableCell>
                          <TableCell className="font-semibold text-xs">{formatCurrency(o.total_amount || 0)}</TableCell>
                          <TableCell className="text-xs text-gray-500 dark:text-[var(--dark-muted)]">{formatDate(o.created_at)}</TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Button size="xs" color="light" onClick={() => openDetail(o)}>View</Button>
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
        <ModalHeader>Create Purchase Order</ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label value="Supplier" className="mb-1" />
                <TextInput value={form.supplier} onChange={fld('supplier')} placeholder="Goldenstar Inc." required />
              </div>
              <div>
                <Label value="Destination Warehouse" className="mb-1" />
                <Select value={form.warehouse_id} onChange={fld('warehouse_id')}>
                  <option value="">Select warehouse...</option>
                  {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
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
                    <Select className="flex-1" value={item.product_id} onChange={(e) => updateItem(i, 'product_id', e.target.value)}>
                      <option value="">Product...</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </Select>
                    <TextInput type="number" min="1" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', e.target.value)} className="w-20" />
                    <TextInput type="number" min="0" step="0.01" placeholder="Unit ₱" value={item.unit_price} onChange={(e) => updateItem(i, 'unit_price', e.target.value)} className="w-24" />
                    {items.length > 1 && (
                      <Button size="xs" color="failure" outline onClick={() => removeItem(i)}>
                        <HiOutlineTrash className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-2">
                <p className="text-sm font-bold text-gray-900 dark:text-[var(--dark-text)]">Total: {formatCurrency(itemsTotal)}</p>
              </div>
            </div>
            <div>
              <Label value="Notes" className="mb-1" />
              <TextInput value={form.notes} onChange={fld('notes')} placeholder="Notes..." />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="warning" onClick={handleAdd} disabled={submitting} isProcessing={submitting}>Create PO</Button>
          <Button color="gray" onClick={() => setShowAddModal(false)}>Cancel</Button>
        </ModalFooter>
      </Modal>

      {/* Detail Modal */}
      <Modal show={showDetailModal} onClose={() => setShowDetailModal(false)} size="lg" backdropClasses="bg-black/50 backdrop-blur-sm">
        <ModalHeader>PO Detail — {selected?.po_number || `PO-${selected?.id}`}</ModalHeader>
        <ModalBody>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-gray-500 dark:text-[var(--dark-muted)] text-xs">Supplier</p><p className="font-semibold dark:text-[var(--dark-text)]">{selected.supplier}</p></div>
                <div><p className="text-gray-500 dark:text-[var(--dark-muted)] text-xs">Status</p><StatusBadge status={selected.status} /></div>
                <div><p className="text-gray-500 dark:text-[var(--dark-muted)] text-xs">Date</p><p className="dark:text-[var(--dark-text)]">{formatDate(selected.created_at)}</p></div>
                <div><p className="text-gray-500 dark:text-[var(--dark-muted)] text-xs">Warehouse</p><p className="font-semibold dark:text-[var(--dark-text)]">{selected.warehouse_name || '—'}</p></div>
              </div>
              {(selected.items || []).length > 0 && (
                <div className="overflow-x-auto border border-gray-100 dark:border-[var(--dark-border)] rounded-lg">
                  <Table>
                    <TableHead>
                      <TableHeadCell>Product</TableHeadCell>
                      <TableHeadCell>Qty</TableHeadCell>
                      <TableHeadCell>Unit Price</TableHeadCell>
                      <TableHeadCell>Subtotal</TableHeadCell>
                    </TableHead>
                    <TableBody className="divide-y">
                      {selected.items.map((it, i) => (
                        <TableRow key={i}>
                          <TableCell>{it.product_name}</TableCell>
                          <TableCell>{it.quantity}</TableCell>
                          <TableCell>{formatCurrency(it.unit_price)}</TableCell>
                          <TableCell className="font-semibold">{formatCurrency(it.subtotal || it.quantity * it.unit_price)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <div className="flex justify-end">
                <p className="text-base font-bold">Total: {formatCurrency(selected.total_amount)}</p>
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <div className="flex gap-2">
            {selected?.status === 'pending' && (
              <>
                <Button color="success" size="sm" onClick={() => setConfirmTarget({ action: 'approve', order: selected })}>
                  <HiOutlineCheck className="w-4 h-4 mr-1" /> Approve
                </Button>
                <Button color="failure" size="sm" outline onClick={() => setConfirmTarget({ action: 'reject', order: selected })}>
                  <HiOutlineX className="w-4 h-4 mr-1" /> Reject
                </Button>
              </>
            )}
            <Button color="gray" size="sm" onClick={() => setShowDetailModal(false)}>Close</Button>
          </div>
        </ModalFooter>
      </Modal>

      <ConfirmModal
        show={!!confirmTarget}
        title={confirmTarget?.action === 'approve' ? 'Approve PO' : 'Reject PO'}
        message={`${confirmTarget?.action === 'approve' ? 'Approve' : 'Reject'} purchase order ${confirmTarget?.order?.po_number || `PO-${confirmTarget?.order?.id}`}?`}
        confirmLabel={confirmTarget?.action === 'approve' ? 'Approve' : 'Reject'}
        confirmColor={confirmTarget?.action === 'approve' ? 'success' : 'failure'}
        onConfirm={executeAction}
        onClose={() => setConfirmTarget(null)}
        loading={actionLoading}
      />

      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
