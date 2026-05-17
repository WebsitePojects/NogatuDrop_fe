import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Select,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
  TextInput,
  Textarea,
} from 'flowbite-react';
import { HiOutlineClipboardCheck, HiOutlineEye, HiOutlinePencilAlt, HiOutlinePlus, HiOutlineSave } from 'react-icons/hi';
import api from '@/services/api';
import { CYCLE_COUNTS, WAREHOUSES } from '@/services/endpoints';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import { ToastContainer, useToast } from '@/components/Toast';
import { formatDateTime } from '@/utils/formatDate';

const EMPTY_FORM = { warehouse_id: '', notes: '' };

export default function StockistCycleCounts() {
  const { toasts, showToast, dismiss } = useToast();
  const [rows, setRows] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [savingItems, setSavingItems] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [countsRes, whRes] = await Promise.all([
        api.get(CYCLE_COUNTS.LIST, { params: { limit: 50 } }),
        api.get(WAREHOUSES.LIST, { params: { limit: 100 } }),
      ]);
      setRows(countsRes.data.data || []);
      setWarehouses(whRes.data.data || []);
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to load cycle counts', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openDetail = async (row) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      const { data } = await api.get(CYCLE_COUNTS.BY_ID(row.id));
      setDetail(data.data);
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to load cycle count', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.warehouse_id) {
      showToast('Warehouse is required', 'warning');
      return;
    }

    setCreating(true);
    try {
      await api.post(CYCLE_COUNTS.CREATE, form);
      showToast('Cycle count created', 'success');
      setShowCreate(false);
      setForm(EMPTY_FORM);
      await load();
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to create cycle count', 'error');
    } finally {
      setCreating(false);
    }
  };

  const updateDetailItem = (itemId, patch) => {
    setDetail((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((item) => (
          item.id === itemId
            ? {
                ...item,
                ...patch,
                variance_qty: Number((patch.counted_qty ?? item.counted_qty) || 0) - Number(item.system_qty || 0),
              }
            : item
        )),
      };
    });
  };

  const saveDraftItems = async () => {
    if (!detail) return false;
    setSavingItems(true);
    try {
      await api.patch(CYCLE_COUNTS.UPDATE_ITEMS(detail.id), {
        items: detail.items.map((item) => ({
          id: item.id,
          counted_qty: Number(item.counted_qty || 0),
          notes: item.notes || '',
        })),
      });
      const { data } = await api.get(CYCLE_COUNTS.BY_ID(detail.id));
      setDetail(data.data);
      await load();
      showToast('Cycle count lines saved', 'success');
      return true;
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to save cycle count lines', 'error');
      return false;
    } finally {
      setSavingItems(false);
    }
  };

  const submitCount = async () => {
    if (!detail) return;
    setSubmitting(true);
    try {
      const saved = await saveDraftItems();
      if (!saved) return;
      await api.patch(CYCLE_COUNTS.SUBMIT(detail.id));
      showToast('Cycle count submitted for approval', 'success');
      setDetail(null);
      await load();
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to submit cycle count', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const varianceSummary = useMemo(() => {
    if (!detail?.items?.length) {
      return { increase: 0, decrease: 0, net: 0 };
    }

    return detail.items.reduce((acc, item) => {
      const variance = Number(item.variance_qty || 0);
      if (variance > 0) acc.increase += variance;
      if (variance < 0) acc.decrease += Math.abs(variance);
      acc.net += variance;
      return acc;
    }, { increase: 0, decrease: 0, net: 0 });
  }, [detail]);

  return (
    <div className="page-enter">
      <ToastContainer toasts={toasts} dismiss={dismiss} />
      <PageHeader
        title="Cycle Counts"
        subtitle="Prepare physical counts, record variances, and submit them for approval"
        actions={[{ label: 'New Count', icon: <HiOutlinePlus className="w-4 h-4" />, onClick: () => setShowCreate(true) }]}
      />

      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-16"><Spinner size="xl" color="warning" /></div>
        ) : rows.length === 0 ? (
          <EmptyState icon={HiOutlineClipboardCheck} title="No cycle counts" description="Create a warehouse count and fill in the actual quantities before submission." />
        ) : (
          <div className="overflow-x-auto">
            <Table striped>
              <TableHead>
                <TableHeadCell>Count No</TableHeadCell>
                <TableHeadCell>Warehouse</TableHeadCell>
                <TableHeadCell>Status</TableHeadCell>
                <TableHeadCell>Created</TableHeadCell>
                <TableHeadCell>Notes</TableHeadCell>
                <TableHeadCell />
              </TableHead>
              <TableBody className="divide-y">
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{row.count_number}</TableCell>
                    <TableCell>{row.warehouse_name}</TableCell>
                    <TableCell><StatusBadge status={row.status} /></TableCell>
                    <TableCell className="text-xs">{formatDateTime(row.created_at)}</TableCell>
                    <TableCell className="text-xs text-gray-500">{row.notes || '-'}</TableCell>
                    <TableCell>
                      <Button size="xs" color={row.status === 'draft' ? 'warning' : 'light'} onClick={() => openDetail(row)}>
                        {row.status === 'draft' ? <HiOutlinePencilAlt className="mr-1 h-3.5 w-3.5" /> : <HiOutlineEye className="mr-1 h-3.5 w-3.5" />}
                        {row.status === 'draft' ? 'Open' : 'View'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <Modal show={showCreate} onClose={() => setShowCreate(false)} size="md" backdropClasses="bg-black/50 backdrop-blur-sm">
        <ModalHeader>Create Cycle Count</ModalHeader>
        <ModalBody className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Warehouse</label>
            <Select value={form.warehouse_id} onChange={(e) => setForm((prev) => ({ ...prev, warehouse_id: e.target.value }))}>
              <option value="">Select warehouse</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
            <Textarea rows={4} value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Shift, team, or count context" />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="warning" onClick={handleCreate} disabled={creating}>Create</Button>
          <Button color="gray" onClick={() => setShowCreate(false)}>Cancel</Button>
        </ModalFooter>
      </Modal>

      <Modal show={detailLoading || !!detail} onClose={() => setDetail(null)} size="7xl" backdropClasses="bg-black/60 backdrop-blur-sm">
        <ModalHeader>{detail?.count_number || 'Cycle Count'}</ModalHeader>
        <ModalBody>
          {detailLoading || !detail ? (
            <div className="flex items-center justify-center py-16"><Spinner size="xl" color="warning" /></div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Warehouse</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">{detail.warehouse_name}</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Status</p>
                  <div className="mt-1"><StatusBadge status={detail.status} /></div>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Total Increase</p>
                  <p className="mt-1 text-sm font-semibold text-emerald-600">+{varianceSummary.increase}</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Total Decrease</p>
                  <p className="mt-1 text-sm font-semibold text-red-600">-{varianceSummary.decrease}</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table striped>
                  <TableHead>
                    <TableHeadCell>Product</TableHeadCell>
                    <TableHeadCell>SKU</TableHeadCell>
                    <TableHeadCell>System Qty</TableHeadCell>
                    <TableHeadCell>Counted Qty</TableHeadCell>
                    <TableHeadCell>Variance</TableHeadCell>
                    <TableHeadCell>Notes</TableHeadCell>
                  </TableHead>
                  <TableBody className="divide-y">
                    {detail.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.product_name}</TableCell>
                        <TableCell className="font-mono text-xs text-gray-500">{item.sku}</TableCell>
                        <TableCell>{item.system_qty}</TableCell>
                        <TableCell className="min-w-32">
                          {detail.status === 'draft' ? (
                            <TextInput
                              type="number"
                              min={0}
                              value={item.counted_qty}
                              onChange={(e) => updateDetailItem(item.id, { counted_qty: e.target.value })}
                            />
                          ) : (
                            item.counted_qty
                          )}
                        </TableCell>
                        <TableCell className={Number(item.variance_qty) >= 0 ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
                          {Number(item.variance_qty) > 0 ? '+' : ''}{item.variance_qty}
                        </TableCell>
                        <TableCell className="min-w-56">
                          {detail.status === 'draft' ? (
                            <Textarea rows={2} value={item.notes || ''} onChange={(e) => updateDetailItem(item.id, { notes: e.target.value })} />
                          ) : (
                            <span className="text-xs text-gray-500">{item.notes || '-'}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </ModalBody>
        {detail && (
          <ModalFooter>
            {detail.status === 'draft' ? (
              <>
                <Button color="light" onClick={saveDraftItems} disabled={savingItems || submitting}>
                  <HiOutlineSave className="mr-1 h-4 w-4" />
                  Save Draft
                </Button>
                <Button color="warning" onClick={submitCount} disabled={savingItems || submitting}>
                  Submit For Approval
                </Button>
              </>
            ) : null}
            <Button color="gray" onClick={() => setDetail(null)}>Close</Button>
          </ModalFooter>
        )}
      </Modal>
    </div>
  );
}
