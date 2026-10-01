import { useEffect, useState } from 'react';
import { Card, Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell, TextInput, Label, Spinner } from 'flowbite-react';
import api from '@/services/api';
import { REPORTS } from '@/services/endpoints';
import { formatCurrency } from '@/utils/formatCurrency';

export default function InfluencerReports() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api.get(REPORTS.INFLUENCERS, { params: { date_from: dateFrom || undefined, date_to: dateTo || undefined } })
      .then(({ data }) => {
        if (!active) return;
        const report = data.data || {};
        setRows(Array.isArray(report.rows) ? report.rows : (Array.isArray(report) ? report : []));
      })
      .catch((err) => active && setError(err?.response?.data?.message || 'Unable to load influencer reports.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [dateFrom, dateTo]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div><Label htmlFor="influencer_date_from" className="mb-1">From</Label><TextInput id="influencer_date_from" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} sizing="sm" /></div>
        <div><Label htmlFor="influencer_date_to" className="mb-1">To</Label><TextInput id="influencer_date_to" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} sizing="sm" /></div>
      </div>
      <Card>
        <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-[var(--dark-text)]">Influencer checkout totals</h3>
        {loading ? <div className="flex justify-center py-8"><Spinner /></div> : error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : rows.length === 0 ? <p className="text-sm text-muted">No influencer orders for this period.</p> : (
          <div className="overflow-x-auto">
            <Table striped>
              <TableHead><TableRow><TableHeadCell>Slug</TableHeadCell><TableHeadCell>Orders</TableHeadCell><TableHeadCell>Paid</TableHeadCell><TableHeadCell>Delivered</TableHeadCell><TableHeadCell>Revenue</TableHeadCell></TableRow></TableHead>
              <TableBody className="divide-y">{rows.map((row) => <TableRow key={row.slug}><TableCell className="font-medium">{row.slug}</TableCell><TableCell>{row.orders}</TableCell><TableCell>{row.paid_orders}</TableCell><TableCell>{row.delivered_orders}</TableCell><TableCell>{formatCurrency(row.delivered_revenue)}</TableCell></TableRow>)}</TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
