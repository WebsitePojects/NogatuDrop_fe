import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
  Textarea,
} from 'flowbite-react';
import { HiOutlineClipboardCheck, HiOutlineEye } from 'react-icons/hi';
import api from '@/services/api';
import { CYCLE_COUNTS } from '@/services/endpoints';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import { ToastContainer, useToast } from '@/components/Toast';
import { formatDateTime } from '@/utils/formatDate';

export default function MainCycleCounts() {
  const { toasts, showToast, dismiss } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewAction, setReviewAction] = useState('approve');
  const [reviewing, setReviewing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(CYCLE_COUNTS.LIST, { params: { limit: 100 } });
      setRows(data.data || []);
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to load cycle counts', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openReview = async (row, action = 'approve') => {
    setReviewLoading(true);
    setReviewAction(action);
    setReviewNotes('');
    try {
      const { data } = await api.get(CYCLE_COUNTS.BY_ID(row.id));
      setReviewTarget(data.data);
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to load cycle count detail', 'error');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleReview = async () => {
    if (!reviewTarget) return;
    const endpoint = reviewAction === 'approve'
      ? CYCLE_COUNTS.APPROVE(reviewTarget.id)
      : CYCLE_COUNTS.REJECT(reviewTarget.id);

    setReviewing(true);
    try {
      await api.patch(endpoint, { review_notes: reviewNotes });
      showToast(`Cycle count ${reviewAction}d`, 'success');
      setReviewTarget(null);
      setReviewNotes('');
      await load();
    } catch (err) {
      showToast(err?.response?.data?.message || `Failed to ${reviewAction} cycle count`, 'error');
    } finally {
      setReviewing(false);
    }
  };

  const varianceSummary = useMemo(() => {
    if (!reviewTarget?.items?.length) {
      return { increase: 0, decrease: 0, net: 0 };
    }

    return reviewTarget.items.reduce((acc, item) => {
      const variance = Number(item.variance_qty || 0);
      if (variance > 0) acc.increase += variance;
      if (variance < 0) acc.decrease += Math.abs(variance);
      acc.net += variance;
      return acc;
    }, { increase: 0, decrease: 0, net: 0 });
  }, [reviewTarget]);

  return (
    <div className="page-enter">
      <ToastContainer toasts={toasts} dismiss={dismiss} />
      <PageHeader title="Cycle Count Approvals" subtitle="Review submitted counts before inventory is adjusted in production" />

      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-16"><Spinner size="xl" color="warning" /></div>
        ) : rows.length === 0 ? (
          <EmptyState icon={HiOutlineClipboardCheck} title="No cycle counts" description="Submitted counts will appear here for review." />
        ) : (
          <div className="overflow-x-auto">
            <Table striped>
              <TableHead>
                <TableHeadCell>Count No</TableHeadCell>
                <TableHeadCell>Warehouse</TableHeadCell>
                <TableHeadCell>Status</TableHeadCell>
                <TableHeadCell>Created By</TableHeadCell>
                <TableHeadCell>Submitted</TableHeadCell>
                <TableHeadCell />
              </TableHead>
              <TableBody className="divide-y">
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{row.count_number}</TableCell>
                    <TableCell>{row.warehouse_name}</TableCell>
                    <TableCell><StatusBadge status={row.status} /></TableCell>
                    <TableCell>{row.created_by_name}</TableCell>
                    <TableCell className="text-xs">{row.submitted_at ? formatDateTime(row.submitted_at) : '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="xs" color="light" onClick={() => openReview(row, 'approve')}>
                          <HiOutlineEye className="mr-1 h-3.5 w-3.5" />
                          View
                        </Button>
                        {row.status === 'submitted' && (
                          <>
                            <Button size="xs" color="success" onClick={() => openReview(row, 'approve')}>
                              Approve
                            </Button>
                            <Button size="xs" color="failure" onClick={() => openReview(row, 'reject')}>
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <Modal show={reviewLoading || !!reviewTarget} onClose={() => setReviewTarget(null)} size="7xl" backdropClasses="bg-black/60 backdrop-blur-sm">
        <ModalHeader>
          {reviewTarget?.count_number || 'Cycle Count Review'}
        </ModalHeader>
        <ModalBody>
          {reviewLoading || !reviewTarget ? (
            <div className="flex items-center justify-center py-16"><Spinner size="xl" color="warning" /></div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-5">
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Warehouse</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">{reviewTarget.warehouse_name}</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Status</p>
                  <div className="mt-1"><StatusBadge status={reviewTarget.status} /></div>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Total Increase</p>
                  <p className="mt-1 text-sm font-semibold text-emerald-600">+{varianceSummary.increase}</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Total Decrease</p>
                  <p className="mt-1 text-sm font-semibold text-red-600">-{varianceSummary.decrease}</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Net Variance</p>
                  <p className={`mt-1 text-sm font-semibold ${varianceSummary.net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {varianceSummary.net > 0 ? '+' : ''}{varianceSummary.net}
                  </p>
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
                    <TableHeadCell>Reserved</TableHeadCell>
                    <TableHeadCell>Notes</TableHeadCell>
                  </TableHead>
                  <TableBody className="divide-y">
                    {reviewTarget.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.product_name}</TableCell>
                        <TableCell className="font-mono text-xs text-gray-500">{item.sku}</TableCell>
                        <TableCell>{item.system_qty}</TableCell>
                        <TableCell>{item.counted_qty}</TableCell>
                        <TableCell className={Number(item.variance_qty) >= 0 ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
                          {Number(item.variance_qty) > 0 ? '+' : ''}{item.variance_qty}
                        </TableCell>
                        <TableCell>{item.reserved_stock || 0}</TableCell>
                        <TableCell className="text-xs text-gray-500">{item.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {reviewTarget.status === 'submitted' && (
                <Textarea rows={4} value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="Approval or rejection notes" />
              )}
            </div>
          )}
        </ModalBody>
        {reviewTarget && (
          <ModalFooter>
            {reviewTarget.status === 'submitted' ? (
              <>
                <Button color={reviewAction === 'approve' ? 'success' : 'failure'} onClick={handleReview} disabled={reviewing}>
                  {reviewAction === 'approve' ? 'Approve Count' : 'Reject Count'}
                </Button>
                <Button color="light" onClick={() => setReviewAction((prev) => prev === 'approve' ? 'reject' : 'approve')} disabled={reviewing}>
                  Switch To {reviewAction === 'approve' ? 'Reject' : 'Approve'}
                </Button>
              </>
            ) : null}
            <Button color="gray" onClick={() => setReviewTarget(null)}>Close</Button>
          </ModalFooter>
        )}
      </Modal>
    </div>
  );
}
