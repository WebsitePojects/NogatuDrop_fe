import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HiShoppingBag, HiTrendingUp, HiArrowRight } from 'react-icons/hi';
import { FiPackage } from 'react-icons/fi';
import StatusBadge from '@/components/StatusBadge';
import api from '@/services/api';
import { ORDERS } from '@/services/endpoints';
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
      const monthOrders = orders.filter((o) => new Date(o.created_at) >= monthStart).length;
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
    <div className="min-h-screen bg-white px-4 pb-24 pt-6 dark:bg-transparent">
      <div className="page-header-shell mb-6 rounded-[1.6rem] border border-white/60 px-4 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#ff8c00]">Mobile Stockist</p>
        <h1 className="mt-3 text-xl font-bold text-gray-900 dark:text-[var(--dark-text)]">
          {greeting()}, {user?.name?.split(' ')[0] || 'there'}
        </h1>
        <p className="mt-1 text-sm text-gray-400 dark:text-[var(--dark-muted)]">
          {new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        <p className="mt-3 text-sm leading-6 text-gray-500 dark:text-[var(--dark-muted)]">
          Track orders, reorder quickly, and stay updated with a cleaner mobile-first overview.
        </p>
      </div>

      <div className="mb-6 overflow-hidden rounded-[1.6rem] border border-gray-100 shadow-sm dark:border-[var(--dark-border)]">
        <img
          src="/assets/picture_banner.png"
          alt="Nogatu picture banner"
          className="h-36 w-full object-cover"
        />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3">
        {[
          { label: 'Total Orders', value: loading ? '-' : stats.totalOrders, icon: HiShoppingBag, color: 'bg-orange-50 text-orange-500' },
          { label: "This Month's Orders", value: loading ? '-' : stats.monthOrders, icon: HiTrendingUp, color: 'bg-emerald-50 text-emerald-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-[1.4rem] border border-gray-100 bg-white p-4 shadow-[0_24px_40px_-32px_rgba(15,23,42,0.18)] dark:border-[var(--dark-border)] dark:bg-[var(--dark-card)]"
          >
            <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${color}`}>
              <Icon size={18} />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-[var(--dark-text)]">{value}</p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-[var(--dark-muted)]">{label}</p>
          </div>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3">
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
            className={`${bg} rounded-[1.4rem] p-4 text-left text-white shadow-[0_20px_36px_-26px_rgba(15,23,42,0.32)] transition-all hover:opacity-90 active:scale-95`}
          >
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
              <Icon size={18} />
            </div>
            <p className="text-sm font-bold">{label}</p>
            <p className="mt-0.5 text-xs text-white/70">{desc}</p>
          </button>
        ))}
      </div>

      {recentOrders.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-[var(--dark-text)]">Recent Orders</h2>
            <Link to="/mobile/orders" className="flex items-center gap-0.5 text-xs text-orange-500">
              View all <HiArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-2">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between rounded-[1.4rem] border border-gray-100 bg-white p-4 shadow-[0_20px_38px_-30px_rgba(15,23,42,0.2)] dark:border-[var(--dark-border)] dark:bg-[var(--dark-card)]"
              >
                <div>
                  <p className="font-mono text-sm font-bold text-gray-900 dark:text-[var(--dark-text)]">
                    #{order.order_number || order.id}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400 dark:text-[var(--dark-muted)]">{formatDate(order.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-orange-500">{formatCurrency(order.total_amount)}</p>
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
