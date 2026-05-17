import { useEffect, useState } from 'react';
import { Button, Card, Modal, ModalBody, ModalFooter, ModalHeader, Select, Spinner, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow, TextInput, Textarea } from 'flowbite-react';
import { HiOutlineCurrencyDollar, HiOutlineDownload } from 'react-icons/hi';
import api from '@/services/api';
import { EXPORTS, SETTLEMENTS } from '@/services/endpoints';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import { ToastContainer, useToast } from '@/components/Toast';
import { formatDateTime } from '@/utils/formatDate';
import { formatCurrency } from '@/utils/formatCurrency';

export default function MainSettlements() {
  const { toasts, showToast, dismiss } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [form, setForm] = useState({ status: 'reconciled', reference_number: '', variance_amount: '0', notes: '' });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(SETTLEMENTS.LIST, { params: { limit: 100 } });
      setRows(data.data || []);
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to load settlements', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const downloadCsv = async () => {
    try {
      const { data } = await api.get(EXPORTS.SETTLEMENTS);
      const payload = data.data;
      const blob = new Blob([payload.content], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = payload.filename;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`Signed export ${payload.export_number} generated`, 'success');
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to export settlements', 'error');
    }
  };

  const handleReconcile = async () => {
    if (!reviewTarget) return;
    try {
      await api.patch(SETTLEMENTS.RECONCILE(reviewTarget.id), {
        ...form,
        variance_amount: Number(form.variance_amount || 0),
      });
      showToast('Settlement updated', 'success');
      setReviewTarget(null);
      setForm({ status: 'reconciled', reference_number: '', variance_amount: '0', notes: '' });
      await load();
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to update settlement', 'error');
    }
  };

  return (
    <div className="page-enter">
      <ToastContainer toasts={toasts} dismiss={dismiss} />
      <PageHeader
        title="Settlements"
        subtitle="Paid-order reconciliation with governed export trail"
        actions={[{ label: 'Export CSV', icon: <HiOutlineDownload className="w-4 h-4" />, onClick: downloadCsv, color: 'light' }]}
      />

      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-16"><Spinner size="xl" color="warning" /></div>
        ) : rows.length === 0 ? (
          <EmptyState icon={HiOutlineCurrencyDollar} title="No settlements" description="Verified payments will generate pending settlements." />
        ) : (
          <div className="overflow-x-auto">
            <Table striped>
              <TableHead>
                <TableHeadCell>Settlement</TableHeadCell>
                <TableHeadCell>Order</TableHeadCell>
                <TableHeadCell>Stockist</TableHeadCell>
                <TableHeadCell>Amount</TableHeadCell>
                <TableHeadCell>Status</TableHeadCell>
                <TableHeadCell>Method</TableHeadCell>
                <TableHeadCell>Expected</TableHeadCell>
                <TableHeadCell />
              </TableHead>
              <TableBody className="divide-y">
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{row.settlement_number}</TableCell>
                    <TableCell className="font-mono text-xs">#{row.order_number}</TableCell>
                    <TableCell>{row.partner_name}</TableCell>
                    <TableCell>{formatCurrency(row.amount)}</TableCell>
                    <TableCell><StatusBadge status={row.status} /></TableCell>
                    <TableCell>{row.method}</TableCell>
                    <TableCell className="text-xs">{row.expected_at ? formatDateTime(row.expected_at) : '—'}</TableCell>
                    <TableCell>
                      {row.status === 'pending' && (
                        <Button size="xs" color="warning" onClick={() => setReviewTarget(row)}>
                          Review
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <Modal show={!!reviewTarget} onClose={() => setReviewTarget(null)} size="md" backdropClasses="bg-black/50 backdrop-blur-sm">
        <ModalHeader>Update Settlement</ModalHeader>
        <ModalBody className="space-y-4">
          <Select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}>
            <option value="reconciled">Reconciled</option>
            <option value="disputed">Disputed</option>
            <option value="cancelled">Cancelled</option>
          </Select>
          <TextInput value={form.reference_number} onChange={(e) => setForm((prev) => ({ ...prev, reference_number: e.target.value }))} placeholder="Reference number" />
          <TextInput type="number" step="0.01" value={form.variance_amount} onChange={(e) => setForm((prev) => ({ ...prev, variance_amount: e.target.value }))} placeholder="Variance amount" />
          <Textarea rows={4} value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Notes" />
        </ModalBody>
        <ModalFooter>
          <Button color="warning" onClick={handleReconcile}>Save</Button>
          <Button color="gray" onClick={() => setReviewTarget(null)}>Cancel</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
