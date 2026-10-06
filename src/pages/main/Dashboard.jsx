import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import ResponsiveList from '@/components/ResponsiveList';

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
  const navigate = useNavigate();
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
        if (trendRes.status === 'fulfilled') {
          // The revenue report returns an object; the chart needs its weekly series.
          const weekly = trendRes.value.data.data?.weekly_trend || [];
          setRevenueTrend(weekly.map((week) => ({ label: formatDate(week.week_start), revenue: Number(week.revenue) || 0 })));
        }
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
        subtitle="Sales, pending orders and stock across every center at a glance."
        actions={[
          {
            label: 'Export PDF',
            icon: <HiOutlineDownload className="w-4 h-4" />,
            onClick: () => window.print(),
            color: 'light',
          },
        ]}
      />

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
              value={kpis?.active_stockists ?? 0}
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
              // Whole pesos: centavos on a ₱13-billion stock value only push the number onto two lines.
              value={`₱${Math.round(Number(kpis?.inventory_value) || 0).toLocaleString('en-PH')}`}
              icon={HiOutlineCube}
              iconBg="bg-green-100"
            />
          </>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="enterprise-panel p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-[var(--dark-text)]">Delivered Sales by Week</h3>
          {loading ? (
            <div className="skeleton h-56 w-full rounded-lg" />
          ) : !revenueTrend.some((day) => Number(day.revenue) > 0) ? (
            <div className="flex h-56 items-center justify-center text-sm text-muted">No delivered, paid orders yet</div>
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
            <div className="flex items-center justify-center h-56 text-muted text-sm">No data</div>
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
              <ResponsiveList
                items={recentOrders.slice(0, 10)}
                emptyLabel="No recent orders"
                onOpen={(order) => navigate(`/main/orders?highlight=${order.id}`)}
                row={(order) => ({
                  title: order.order_number,
                  subtitle: `${order.partner_name || order.business_name || 'N/A'} · ${formatDate(order.created_at)}`,
                  meta: formatCurrency(order.total_amount),
                  status: <StatusBadge status={order.status} />,
                })}
              >
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
              </ResponsiveList>
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
            <p className="text-sm text-muted text-center py-6">All stock levels healthy</p>
          ) : (
            <div className="space-y-2">
              {lowStock.map((item) => (
                <div key={item.id} className="enterprise-soft-panel flex items-center justify-between p-3 dark:bg-white/[0.03]">
                  <div>
                    <p className="text-xs font-semibold text-gray-800 dark:text-[var(--dark-text)]">{item.product_name}</p>
                    <p className="text-xs text-gray-600 dark:text-[var(--dark-muted)]">{item.warehouse_name}</p>
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
