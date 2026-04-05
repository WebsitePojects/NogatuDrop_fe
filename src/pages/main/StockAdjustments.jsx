import { useState, useEffect, useCallback } from 'react';
import {
  Button, Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell,
  Modal, ModalHeader, ModalBody, ModalFooter,
  Card, TextInput, Select, Label, Tabs, TabItem, Pagination, Textarea,
} from 'flowbite-react';
import { HiOutlinePlus, HiOutlineCheck, HiOutlineX, HiOutlineAdjustments } from 'react-icons/hi';
import api from '@/services/api';
import { STOCK_ADJUSTMENTS, INVENTORY } from '@/services/endpoints';
import { formatDate } from '@/utils/formatDate';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import ConfirmModal from '@/components/ConfirmModal';
import { ToastContainer, useToast } from '@/components/Toast';

const STATUSES = ['pending', 'approved', 'rejected', 'all'];
const EMPTY_FORM = { inventory_id: '', type: 'add', quantity: '', reason: '' };

export default function StockAdjustments() {
  const { toasts, showToast, dismiss } = useToast();
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [inventory, setInventory] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const statusFilter = STATUSES[activeTab] === 'all' ? '' : STATUSES[activeTab];

  const fetchAdj = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(STOCK_ADJUSTMENTS.LIST, {
        params: { page, status: statusFilter || undefined, limit: 15 },
      });
      setAdjustments(data.data || []);
      setTotalPages(data.pagination?.pages || 1);
    } catch {
      setAdjustments([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchAdj(); }, [fetchAdj]);

  useEffect(() => {
    api.get(INVENTORY.LIST, { params: { limit: 500 } })
      .then((r) => setInventory(r.data.data || []))
      .catch(() => {});
  }, []);

  const openDetail = (a) => { setSelected(a); setShowDetailModal(true); };

  const handleAdd = async () => {
    setSubmitting(true);
    try {
      await api.post(STOCK_ADJUSTMENTS.CREATE, form);
      showToast('Adjustment request submitted', 'success');
      setShowAddModal(false);
      fetchAdj();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const executeApprove = async () => {
    setActionLoading(true);
    try {
      await api.patch(STOCK_ADJUSTMENTS.APPROVE(confirmTarget.id));
      showToast('Adjustment approved', 'success');
      setConfirmTarget(null);
      setShowDetailModal(false);
      fetchAdj();
    } catch (err) {
      showToast(err.response?.data?.message || 'Approval failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const executeReject = async () => {
    setActionLoading(true);
    try {
      await api.patch(`/stock-adjustments/${selected.id}/reject`, { reason: rejectReason });
      showToast('Adjustment rejected', 'info');
      setShowRejectModal(false);
      setShowDetailModal(false);
      fetchAdj();
    } catch (err) {
      showToast(err.response?.data?.message || 'Rejection failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const fld = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const typeBadge = (type) => {
    const m = { add: 'badge-paid', subtract: 'badge-rejected', set: 'badge-approved' };
    return <span className={m[type] || 'badge-inactive'}>{type}</span>;
  };

  return (
    <div className="page-enter">
      <PageHeader
        title="Stock Adjustments"
        subtitle="Review and approve inventory adjustment requests"
        actions={[{ label: 'Request Adjustment', icon: <HiOutlinePlus className="w-4 h-4" />, onClick: () => { setForm(EMPTY_FORM); setShowAddModal(true); } }]}
      />

      <Card>
        <Tabs onActiveTabChange={(i) => { setActiveTab(i); setPage(1); }}>
          {STATUSES.map((s) => (
            <TabItem key={s} title={s.charAt(0).toUpperCase() + s.slice(1)}>
              <div className="overflow-x-auto">
                <Table striped>
                  <TableHead>
                    <TableHeadCell>Date</TableHeadCell>
                    <TableHeadCell>Product</TableHeadCell>
                    <TableHeadCell>Warehouse</TableHeadCell>
                    <TableHeadCell>Type</TableHeadCell>
                    <TableHeadCell>Quantity</TableHeadCell>
                    <TableHeadCell>Reason</TableHeadCell>
                    <TableHeadCell>Requested By</TableHeadCell>
                    <TableHeadCell>Status</TableHeadCell>
                    <TableHeadCell>Actions</TableHeadCell>
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
                    ) : adjustments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9}>
                          <EmptyState icon={HiOutlineAdjustments} title="No adjustments" description="No adjustment requests in this category" />
                        </TableCell>
                      </TableRow>
                    ) : (
                      adjustments.map((a) => (
                        <TableRow key={a.id} className="hover:bg-amber-50/30 cursor-pointer" onClick={() => openDetail(a)}>
                          <TableCell className="text-xs text-gray-500">{formatDate(a.created_at)}</TableCell>
                          <TableCell className="font-medium text-gray-900 text-xs">{a.product_name}</TableCell>
                          <TableCell className="text-xs">{a.warehouse_name}</TableCell>
                          <TableCell>{typeBadge(a.type)}</TableCell>
                          <TableCell className="font-semibold">{a.quantity}</TableCell>
                          <TableCell className="text-xs text-gray-600 max-w-xs truncate">{a.reason || '—'}</TableCell>
                          <TableCell className="text-xs">{a.requested_by_name || '—'}</TableCell>
                          <TableCell><StatusBadge status={a.status} /></TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-1">
                              {a.status === 'pending' && (
                                <>
                                  <Button size="xs" color="success" onClick={() => setConfirmTarget(a)}>
                                    <HiOutlineCheck className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button size="xs" color="failure" onClick={() => { setSelected(a); setRejectReason(''); setShowRejectModal(true); }}>
                                    <HiOutlineX className="w-3.5 h-3.5" />
                                  </Button>
                                </>
                              )}
                            </div>
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
      <Modal show={showAddModal} onClose={() => setShowAddModal(false)} size="md">
        <ModalHeader>Request Stock Adjustment</ModalHeader>
        <ModalBody>
          <div className="space-y-3">
            <div>
              <Label value="Inventory Item" className="mb-1" />
              <Select value={form.inventory_id} onChange={fld('inventory_id')} required>
                <option value="">Select inventory item...</option>
                {inventory.map((i) => (
                  <option key={i.id} value={i.id}>{i.product_name} — {i.warehouse_name} ({i.current_stock})</option>
                ))}
              </Select>
            </div>
            <div>
              <Label value="Adjustment Type" className="mb-1" />
              <Select value={form.type} onChange={fld('type')}>
                <option value="add">Add (increase stock)</option>
                <option value="subtract">Subtract (decrease stock)</option>
                <option value="set">Set (exact value)</option>
              </Select>
            </div>
            <div>
              <Label value="Quantity" className="mb-1" />
              <TextInput type="number" min="0" value={form.quantity} onChange={fld('quantity')} placeholder="0" required />
            </div>
            <div>
              <Label value="Reason" className="mb-1" />
              <Textarea value={form.reason} onChange={fld('reason')} rows={2} placeholder="Explain the reason for this adjustment..." />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="warning" onClick={handleAdd} disabled={submitting} isProcessing={submitting}>Submit Request</Button>
          <Button color="gray" onClick={() => setShowAddModal(false)}>Cancel</Button>
        </ModalFooter>
      </Modal>

      {/* Detail Modal */}
      <Modal show={showDetailModal} onClose={() => setShowDetailModal(false)} size="md">
        <ModalHeader>Adjustment Detail</ModalHeader>
        <ModalBody>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-gray-500 text-xs">Product</p><p className="font-semibold">{selected.product_name}</p></div>
                <div><p className="text-gray-500 text-xs">Warehouse</p><p className="font-semibold">{selected.warehouse_name}</p></div>
                <div><p className="text-gray-500 text-xs">Type</p>{typeBadge(selected.type)}</div>
                <div><p className="text-gray-500 text-xs">Quantity</p><p className="font-bold text-lg">{selected.quantity}</p></div>
                <div><p className="text-gray-500 text-xs">Status</p><StatusBadge status={selected.status} /></div>
                <div><p className="text-gray-500 text-xs">Requested By</p><p>{selected.requested_by_name || '—'}</p></div>
                <div className="col-span-2"><p className="text-gray-500 text-xs">Reason</p><p>{selected.reason || '—'}</p></div>
              </div>
            </div>
          )}
        </ModalBody>
        {selected?.status === 'pending' && (
          <ModalFooter>
            <Button color="success" size="sm" onClick={() => setConfirmTarget(selected)}>
              <HiOutlineCheck className="w-4 h-4 mr-1" /> Approve
            </Button>
            <Button color="failure" size="sm" outline onClick={() => { setRejectReason(''); setShowRejectModal(true); }}>
              <HiOutlineX className="w-4 h-4 mr-1" /> Reject
            </Button>
            <Button color="gray" size="sm" onClick={() => setShowDetailModal(false)}>Close</Button>
          </ModalFooter>
        )}
      </Modal>

      {/* Approve Confirm */}
      <ConfirmModal
        show={!!confirmTarget}
        title="Approve Adjustment"
        message={`Approve this stock adjustment for ${confirmTarget?.product_name}? This will modify the actual inventory count.`}
        confirmLabel="Approve"
        confirmColor="success"
        onConfirm={executeApprove}
        onClose={() => setConfirmTarget(null)}
        loading={actionLoading}
      />

      {/* Reject Modal */}
      <Modal show={showRejectModal} onClose={() => setShowRejectModal(false)} size="sm">
        <ModalHeader>Reject Adjustment</ModalHeader>
        <ModalBody>
          <Label value="Reason for rejection" className="mb-1" />
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} placeholder="Reason..." />
        </ModalBody>
        <ModalFooter>
          <Button color="failure" onClick={executeReject} disabled={actionLoading} isProcessing={actionLoading}>Reject</Button>
          <Button color="gray" onClick={() => setShowRejectModal(false)}>Cancel</Button>
        </ModalFooter>
      </Modal>

      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
