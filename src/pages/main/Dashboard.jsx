import { useState, useEffect } from 'react';
import { Card, Button, Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell } from 'flowbite-react';
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
          setProductDist(
            (distRes.value.data.data || []).slice(0, 6).map((r) => ({
              name: r.product_name || r.name,
              value: Number(r.total_qty || r.quantity || 0),
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
        subtitle="System overview and key metrics"
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
        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Revenue Trend (7 Days)</h3>
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
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Product Distribution</h3>
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
        </Card>
      </div>

      {/* Recent Orders + Low Stock */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Recent Orders */}
        <div className="xl:col-span-2">
          <Card>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Orders</h3>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="skeleton h-10 w-full rounded" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table striped>
                  <TableHead>
                    <TableHeadCell>Order #</TableHeadCell>
                    <TableHeadCell>Stockist</TableHeadCell>
                    <TableHeadCell>Amount</TableHeadCell>
                    <TableHeadCell>Status</TableHeadCell>
                    <TableHeadCell>Date</TableHeadCell>
                  </TableHead>
                  <TableBody className="divide-y">
                    {recentOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-gray-400 py-8">
                          No recent orders
                        </TableCell>
                      </TableRow>
                    ) : (
                      recentOrders.slice(0, 10).map((order) => (
                        <TableRow key={order.id} className="hover:bg-amber-50/40">
                          <TableCell className="font-medium text-gray-900">{order.order_number}</TableCell>
                          <TableCell>{order.partner_name || order.business_name || 'N/A'}</TableCell>
                          <TableCell>{formatCurrency(order.total_amount)}</TableCell>
                          <TableCell><StatusBadge status={order.status} /></TableCell>
                          <TableCell>{formatDate(order.created_at)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </div>

        {/* Low Stock Alert */}
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <HiOutlineExclamation className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-gray-700">Low Stock Alerts</h3>
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
                <div key={item.id} className="flex items-center justify-between p-2.5 bg-amber-50 rounded-lg border border-amber-100">
                  <div>
                    <p className="text-xs font-semibold text-gray-800">{item.product_name}</p>
                    <p className="text-xs text-gray-500">{item.warehouse_name}</p>
                  </div>
                  <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                    {item.current_stock} left
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
