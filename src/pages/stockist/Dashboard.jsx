import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from 'flowbite-react';
import {
  HiShoppingCart, HiCurrencyDollar, HiClock, HiArchive,
  HiExclamation, HiChevronRight,
} from 'react-icons/hi';
import { FiPackage, FiTrendingUp } from 'react-icons/fi';
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

export default function StockistDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toasts, showToast, dismiss } = useToast();

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

  return (
    <div className="p-4 md:p-6 min-h-screen page-enter" style={{ background: '#FFF8F0' }}>
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {greeting()}, {user?.name?.split(' ')[0] || 'Stockist'}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard title="My Orders" value={kpis.totalOrders} icon={HiShoppingCart} iconBg="bg-blue-100" />
        <KpiCard title="Revenue This Month" value={formatCurrency(kpis.revenueMonth)} icon={HiCurrencyDollar} iconBg="bg-green-100" />
        <KpiCard title="Pending Orders" value={kpis.pendingOrders} icon={HiClock} iconBg="bg-amber-100" />
        <KpiCard title="Inventory Items" value={kpis.inventoryItems} icon={HiArchive} iconBg="bg-purple-100" />
      </div>

      {/* Low Stock Alert */}
      {lowStock.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <HiExclamation className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <span className="font-semibold text-amber-800 text-sm">Low Stock Alert</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStock.map((item) => (
              <span
                key={item.id}
                className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full"
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
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <FiTrendingUp className="text-amber-500" />
              <h2 className="font-semibold text-gray-900 text-sm">Orders Per Week (Last 4 Weeks)</h2>
            </div>
            {loading ? (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Loading chart…</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weeklyChart} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                    formatter={(v) => [v, 'Orders']}
                  />
                  <Bar dataKey="orders" fill="#F59E0B" radius={[4, 4, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-900">Quick Actions</h2>
          {[
            { label: 'Browse Catalog', path: '/stockist/catalog', color: 'bg-amber-500 hover:bg-amber-600' },
            { label: 'View Orders', path: '/stockist/orders', color: 'bg-blue-600 hover:bg-blue-700' },
            { label: 'View Inventory', path: '/stockist/inventory', color: 'bg-purple-600 hover:bg-purple-700' },
          ].map(({ label, path, color }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-white text-sm font-semibold transition-colors ${color}`}
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
          <h2 className="font-semibold text-gray-900">Recent Orders</h2>
          <button
            onClick={() => navigate('/stockist/orders')}
            className="text-sm text-amber-600 hover:text-amber-700 font-medium"
          >
            View all
          </button>
        </div>
        <Card className="overflow-x-auto p-0">
          {loading ? (
            <div className="py-8 text-center text-gray-400 text-sm">Loading…</div>
          ) : recentOrders.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-sm">No orders yet</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Order #</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-gray-50 hover:bg-amber-50/40 cursor-pointer transition-colors"
                    onClick={() => navigate('/stockist/orders')}
                  >
                    <td className="py-2.5 px-4 font-mono font-semibold text-xs text-gray-800">
                      #{order.order_number || order.id}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-gray-900">
                      {formatCurrency(order.total_amount)}
                    </td>
                    <td className="py-2.5 px-4">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="py-2.5 px-4 text-gray-500 text-xs">
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
