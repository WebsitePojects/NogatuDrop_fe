import { useEffect, useRef, useState } from 'react';
import { Button, Card, Label, Spinner, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow, TextInput } from 'flowbite-react';
import { HiOutlineDownload, HiOutlineShoppingBag, HiOutlineCash } from 'react-icons/hi';
import api from '@/services/api';
import { REPORTS } from '@/services/endpoints';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDateTime } from '@/utils/formatDate';
import PageHeader from '@/components/PageHeader';
import KpiCard from '@/components/KpiCard';
import EmptyState from '@/components/EmptyState';
import StatusBadge from '@/components/StatusBadge';
import SalesChannelComparison from '@/components/SalesChannelComparison';
import ResponsiveList from '@/components/ResponsiveList';

const EMPTY_SUMMARY = { order_count: 0, gross_sales: 0, by_provider: [], by_center: [] };

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

// A blob-typed request turns the JSON error body into a Blob, so the server's
// message has to be read out of it before it can be shown.
async function readExportErrorMessage(err) {
  const body = err?.response?.data;
  if (body instanceof Blob) {
    try {
      const parsed = JSON.parse(await body.text());
      if (parsed?.message) return parsed.message;
    } catch {
      // Not JSON (e.g. proxy HTML error page): fall through to the generic text.
    }
  }
  return err?.response?.data?.message || 'Unable to export the report. Please try again.';
}

function saveBlobAsFile(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function BreakdownCard({ title, nameKey, items }) {
  return (
    <Card>
      <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-[var(--dark-text)]">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted">No orders yet.</p>
      ) : (
        <ul className="space-y-1.5 text-sm">
          {items.map((item) => (
            <li key={item[nameKey]} className="flex items-baseline justify-between gap-3">
              <span className="font-medium text-gray-900 dark:text-[var(--dark-text)]">{item[nameKey]}</span>
              <span className="text-muted">{item.orders} {item.orders === 1 ? 'order' : 'orders'} &middot; {formatCurrency(item.gross)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function InfluencerReports() {
  const [month, setMonth] = useState(currentMonth);
  const [slugDraft, setSlugDraft] = useState('');
  const [slug, setSlug] = useState('');
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const exportingRef = useRef(false);

  useEffect(() => {
    if (!month) return undefined;
    let active = true;
    setLoading(true);
    setError('');
    api.get(REPORTS.INFLUENCERS, { params: { month, slug: slug || undefined } })
      .then(({ data }) => {
        if (!active) return;
        const report = data.data || {};
        setSummary({ ...EMPTY_SUMMARY, ...report.summary });
        setRows(Array.isArray(report.rows) ? report.rows : []);
      })
      .catch((err) => {
        if (!active) return;
        setSummary(EMPTY_SUMMARY);
        setRows([]);
        setError(err?.response?.data?.message || 'Unable to load influencer sales.');
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [month, slug]);

  const handleApplySlug = (event) => {
    event.preventDefault();
    setSlug(slugDraft.trim().toLowerCase());
  };

  const handleExport = async () => {
    if (exportingRef.current || !month) return;
    exportingRef.current = true;
    setExporting(true);
    setExportError('');
    try {
      const response = await api.get(REPORTS.INFLUENCERS_EXPORT, {
        params: { month, slug: slug || undefined, format: 'csv' },
        responseType: 'blob',
      });
      saveBlobAsFile(response.data, `influencer-sales-${month}${slug ? `-${slug}` : ''}.csv`);
    } catch (err) {
      setExportError(await readExportErrorMessage(err));
    } finally {
      exportingRef.current = false;
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Channels"
        subtitle="Standard store vs influencer links, month by month. Export the influencer order list to open it in Excel."
      >
        <Button color="warning" onClick={handleExport} disabled={exporting || loading || !month}>
          {exporting ? <Spinner size="sm" className="mr-2" /> : <HiOutlineDownload className="mr-2 h-4 w-4" />}
          {exporting ? 'Preparing CSV...' : 'Export CSV'}
        </Button>
      </PageHeader>

      <form onSubmit={handleApplySlug} className="flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="influencer_month" className="mb-1 block">Month</Label>
          <TextInput id="influencer_month" type="month" value={month} onChange={(event) => setMonth(event.target.value)} sizing="sm" required />
        </div>
        <div>
          <Label htmlFor="influencer_slug" className="mb-1 block">Influencer link (optional)</Label>
          <TextInput id="influencer_slug" value={slugDraft} onChange={(event) => setSlugDraft(event.target.value)} placeholder="e.g. kawoodee" sizing="sm" />
        </div>
        <Button type="submit" color="light" size="sm">Apply</Button>
      </form>

      <SalesChannelComparison month={month} />

      <h2 className="pt-2 text-lg font-semibold text-gray-900 dark:text-[var(--dark-text)]">Influencer orders</h2>

      {exportError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{exportError}</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {loading ? (
        <div className="space-y-4">
          <div className="skeleton h-24 w-full rounded-lg" />
          <div className="skeleton h-52 w-full rounded-lg" />
        </div>
      ) : !error && rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={HiOutlineShoppingBag}
            title="No influencer orders this month"
            description={`There are no orders attributed to ${slug ? `the "${slug}" link` : 'an influencer link'} for ${month}. Pick another month or clear the link filter.`}
          />
        </Card>
      ) : !error && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard title="Orders" value={summary.order_count} icon={HiOutlineShoppingBag} />
            <KpiCard title="Gross sales" value={formatCurrency(summary.gross_sales)} icon={HiOutlineCash} iconBg="bg-green-100" />
            <BreakdownCard title="By payment provider" nameKey="provider" items={summary.by_provider} />
            <BreakdownCard title="By fulfillment center" nameKey="center" items={summary.by_center} />
          </div>

          <Card>
            <ResponsiveList
              items={rows}
              getKey={(row) => row.order_number}
              row={(row) => ({
                title: `#${row.order_number}`,
                subtitle: `${row.fulfillment_center || '—'} · ${formatDateTime(row.created_at)}`,
                meta: formatCurrency(row.total_amount),
                status: <StatusBadge status={row.status} />,
                details: [
                  ['Order', `#${row.order_number}`],
                  ['Date & time', formatDateTime(row.created_at)],
                  ['Provider', row.payment_provider || '—'],
                  ['Fulfillment center', row.fulfillment_center || '—'],
                  ['Customer location', row.customer_location || '—'],
                  ['Total', formatCurrency(row.total_amount)],
                  ['Status', <StatusBadge key="s" status={row.status} />],
                ],
              })}
            >
              <div className="overflow-x-auto">
                <Table striped>
                  <TableHead>
                    <TableRow>
                      <TableHeadCell>Order</TableHeadCell>
                      <TableHeadCell>Date &amp; time</TableHeadCell>
                      <TableHeadCell>Provider</TableHeadCell>
                      <TableHeadCell>Fulfillment center</TableHeadCell>
                      <TableHeadCell>Customer location</TableHeadCell>
                      <TableHeadCell className="text-right">Total</TableHeadCell>
                      <TableHeadCell>Status</TableHeadCell>
                    </TableRow>
                  </TableHead>
                  <TableBody className="divide-y">
                    {rows.map((row) => (
                      <TableRow key={row.order_number}>
                        <TableCell className="font-mono font-medium">#{row.order_number}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatDateTime(row.created_at)}</TableCell>
                        <TableCell>{row.payment_provider || '—'}</TableCell>
                        <TableCell>{row.fulfillment_center || '—'}</TableCell>
                        <TableCell>{row.customer_location || '—'}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(row.total_amount)}</TableCell>
                        <TableCell><StatusBadge status={row.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ResponsiveList>
          </Card>
        </>
      )}
    </div>
  );
}
