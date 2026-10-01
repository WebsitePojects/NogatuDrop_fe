import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from 'flowbite-react';
import {
  HiShoppingCart, HiCurrencyDollar, HiClock, HiArchive,
  HiExclamation, HiChevronRight,
} from 'react-icons/hi';
import { FiPackage, FiTrendingUp, FiInbox } from 'react-icons/fi';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import KpiCard from '@/components/KpiCard';
import StatusBadge from '@/components/StatusBadge';
import { ToastContainer, useToast } from '@/components/Toast';
import api from '@/services/api';
import { ORDERS, INVENTORY } from '@/services/endpoints';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDate } from '@/utils/formatDate';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { PERMISSIONS, can } from '@/utils/permissions';
import { isCenterStaff } from '@/utils/partnerLevel';

export default function StockistDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toasts, showToast, dismiss } = useToast();
  const centerStaff = isCenterStaff(user);
  const canUseCart = !centerStaff && can(user?.role_slug, PERMISSIONS.CART_USE);
  const { dark } = useTheme();

  const [kpis, setKpis] = useState({ totalOrders: 0, revenueMonth: 0, pendingOrders: 0, inventoryItems: 0 });
  const [recentOrders, setRecentOrders] = useState([]);
  const [weeklyChart, setWeeklyChart] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [ordersRes, inventoryRes] = await Promise.allSettled([
        api.get(ORDERS.LIST, { params: { limit: 100 } }),
        api.get(INVENTORY.LIST, { params: { limit: 100 } }),
      ]);

      const orders = ordersRes.status === 'fulfilled'
        ? (ordersRes.value.data.data?.items || ordersRes.value.data.data || [])
        : [];
      const inventory = inventoryRes.status === 'fulfilled'
        ? (inventoryRes.value.data.data?.items || inventoryRes.value.data.data || [])
        : [];

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthOrders = orders.filter(o => new Date(o.created_at) >= monthStart);
      const revenueMonth = monthOrders
        .filter(o => o.payment_status === 'paid')
        .reduce((s, o) => s + Number(o.total_amount || 0), 0);
      const pendingOrders = orders.filter(o => o.status === 'pending').length;

      setKpis({ totalOrders: orders.length, revenueMonth, pendingOrders, inventoryItems: inventory.length });

      const sorted = [...orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setRecentOrders(sorted.slice(0, 5));

      const low = inventory.filter(i => i.status === 'low_stock' || i.status === 'out_of_stock');
      setLowStock(low.slice(0, 5));

      setWeeklyChart(buildWeeklyData(orders));
    } catch {
      showToast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const buildWeeklyData = (orders) => {
    const now = new Date();
    return Array.from({ length: 4 }, (_, i) => {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay() - (3 - i) * 7);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      const count = orders.filter(o => {
        const d = new Date(o.created_at);
        return d >= weekStart && d <= weekEnd;
      }).length;
      return { week: `Wk ${i + 1}`, orders: count };
    });
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // One primary action, the rest secondary — the same brand-btn pair used across
  // the portal. Cycle counts are no longer in the stockist nav, so the cart-less
  // roles get Receive Goods instead.
  const quickActions = canUseCart
    ? [
        { label: 'Order Products', path: '/stockist/catalog', variant: 'primary' },
        { label: 'View Orders', path: '/stockist/orders', variant: 'secondary' },
        { label: 'View Inventory', path: '/stockist/inventory', variant: 'secondary' },
      ]
    : [
        { label: 'View Orders', path: '/stockist/orders', variant: 'primary' },
        { label: 'View Inventory', path: '/stockist/inventory', variant: 'secondary' },
        { label: 'Receive Goods', path: '/stockist/grn', variant: 'secondary' },
      ];

  const chartTooltipStyle = {
    fontSize: 12,
    borderRadius: 8,
    border: `1px solid ${dark ? 'var(--dark-border)' : '#e5e7eb'}`,
    background: dark ? 'var(--dark-card2)' : '#ffffff',
    color: dark ? 'var(--dark-text)' : '#111827',
  };

  return (
    <div className="p-4 md:p-6 min-h-screen page-enter">
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      <div className="page-header-shell mb-6 grid gap-5 rounded-[1.8rem] border border-white/60 px-5 py-5 lg:grid-cols-[1fr_0.9fr]">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#237023] dark:text-green-400">
            {centerStaff ? 'Fulfillment Center' : 'Stockist Portal'}
          </p>
          <h1 className="mt-3 text-2xl font-bold text-gray-900 dark:text-[var(--dark-text)]">
            {greeting()}, {user?.name?.split(' ')[0] || 'Stockist'}
          </h1>
          <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-[var(--dark-muted)]">
            {new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-600 dark:text-[var(--dark-muted)]">
            {centerStaff
              ? 'Check new orders, confirm payments, send out deliveries, and keep your stock count up to date.'
              : 'Order products, follow your deliveries, and see at a glance what is running low.'}
          </p>
        </div>

        <div className="overflow-hidden rounded-[1.4rem] border border-white/70 shadow-sm dark:border-[var(--dark-border)]">
          <img
            src="/assets/picture_banner.png"
            alt="Nogatu picture banner"
            className="h-full min-h-[220px] w-full object-cover"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard title={centerStaff ? 'Center Orders' : 'My Orders'} value={kpis.totalOrders} icon={HiShoppingCart} iconBg="bg-blue-100" />
        <KpiCard title="Revenue This Month" value={formatCurrency(kpis.revenueMonth)} icon={HiCurrencyDollar} iconBg="bg-green-100" />
        <KpiCard title="Pending Orders" value={kpis.pendingOrders} icon={HiClock} iconBg="bg-amber-100" />
        <KpiCard title="Inventory Items" value={kpis.inventoryItems} icon={HiArchive} iconBg="bg-purple-100" />
      </div>

      {/* Low Stock Alert */}
      {lowStock.length > 0 && (
        <div className="mb-6 rounded-[1.5rem] border border-amber-200 bg-[linear-gradient(135deg,#fff8eb_0%,#fff2d9_100%)] p-4 shadow-[0_22px_40px_-32px_rgba(217,119,6,0.38)] dark:border-amber-500/30 dark:bg-none dark:bg-amber-500/10 dark:shadow-none">
          <div className="flex items-center gap-2 mb-2">
            <HiExclamation className="w-5 h-5 text-amber-700 dark:text-amber-300 flex-shrink-0" />
            <span className="font-semibold text-amber-800 dark:text-amber-200 text-sm">Low Stock Alert</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStock.map((item) => (
              <span
                key={item.id}
                className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200 px-2.5 py-1 rounded-full"
              >
                <FiPackage size={11} />
                {item.product?.name || item.product_name || `Item #${item.id}`}
                <span className="font-bold ml-1">{item.current_stock ?? 0} left</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2">
          <Card className="enterprise-panel">
            <div className="flex items-center gap-2 mb-4">
              <FiTrendingUp className="text-amber-500" />
              <h2 className="font-semibold text-strong text-sm">Orders Per Week (Last 4 Weeks)</h2>
            </div>
            {loading ? (
              <div className="h-48 flex items-end justify-between gap-3 px-2 pb-2">
                {[60, 85, 45, 70].map((h, i) => (
                  <div key={i} className="flex-1 animate-pulse rounded-t-lg bg-amber-100" style={{ height: `${h}%` }} />
                ))}
              </div>
            ) : (
              // Recharts paints grid/axes as SVG attributes; the dark overrides are CSS
              // (they win over attributes) so they can read the layout's --dark-* tokens.
              <div className="dark:[&_.recharts-cartesian-grid_line]:stroke-[color:var(--dark-border)] dark:[&_.recharts-cartesian-axis-tick-value]:fill-[color:var(--dark-muted)] dark:[&_.recharts-cartesian-axis-line]:stroke-[color:var(--dark-border)]">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={weeklyChart} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={chartTooltipStyle}
                      labelStyle={{ color: chartTooltipStyle.color }}
                      itemStyle={{ color: chartTooltipStyle.color }}
                      cursor={{ fill: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
                      formatter={(v) => [v, 'Orders']}
                    />
                    <Bar dataKey="orders" fill="#F59E0B" radius={[4, 4, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-900 dark:text-[var(--dark-text)]">Quick Actions</h2>
          {quickActions.map(({ label, path, variant }) => (
            <button
              key={path}
              type="button"
              onClick={() => navigate(path)}
              className={`brand-btn brand-btn--${variant} w-full justify-between`}
            >
              {label}
              <HiChevronRight className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-strong">Recent Orders</h2>
          <button
            onClick={() => navigate('/stockist/orders')}
            className="text-sm text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 font-medium"
          >
            View all
          </button>
        </div>
        <Card className="enterprise-panel overflow-x-auto p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="h-3.5 w-20 rounded bg-gray-100 dark:bg-gray-700" />
                  <div className="h-3.5 w-16 rounded bg-gray-100 dark:bg-gray-700" />
                  <div className="h-3.5 w-14 rounded-full bg-gray-100 dark:bg-gray-700" />
                  <div className="h-3.5 w-20 rounded bg-gray-100 dark:bg-gray-700 ml-auto" />
                </div>
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-muted">
              <FiInbox size={32} className="mb-2 opacity-30" />
              <p className="text-sm">No orders yet</p>
              {canUseCart ? (
                <button
                  type="button"
                  onClick={() => navigate('/stockist/catalog')}
                  className="brand-btn brand-btn--primary mt-3"
                >
                  Order Products
                </button>
              ) : (
                <p className="mt-1 text-xs">New orders will show up here as soon as they are placed.</p>
              )}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-muted uppercase tracking-wide">Order #</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-muted uppercase tracking-wide">Total</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-muted uppercase tracking-wide">Status</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-muted uppercase tracking-wide">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-gray-50 hover:bg-amber-50/40 cursor-pointer transition-colors"
                    onClick={() => navigate('/stockist/orders')}
                  >
                    <td className="py-2.5 px-4 font-mono font-semibold text-xs text-strong">
                      #{order.order_number || order.id}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-strong">
                      {formatCurrency(order.total_amount)}
                    </td>
                    <td className="py-2.5 px-4">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="py-2.5 px-4 text-muted text-xs">
                      {formatDate(order.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}
