import { useEffect, useMemo, useState } from 'react';
import { Card, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow } from 'flowbite-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import api from '@/services/api';
import { REPORTS } from '@/services/endpoints';
import ResponsiveList from '@/components/ResponsiveList';
import { formatCurrency } from '@/utils/formatCurrency';
import { useTheme } from '@/context/ThemeContext';

// Categorical slots, validated with the dataviz palette checker (lightness band, chroma, CVD and
// normal-vision separation, 3:1 vs surface): light on #ffffff, dark on the portal card #271c18.
// Colour follows the channel, never its rank: the store is always slot 0, influencer links take the
// next slots in slug order, and links beyond the palette fold into "Other influencer links".
const SLOTS = {
  light: ['#2C6FB2', '#D9711C', '#7B5CC4'],
  dark: ['#4F8AD0', '#C96F24', '#9474DA'],
};
const OTHER_KEY = 'influencer:__other';
// Sentinel row key for the totals line the phone list appends after the real channels.
const ALL_CHANNELS_KEY = '__all';

function daysOfMonth(month) {
  const [year, mon] = month.split('-').map(Number);
  const count = new Date(year, mon, 0).getDate();
  return Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`);
}

const monthLabel = (month) => new Date(`${month}-01T00:00:00`).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });

const compactPeso = (value) => (value >= 1000 ? `₱${Math.round(value / 100) / 10}k` : `₱${value}`);

/** Which series the chart draws and in which colour; extra links fold into one series. */
function planSeries(channels, palette) {
  const links = channels.filter((c) => c.slug).map((c) => c.slug).sort();
  const shown = links.slice(0, palette.length - 1);
  const series = [{ key: 'store', label: 'Standard store', color: palette[0] }];
  shown.forEach((slug, i) => series.push({ key: `influencer:${slug}`, label: `/${slug}`, color: palette[i + 1] }));
  if (links.length > shown.length) {
    series.push({ key: OTHER_KEY, label: 'Other influencer links', color: palette[palette.length - 1] });
  }
  const seriesKeyFor = (channel) => (series.some((s) => s.key === channel) ? channel : OTHER_KEY);
  return { series, seriesKeyFor };
}

function ShareBar({ pct, color }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10" aria-hidden="true">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, backgroundColor: color }} />
      </div>
      <span className="tabular-nums text-sm text-gray-700 dark:text-[var(--dark-text)]">{pct}%</span>
    </div>
  );
}

/**
 * Standard store (/shop) vs influencer links (/kawoodee, ...) for one month: a comparison table
 * (which is also the accessible view of the chart) and a daily gross-sales trend.
 * Data: GET /reports/sales-channels (Super Admin).
 */
export default function SalesChannelComparison({ month }) {
  const { dark } = useTheme();
  const palette = dark ? SLOTS.dark : SLOTS.light;
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!month) return undefined;
    let active = true;
    setLoading(true);
    setError('');
    api.get(REPORTS.SALES_CHANNELS, { params: { month } })
      .then(({ data }) => { if (active) setReport(data.data); })
      .catch((err) => { if (active) { setReport(null); setError(err?.response?.data?.message || 'Unable to load sales by channel.'); } })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [month]);

  const { series, seriesKeyFor } = useMemo(() => planSeries(report?.channels || [], palette), [report, palette]);
  const colorFor = (channel) => series.find((s) => s.key === seriesKeyFor(channel))?.color;

  const chartData = useMemo(() => {
    if (!report) return [];
    const byDay = new Map(daysOfMonth(report.month).map((day) => [day, Object.fromEntries(series.map((s) => [s.key, 0]))]));
    for (const point of report.daily) {
      const bucket = byDay.get(point.day);
      if (bucket) bucket[seriesKeyFor(point.channel)] += point.gross_sales;
    }
    return [...byDay.entries()].map(([day, values]) => ({ day, label: String(Number(day.slice(8))), ...values }));
  }, [report, series, seriesKeyFor]);

  if (loading) {
    return <div className="skeleton h-72 w-full rounded-lg" aria-label="Loading sales by channel" />;
  }
  if (error) {
    return <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>;
  }

  const { channels, totals } = report;
  const axisColor = dark ? '#b8a99c' : '#6b5e53';
  const gridColor = dark ? 'rgba(255,255,255,0.08)' : '#ece4d8';

  return (
    <section aria-labelledby="channels-title" className="space-y-4">
      <div>
        <h2 id="channels-title" className="text-lg font-semibold text-gray-900 dark:text-[var(--dark-text)]">Store vs influencer links</h2>
        <p className="text-sm text-muted">
          Public orders for {monthLabel(report.month)}. Gross sales exclude cancelled and rejected orders; paid revenue counts verified payments only.
        </p>
      </div>

      <Card>
        <ResponsiveList
          items={[...channels, { channel: ALL_CHANNELS_KEY, label: 'All public sales', ...totals }]}
          getKey={(c) => c.channel}
          row={(c) => {
            const isTotal = c.channel === ALL_CHANNELS_KEY;
            const average = c.orders
              ? formatCurrency(isTotal ? Math.round((c.gross_sales / c.orders) * 100) / 100 : c.average_order_value)
              : '—';
            return {
              title: c.label,
              subtitle: `${c.orders} orders · ${c.units} boxes${!isTotal && c.excluded_orders > 0 ? ` · ${c.excluded_orders} cancelled or rejected` : ''}`,
              meta: formatCurrency(c.gross_sales),
              details: [
                ['Orders', c.orders],
                ['Paid', c.paid_orders],
                ['Boxes', c.units],
                ['Gross sales', formatCurrency(c.gross_sales)],
                ['Paid revenue', formatCurrency(c.paid_sales)],
                ['Avg. order', average],
                ...(isTotal ? [] : [['Share of sales', <ShareBar key="share" pct={c.share_pct} color={colorFor(c.channel)} />]]),
              ],
            };
          }}
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeadCell>Channel</TableHeadCell>
                  <TableHeadCell className="text-right">Orders</TableHeadCell>
                  <TableHeadCell className="text-right">Paid</TableHeadCell>
                  <TableHeadCell className="text-right">Boxes</TableHeadCell>
                  <TableHeadCell className="text-right">Gross sales</TableHeadCell>
                  <TableHeadCell className="text-right">Paid revenue</TableHeadCell>
                  <TableHeadCell className="text-right">Avg. order</TableHeadCell>
                  <TableHeadCell>Share of sales</TableHeadCell>
                </TableRow>
              </TableHead>
              <TableBody className="divide-y">
                {channels.map((c) => (
                  <TableRow key={c.channel}>
                    <TableCell>
                      <span className="flex items-center gap-2 font-medium text-gray-900 dark:text-[var(--dark-text)]">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: colorFor(c.channel) }} aria-hidden="true" />
                        {c.label}
                      </span>
                      {c.excluded_orders > 0 && <span className="block pl-[18px] text-xs text-muted">{c.excluded_orders} cancelled or rejected</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{c.orders}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.paid_orders}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.units}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(c.gross_sales)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(c.paid_sales)}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.orders ? formatCurrency(c.average_order_value) : '—'}</TableCell>
                    <TableCell><ShareBar pct={c.share_pct} color={colorFor(c.channel)} /></TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-semibold">
                  <TableCell>All public sales</TableCell>
                  <TableCell className="text-right tabular-nums">{totals.orders}</TableCell>
                  <TableCell className="text-right tabular-nums">{totals.paid_orders}</TableCell>
                  <TableCell className="text-right tabular-nums">{totals.units}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(totals.gross_sales)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(totals.paid_sales)}</TableCell>
                  <TableCell className="text-right tabular-nums">{totals.orders ? formatCurrency(Math.round((totals.gross_sales / totals.orders) * 100) / 100) : '—'}</TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </ResponsiveList>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-[var(--dark-text)]">Daily gross sales by channel</h3>
        {totals.orders === 0 ? (
          <p className="py-10 text-center text-sm text-muted">No public sales in {monthLabel(report.month)} yet.</p>
        ) : (
          <div className="h-72" role="img" aria-label={`Daily gross sales for ${report.month}: ${series.map((s) => s.label).join(' and ')}. The table above has the exact figures.`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid stroke={gridColor} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: axisColor, fontSize: 12 }} tickLine={false} axisLine={{ stroke: gridColor }} interval="preserveStartEnd" minTickGap={12} />
                <YAxis tickFormatter={compactPeso} tick={{ fill: axisColor, fontSize: 12 }} tickLine={false} axisLine={false} width={56} />
                <Tooltip
                  formatter={(value, key) => [formatCurrency(value), series.find((s) => s.key === key)?.label || key]}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.day || ''}
                  contentStyle={dark ? { background: '#2e221e', border: '1px solid #3d2e28', color: '#f5ebe3' } : undefined}
                />
                <Legend formatter={(key) => series.find((s) => s.key === key)?.label || key} wrapperStyle={{ fontSize: 12 }} />
                {series.map((s) => (
                  <Line key={s.key} type="linear" dataKey={s.key} stroke={s.color} strokeWidth={2} dot={false} activeDot={{ r: 5, strokeWidth: 2 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </section>
  );
}
