import { useState, useEffect } from 'react';
import { Card, Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell } from 'flowbite-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  HiOutlineCurrencyDollar,
  HiOutlineUserGroup,
  HiOutlineShoppingCart,
  HiOutlineCube,
  HiOutlineDownload,
  HiOutlineExclamation,
} from 'react-icons/hi';
import api from '@/services/api';
import { REPORTS, DASHBOARD } from '@/services/endpoints';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDate } from '@/utils/formatDate';
import KpiCard from '@/components/KpiCard';
import StatusBadge from '@/components/StatusBadge';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';

const CHART_COLORS = ['#F59E0B', '#3B82F6', '#10B981', '#8B5CF6', '#EF4444', '#06B6D4'];

function SkeletonCard() {
  return (
    <div className="kpi-card">
      <div className="flex-1 space-y-2">
        <div className="skeleton h-3 w-24 rounded" />
        <div className="skeleton h-7 w-32 rounded" />
      </div>
      <div className="skeleton w-11 h-11 rounded-xl" />
    </div>
  );
}

export default function Dashboard() {
  const [kpis, setKpis] = useState(null);
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [productDist, setProductDist] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [kpiRes, trendRes, distRes, ordersRes, invRes] = await Promise.allSettled([
          api.get(DASHBOARD.KPIS),
          api.get(REPORTS.REVENUE),
          api.get(REPORTS.PRODUCTS),
          api.get(DASHBOARD.RECENT_ORDERS),
          api.get('/inventory', { params: { status: 'low_stock', limit: 5 } }),
        ]);
        if (kpiRes.status === 'fulfilled') setKpis(kpiRes.value.data.data);
        if (trendRes.status === 'fulfilled') setRevenueTrend(trendRes.value.data.data || []);
        if (distRes.status === 'fulfilled') {
          const raw = distRes.value.data.data;
          const arr = Array.isArray(raw) ? raw : (raw?.products || []);
          setProductDist(
            arr.slice(0, 6).map((r) => ({
              name: r.product_name || r.name,
              value: Number(r.total_qty_sold || r.total_qty || r.quantity || 0),
            }))
          );
        }
        if (ordersRes.status === 'fulfilled') setRecentOrders(ordersRes.value.data.data || []);
        if (invRes.status === 'fulfilled') setLowStock(invRes.value.data.data || []);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  return (
    <div className="page-enter">
      <PageHeader
        title="Dashboard"
        subtitle="A clearer command view across operations, payments, stock health, catalog movement, and logistics activity."
        actions={[
          {
            label: 'Export PDF',
            icon: <HiOutlineDownload className="w-4 h-4" />,
            onClick: () => window.print(),
            color: 'light',
          },
        ]}
      />

      <div className="workspace-summary-band mb-6 grid gap-5 overflow-hidden p-5 sm:p-6 dark:bg-[linear-gradient(135deg,#271c18_0%,#221814_100%)] lg:grid-cols-[1.08fr_0.92fr]">
        <div className="flex flex-col justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#b56d1e] dark:text-orange-300/80">Operations Pulse</p>
            <h2 className="font-heading mt-3 text-3xl text-[#3d1800] dark:text-[var(--dark-text)]">Professional oversight for orders, stockists, inventory, and delivery movement.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#7b5a43] dark:text-[var(--dark-muted)]">
              The dashboard now groups business-critical information into cleaner, easier-to-scan surfaces so Super Admin can act faster without fighting the layout.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Operations', value: 'Live' },
              { label: 'Payments', value: 'Tracked' },
              { label: 'Stock Health', value: 'Monitored' },
              { label: 'Logistics', value: 'Connected' },
            ].map((item) => (
              <div key={item.label} className="enterprise-soft-panel px-4 py-3 text-[#5b3315] dark:bg-white/[0.03] dark:text-[var(--dark-text)]">
                <p className="text-lg font-bold">{item.value}</p>
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#946a49] dark:text-[var(--dark-muted)]">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-[1.4rem] border border-white/60 shadow-sm dark:border-[var(--dark-border)]">
          <img
            src="/assets/picture_banner.png"
            alt="Nogatu picture banner"
            className="h-full min-h-[240px] w-full object-cover"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <KpiCard
              title="Total Revenue"
              value={formatCurrency(kpis?.total_revenue || 0)}
              icon={HiOutlineCurrencyDollar}
              iconBg="bg-amber-100"
            />
            <KpiCard
              title="Active Stockists"
              value={kpis?.active_partners ?? 0}
              icon={HiOutlineUserGroup}
              iconBg="bg-blue-100"
            />
            <KpiCard
              title="Pending Orders"
              value={kpis?.pending_orders ?? 0}
              icon={HiOutlineShoppingCart}
              iconBg="bg-orange-100"
            />
            <KpiCard
              title="Inventory Value"
              value={formatCurrency(kpis?.inventory_value || 0)}
              icon={HiOutlineCube}
              iconBg="bg-green-100"
            />
          </>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="enterprise-panel p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-[var(--dark-text)]">Revenue Trend (7 Days)</h3>
          {loading ? (
            <div className="skeleton h-56 w-full rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={revenueTrend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3e8d6" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v) => formatCurrency(v)}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#F59E0B"
                  strokeWidth={2.5}
                  dot={{ fill: '#F59E0B', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="enterprise-panel p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-[var(--dark-text)]">Product Distribution</h3>
          {loading ? (
            <div className="skeleton h-56 w-full rounded-lg" />
          ) : productDist.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={productDist} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {productDist.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => v.toLocaleString()} />
                <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-56 text-gray-400 text-sm">No data</div>
          )}
        </div>
      </div>

      {/* Recent Orders + Low Stock */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Recent Orders */}
        <div className="xl:col-span-2">
          <div className="enterprise-panel p-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-[var(--dark-text)]">Recent Orders</h3>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="skeleton h-10 w-full rounded" />
                ))}
              </div>
            ) : (
              <DataTable
                className="dashboard-table-shell border-0 bg-transparent shadow-none"
                headers={['Order #', 'Stockist', 'Amount', 'Status', 'Date']}
                rows={recentOrders.slice(0, 10)}
                emptyMessage="No recent orders"
                renderRow={(order) => (
                  <tr key={order.id}>
                    <td className="font-semibold text-gray-900 dark:text-[var(--dark-text)]">{order.order_number}</td>
                    <td>{order.partner_name || order.business_name || 'N/A'}</td>
                    <td>{formatCurrency(order.total_amount)}</td>
                    <td><StatusBadge status={order.status} /></td>
                    <td>{formatDate(order.created_at)}</td>
                  </tr>
                )}
              />
            )}
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="enterprise-panel p-5">
          <div className="flex items-center gap-2 mb-3">
            <HiOutlineExclamation className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-gray-700 dark:text-[var(--dark-text)]">Low Stock Alerts</h3>
          </div>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton h-12 w-full rounded" />
              ))}
            </div>
          ) : lowStock.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">All stock levels healthy</p>
          ) : (
            <div className="space-y-2">
              {lowStock.map((item) => (
                <div key={item.id} className="enterprise-soft-panel flex items-center justify-between p-3 dark:bg-white/[0.03]">
                  <div>
                    <p className="text-xs font-semibold text-gray-800 dark:text-[var(--dark-text)]">{item.product_name}</p>
                    <p className="text-xs text-gray-500 dark:text-[var(--dark-muted)]">{item.warehouse_name}</p>
                  </div>
                  <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                    {item.current_stock} left
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
