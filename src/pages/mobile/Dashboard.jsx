import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HiShoppingBag, HiTrendingUp, HiArrowRight } from 'react-icons/hi';
import { FiPackage } from 'react-icons/fi';
import StatusBadge from '@/components/StatusBadge';
import api from '@/services/api';
import { ORDERS, DASHBOARD } from '@/services/endpoints';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDate } from '@/utils/formatDate';
import { useAuth } from '@/context/AuthContext';

export default function MobileDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [stats, setStats] = useState({ totalOrders: 0, monthOrders: 0 });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(ORDERS.LIST, { params: { limit: 10 } });
      const orders = Array.isArray(data.data) ? data.data : (data.data?.items || []);
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthOrders = orders.filter(o => new Date(o.created_at) >= monthStart).length;
      setStats({ totalOrders: orders.length, monthOrders });
      setRecentOrders(
        [...orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 3)
      );
    } catch {
      // silently fail on mobile
    } finally {
      setLoading(false);
    }
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="px-4 pt-6 pb-24 min-h-screen bg-white">
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">
          {greeting()}, {user?.name?.split(' ')[0] || 'there'}! 👋
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          { label: 'Total Orders', value: loading ? '—' : stats.totalOrders, icon: HiShoppingBag, color: 'bg-orange-50 text-orange-500' },
          { label: "This Month's Orders", value: loading ? '—' : stats.monthOrders, icon: HiTrendingUp, color: 'bg-emerald-50 text-emerald-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <Icon size={18} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          {
            label: 'Shop Now',
            desc: 'Browse products',
            path: '/mobile/catalog',
            bg: 'bg-orange-500',
            icon: HiShoppingBag,
          },
          {
            label: 'My Orders',
            desc: 'Track your orders',
            path: '/mobile/orders',
            bg: 'bg-blue-500',
            icon: FiPackage,
          },
        ].map(({ label, desc, path, bg, icon: Icon }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={`${bg} text-white rounded-2xl p-4 text-left hover:opacity-90 active:scale-95 transition-all`}
          >
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center mb-3">
              <Icon size={18} />
            </div>
            <p className="font-bold text-sm">{label}</p>
            <p className="text-xs text-white/70 mt-0.5">{desc}</p>
          </button>
        ))}
      </div>

      {/* Recent Orders */}
      {recentOrders.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 text-sm">Recent Orders</h2>
            <Link
              to="/mobile/orders"
              className="text-xs text-orange-500 flex items-center gap-0.5"
            >
              View all <HiArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-2">
            {recentOrders.map(order => (
              <div
                key={order.id}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between"
              >
                <div>
                  <p className="font-mono font-bold text-sm text-gray-900">
                    #{order.order_number || order.id}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(order.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm text-orange-500">
                    {formatCurrency(order.total_amount)}
                  </p>
                  <div className="mt-1">
                    <StatusBadge status={order.status} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
