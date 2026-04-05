import { useState, useEffect } from 'react';
import {
  Button, Card, Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell,
  Tabs, TabItem, TextInput, Select, Label, Spinner,
} from 'flowbite-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { HiOutlineDownload, HiOutlineChartBar } from 'react-icons/hi';
import api from '@/services/api';
import { REPORTS } from '@/services/endpoints';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDate } from '@/utils/formatDate';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';

const CHART_COLORS = ['#F59E0B', '#3B82F6', '#10B981', '#8B5CF6', '#EF4444', '#06B6D4', '#F97316'];

function ChartCard({ title, children, loading }) {
  return (
    <Card>
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{title}</h3>
      {loading ? <div className="skeleton h-52 w-full rounded-lg" /> : children}
    </Card>
  );
}

// ─── Revenue Tab ────────────────────────────────────────────────────────────────
function RevenueTab() {
  const [data, setData] = useState({ trend: [], by_warehouse: [], by_stockist: [] });
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    setLoading(true);
    api.get(REPORTS.REVENUE, { params: { date_from: dateFrom || undefined, date_to: dateTo || undefined } })
      .then((r) => setData(r.data.data || {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo]);

  const trend = data.weekly_trend || data.trend || [];
  const byWarehouse = data.by_warehouse || [];
  const byStockist = data.by_stockist || [];

  return (
    <div className="space-y-5">
      <div className="flex gap-3">
        <div>
          <Label value="From" className="mb-1" />
          <TextInput type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} sizing="sm" />
        </div>
        <div>
          <Label value="To" className="mb-1" />
          <TextInput type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} sizing="sm" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Revenue Over Time" loading={loading}>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trend} margin={{ left: -20, right: 8, top: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3e8d6" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,.1)' }} />
              <Line type="monotone" dataKey="revenue" stroke="#F59E0B" strokeWidth={2.5} dot={{ fill: '#F59E0B', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Revenue by Warehouse" loading={loading}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byWarehouse} margin={{ left: -20, right: 8, top: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3e8d6" />
              <XAxis dataKey="warehouse_name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ borderRadius: '8px', border: 'none' }} />
              <Bar dataKey="revenue" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <Card>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Revenue by Stockist</h3>
        <div className="overflow-x-auto">
          <Table striped>
            <TableHead>
              <TableHeadCell>Stockist</TableHeadCell>
              <TableHeadCell>Total Orders</TableHeadCell>
              <TableHeadCell>Total Revenue</TableHeadCell>
              <TableHeadCell>Avg Order Value</TableHeadCell>
            </TableHead>
            <TableBody className="divide-y">
              {byStockist.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-gray-400 py-8">No data</TableCell></TableRow>
              ) : byStockist.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{r.partner_name || r.business_name}</TableCell>
                  <TableCell>{r.total_orders}</TableCell>
                  <TableCell className="font-semibold text-amber-700">{formatCurrency(r.total_revenue)}</TableCell>
                  <TableCell>{formatCurrency(r.avg_order_value || r.total_revenue / r.total_orders)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

// ─── Orders Tab ─────────────────────────────────────────────────────────────────
function OrdersTab() {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(REPORTS.REVENUE)
      .then((r) => setData(r.data.data || {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const byStatus = data.by_status || [];
  const trend = data.orders_trend || data.weekly_trend || [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Orders by Status" loading={loading}>
          {byStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={byStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={75} paddingAngle={3}>
                  {byStatus.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyState icon={HiOutlineChartBar} title="No order data" description="" />}
        </ChartCard>
        <ChartCard title="Orders Over Time" loading={loading}>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trend} margin={{ left: -20, right: 8, top: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3e8d6" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none' }} />
              <Line type="monotone" dataKey="order_count" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

// ─── Products Tab ────────────────────────────────────────────────────────────────
function ProductsTab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(REPORTS.PRODUCTS)
      .then((r) => setData(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const top = data.slice(0, 10);
  const byCategory = data.reduce((acc, p) => {
    const cat = p.category || 'Uncategorized';
    const existing = acc.find((a) => a.name === cat);
    if (existing) existing.value += Number(p.total_qty || 0);
    else acc.push({ name: cat, value: Number(p.total_qty || 0) });
    return acc;
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Top 10 Products by Quantity Sold" loading={loading}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={top} layout="vertical" margin={{ left: 60, right: 10, top: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3e8d6" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis dataKey="product_name" type="category" tick={{ fontSize: 10 }} width={60} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none' }} />
              <Bar dataKey="total_qty" fill="#10B981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Products by Category" loading={loading}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={byCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} paddingAngle={3}>
                {byCategory.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <Card>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Product Performance</h3>
        <div className="overflow-x-auto">
          <Table striped>
            <TableHead>
              <TableHeadCell>Product</TableHeadCell>
              <TableHeadCell>Category</TableHeadCell>
              <TableHeadCell>Qty Sold</TableHeadCell>
              <TableHeadCell>Revenue</TableHeadCell>
            </TableHead>
            <TableBody className="divide-y">
              {data.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-gray-400 py-8">No data</TableCell></TableRow>
              ) : data.map((p, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{p.product_name || p.name}</TableCell>
                  <TableCell>{p.category || '—'}</TableCell>
                  <TableCell>{p.total_qty || 0}</TableCell>
                  <TableCell>{formatCurrency(p.total_revenue || 0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

// ─── Movements Tab ───────────────────────────────────────────────────────────────
function MovementsTab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(REPORTS.MOVEMENTS)
      .then((r) => setData(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const byType = data.reduce((acc, m) => {
    const t = m.movement_type || 'unknown';
    const e = acc.find((a) => a.name === t);
    if (e) e.value += 1;
    else acc.push({ name: t, value: 1 });
    return acc;
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Movement Type Distribution" loading={loading}>
          {byType.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={byType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} paddingAngle={3}>
                  {byType.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyState icon={HiOutlineChartBar} title="No movement data" description="" />}
        </ChartCard>
      </div>
      <Card>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Stock Movement Log</h3>
        <div className="overflow-x-auto">
          <Table striped>
            <TableHead>
              <TableHeadCell>Date</TableHeadCell>
              <TableHeadCell>Product</TableHeadCell>
              <TableHeadCell>Warehouse</TableHeadCell>
              <TableHeadCell>Type</TableHeadCell>
              <TableHeadCell>Quantity</TableHeadCell>
            </TableHead>
            <TableBody className="divide-y">
              {data.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-gray-400 py-8">No data</TableCell></TableRow>
              ) : data.slice(0, 50).map((m, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs">{formatDate(m.created_at)}</TableCell>
                  <TableCell className="font-medium">{m.product_name}</TableCell>
                  <TableCell className="text-xs">{m.warehouse_name}</TableCell>
                  <TableCell>
                    <span className="badge-pending text-xs">{m.movement_type}</span>
                  </TableCell>
                  <TableCell>
                    <span className={`font-bold ${m.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {m.quantity > 0 ? '+' : ''}{m.quantity}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

// ─── Stockists Tab ────────────────────────────────────────────────────────────────
function StockistsTab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(REPORTS.PURCHASES)
      .then((r) => setData(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <ChartCard title="Top Stockists by Order Volume" loading={loading}>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.slice(0, 10)} margin={{ left: -20, right: 8, top: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3e8d6" />
              <XAxis dataKey="partner_name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ borderRadius: '8px', border: 'none' }} />
              <Bar dataKey="total_revenue" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : loading ? null : <EmptyState icon={HiOutlineChartBar} title="No data" description="" />}
      </ChartCard>
      <Card>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Stockist Performance</h3>
        <div className="overflow-x-auto">
          <Table striped>
            <TableHead>
              <TableHeadCell>Stockist</TableHeadCell>
              <TableHeadCell>Level</TableHeadCell>
              <TableHeadCell>Total Orders</TableHeadCell>
              <TableHeadCell>Revenue</TableHeadCell>
              <TableHeadCell>Last Order</TableHeadCell>
            </TableHead>
            <TableBody className="divide-y">
              {data.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-gray-400 py-8">No data</TableCell></TableRow>
              ) : data.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{r.partner_name || r.business_name}</TableCell>
                  <TableCell className="text-xs capitalize">{(r.stockist_level || '').replace(/_/g, ' ')}</TableCell>
                  <TableCell>{r.total_orders}</TableCell>
                  <TableCell className="font-semibold text-amber-700">{formatCurrency(r.total_revenue)}</TableCell>
                  <TableCell className="text-xs text-gray-500">{r.last_order_at ? formatDate(r.last_order_at) : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

// ─── Inventory Tab ────────────────────────────────────────────────────────────────
function InventoryTab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/inventory', { params: { limit: 200 } })
      .then((r) => setData(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const byWarehouse = data.reduce((acc, item) => {
    const w = item.warehouse_name || 'Unknown';
    const e = acc.find((a) => a.name === w);
    if (e) e.value += Number(item.current_stock || 0);
    else acc.push({ name: w, value: Number(item.current_stock || 0) });
    return acc;
  }, []);

  const lowStock = data.filter((i) => i.status === 'low_stock' || i.status === 'out_of_stock');
  const expiringSoon = data.filter((i) => {
    if (!i.expiry_date) return false;
    const days = (new Date(i.expiry_date) - new Date()) / 86400000;
    return days >= 0 && days <= 30;
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Stock Levels by Warehouse" loading={loading}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byWarehouse} margin={{ left: -20, right: 8, top: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3e8d6" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none' }} />
              <Bar dataKey="value" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Expiring Within 30 Days ({expiringSoon.length})
          </h3>
          {expiringSoon.length === 0 ? (
            <p className="text-sm text-gray-400">No items expiring soon</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {expiringSoon.map((i) => (
                <div key={i.id} className="flex items-center justify-between p-2 bg-amber-50 rounded text-xs">
                  <span className="font-medium">{i.product_name}</span>
                  <span className="text-amber-700 font-semibold">{formatDate(i.expiry_date)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
      <Card>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Low/Out of Stock Items ({lowStock.length})</h3>
        {lowStock.length === 0 ? (
          <p className="text-sm text-gray-400">All items are adequately stocked</p>
        ) : (
          <div className="overflow-x-auto">
            <Table striped>
              <TableHead>
                <TableHeadCell>Product</TableHeadCell>
                <TableHeadCell>Warehouse</TableHeadCell>
                <TableHeadCell>Stock</TableHeadCell>
                <TableHeadCell>Status</TableHeadCell>
              </TableHead>
              <TableBody className="divide-y">
                {lowStock.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.product_name}</TableCell>
                    <TableCell className="text-xs">{i.warehouse_name}</TableCell>
                    <TableCell className="font-bold">{i.current_stock}</TableCell>
                    <TableCell>
                      <span className={i.status === 'out_of_stock' ? 'badge-rejected' : 'badge-pending'}>
                        {i.status?.replace(/_/g, ' ')}
                      </span>
                    </TableCell>
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

// ─── Main Reports Page ────────────────────────────────────────────────────────────
export default function Reports() {
  return (
    <div className="page-enter">
      <PageHeader
        title="Reports"
        subtitle="Comprehensive system analytics and reports"
        actions={[
          { label: 'Export PDF', icon: <HiOutlineDownload className="w-4 h-4" />, onClick: () => window.print(), color: 'light' },
        ]}
      />

      <Card className="no-print-header">
        <Tabs>
          <TabItem title="Revenue"><RevenueTab /></TabItem>
          <TabItem title="Orders"><OrdersTab /></TabItem>
          <TabItem title="Products"><ProductsTab /></TabItem>
          <TabItem title="Stockists"><StockistsTab /></TabItem>
          <TabItem title="Inventory"><InventoryTab /></TabItem>
          <TabItem title="Movements"><MovementsTab /></TabItem>
        </Tabs>
      </Card>
    </div>
  );
}
