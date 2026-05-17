import { useEffect, useState } from 'react';
import { Button, Card, Spinner, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow } from 'flowbite-react';
import { HiOutlineCurrencyDollar, HiOutlineDownload } from 'react-icons/hi';
import api from '@/services/api';
import { EXPORTS, SETTLEMENTS } from '@/services/endpoints';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import { ToastContainer, useToast } from '@/components/Toast';
import { formatDateTime } from '@/utils/formatDate';
import { formatCurrency } from '@/utils/formatCurrency';

export default function StockistSettlements() {
  const { toasts, showToast, dismiss } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="page-enter">
      <ToastContainer toasts={toasts} dismiss={dismiss} />
      <PageHeader
        title="Settlements"
        subtitle="Track reconciliations and export the signed settlement history for your territory"
        actions={[{ label: 'Export CSV', icon: <HiOutlineDownload className="h-4 w-4" />, onClick: downloadCsv, color: 'light' }]}
      />

      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-16"><Spinner size="xl" color="warning" /></div>
        ) : rows.length === 0 ? (
          <EmptyState icon={HiOutlineCurrencyDollar} title="No settlements" description="Verified payments and courier remittances will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <Table striped>
              <TableHead>
                <TableRow>
                  <TableHeadCell>Settlement</TableHeadCell>
                  <TableHeadCell>Order</TableHeadCell>
                  <TableHeadCell>Amount</TableHeadCell>
                  <TableHeadCell>Method</TableHeadCell>
                  <TableHeadCell>Status</TableHeadCell>
                  <TableHeadCell>Expected</TableHeadCell>
                  <TableHeadCell>Reconciled</TableHeadCell>
                </TableRow>
              </TableHead>
              <TableBody className="divide-y">
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{row.settlement_number}</TableCell>
                    <TableCell className="font-mono text-xs">#{row.order_number}</TableCell>
                    <TableCell>{formatCurrency(row.amount)}</TableCell>
                    <TableCell>{row.method}</TableCell>
                    <TableCell><StatusBadge status={row.status} /></TableCell>
                    <TableCell className="text-xs">{row.expected_at ? formatDateTime(row.expected_at) : '-'}</TableCell>
                    <TableCell className="text-xs">{row.reconciled_at ? formatDateTime(row.reconciled_at) : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
