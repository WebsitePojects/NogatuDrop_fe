import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Spinner } from 'flowbite-react';
import { Link } from 'react-router-dom';
import {
  HiOutlineArrowRight,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineLocationMarker,
  HiOutlineRefresh,
  HiOutlineShoppingBag,
  HiOutlineUser,
} from 'react-icons/hi';
import StatusBadge from '@/components/StatusBadge';
import api from '@/services/api';
import { ORDERS, TRACKING } from '@/services/endpoints';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDate, formatRelative } from '@/utils/formatDate';

const PAGE_CONFIG = {
  reorder: {
    title: 'Reorder Planner',
    summary: 'Most-bought product suggestions from your own order history.',
    icon: HiOutlineRefresh,
    links: [
      { to: '/mobile/catalog', label: 'Browse Catalog' },
      { to: '/mobile/orders', label: 'View My Orders' },
    ],
  },
  delivery: {
    title: 'Delivery Tracker',
    summary: 'Active delivery statuses with courier and ETA snapshots.',
    icon: HiOutlineLocationMarker,
    links: [
      { to: '/mobile/orders', label: 'Order Timeline' },
      { to: '/mobile/orders', label: 'Track via My Orders' },
    ],
  },
  account: {
    title: 'Account Snapshot',
    summary: 'Profile and order account health in one mobile view.',
    icon: HiOutlineUser,
    links: [
      { to: '/mobile/profile', label: 'Edit Profile' },
      { to: '/mobile/orders', label: 'Order History' },
    ],
  },
};

const FALLBACK_PAGE = {
  title: 'Mobile Workspace',
  summary: 'Live mobile workspace',
  icon: HiOutlineShoppingBag,
  links: [{ to: '/mobile/dashboard', label: 'Dashboard' }],
};

function toList(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.items)) return raw.items;
  return [];
}

function lower(value) {
  return String(value || '').trim().toLowerCase();
}

function isPaid(order) {
  return ['paid', 'verified'].includes(lower(order?.payment_status));
}

async function loadMobileData(pageKey) {
  const ordersRes = await api.get(ORDERS.LIST, { params: { limit: 120 } });
  const orders = toList(ordersRes?.data?.data);

  const trackingByOrderNumber = {};
  if (pageKey === 'delivery') {
    const activeOrders = orders.filter((row) => lower(row.status) === 'delivering').slice(0, 8);
    const trackRes = await Promise.allSettled(
      activeOrders.map((row) => api.get(TRACKING.PUBLIC(row.order_number))),
    );

    activeOrders.forEach((order, idx) => {
      const payload = trackRes[idx]?.status === 'fulfilled'
        ? trackRes[idx].value?.data?.data
        : null;
      trackingByOrderNumber[order.order_number] = payload;
    });
  }

  return { orders, trackingByOrderNumber };
}

function buildView(pageKey, payload, user) {
  const orders = payload.orders || [];
  const trackingByOrderNumber = payload.trackingByOrderNumber || {};

  if (pageKey === 'reorder') {
    const productMap = new Map();

    orders.forEach((order) => {
      (order.items || []).forEach((item) => {
        const key = String(item.product_id || item.product_name || item.sku || item.id);
        if (!productMap.has(key)) {
          productMap.set(key, {
            key,
            product_name: item.product_name || 'Unnamed Product',
            sku: item.sku || '-',
            quantity: 0,
            spend: 0,
            order_count: 0,
            last_ordered_at: order.created_at,
          });
        }

        const entry = productMap.get(key);
        entry.quantity += Number(item.quantity || 0);
        entry.spend += Number(item.subtotal || (Number(item.quantity || 0) * Number(item.unit_price || 0)));
        entry.order_count += 1;
        if (new Date(order.created_at).getTime() > new Date(entry.last_ordered_at).getTime()) {
          entry.last_ordered_at = order.created_at;
        }
      });
    });

    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 8);

    const repeatSkus = topProducts.filter((row) => row.order_count > 1).length;
    const thisMonthOrders = orders.filter((row) => {
      const d = new Date(row.created_at);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    return {
      intro: 'Reorder signals are generated from your historical order items.',
      kpis: [
        { title: 'Top Products', value: topProducts.length, icon: HiOutlineShoppingBag, color: 'bg-orange-50 text-orange-500' },
        { title: 'Repeat SKUs', value: repeatSkus, icon: HiOutlineRefresh, color: 'bg-blue-50 text-blue-500' },
        { title: 'This Month Orders', value: thisMonthOrders, icon: HiOutlineClock, color: 'bg-emerald-50 text-emerald-500' },
        { title: 'Lifetime Orders', value: orders.length, icon: HiOutlineCheckCircle, color: 'bg-violet-50 text-violet-500' },
      ],
      rows: topProducts,
      rowTitle: 'Suggested Reorder Products',
      renderRow: (row) => (
        <div key={row.key} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
          <div className="min-w-0 pr-3">
            <p className="text-sm font-semibold text-gray-900 truncate">{row.product_name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{row.sku}</p>
            <p className="text-xs text-gray-500 mt-1">Last ordered {formatRelative(row.last_ordered_at)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-orange-500">{row.quantity} pcs</p>
            <p className="text-xs text-gray-500 mt-0.5">{formatCurrency(row.spend)}</p>
          </div>
        </div>
      ),
    };
  }

  if (pageKey === 'delivery') {
    const activeOrders = orders.filter((row) => lower(row.status) === 'delivering');
    const deliveredOrders = orders.filter((row) => lower(row.status) === 'delivered');

    const rows = activeOrders.map((order) => {
      const tracking = trackingByOrderNumber[order.order_number] || null;
      return {
        ...order,
        courier: tracking?.courier || 'Not assigned',
        eta: tracking?.eta || null,
        gps_pinged_at: tracking?.gps?.pinged_at || null,
        tracking_status: tracking?.status || order.status,
      };
    });

    const stale = rows.filter((row) => !row.gps_pinged_at || ((Date.now() - new Date(row.gps_pinged_at).getTime()) / 60000) > 45).length;

    return {
      intro: 'Delivery snapshots are based on active order status and public tracking data.',
      kpis: [
        { title: 'Active Deliveries', value: rows.length, icon: HiOutlineLocationMarker, color: 'bg-orange-50 text-orange-500' },
        { title: 'With Live Ping', value: rows.length - stale, icon: HiOutlineCheckCircle, color: 'bg-emerald-50 text-emerald-500' },
        { title: 'Stale / No Ping', value: stale, icon: HiOutlineClock, color: 'bg-red-50 text-red-500' },
        { title: 'Delivered Orders', value: deliveredOrders.length, icon: HiOutlineShoppingBag, color: 'bg-blue-50 text-blue-500' },
      ],
      rows,
      rowTitle: 'Active Delivery List',
      renderRow: (row) => (
        <div key={row.id} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-mono text-sm font-bold text-gray-900">#{row.order_number}</p>
              <p className="text-xs text-gray-400">{formatDate(row.created_at)}</p>
            </div>
            <StatusBadge status={row.tracking_status} />
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-gray-400">Courier</p>
              <p className="font-medium text-gray-700">{row.courier}</p>
            </div>
            <div>
              <p className="text-gray-400">ETA</p>
              <p className="font-medium text-gray-700">{row.eta ? formatDate(row.eta, true) : 'TBD'}</p>
            </div>
            <div>
              <p className="text-gray-400">Last Ping</p>
              <p className={`font-medium ${row.gps_pinged_at ? 'text-gray-700' : 'text-red-600'}`}>
                {row.gps_pinged_at ? formatRelative(row.gps_pinged_at) : 'No ping'}
              </p>
            </div>
            <div>
              <p className="text-gray-400">Amount</p>
              <p className="font-semibold text-orange-500">{formatCurrency(row.total_amount)}</p>
            </div>
          </div>
        </div>
      ),
    };
  }

  const paidOrders = orders.filter((row) => isPaid(row));
  const pendingPayments = orders.filter((row) => lower(row.status) === 'approved' && !isPaid(row));
  const cancelledOrders = orders.filter((row) => ['cancelled', 'rejected'].includes(lower(row.status)));
  const recentOrders = [...orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6);
  const profileScore = [user?.name, user?.email, user?.phone].filter(Boolean).length;

  return {
    intro: 'Account health combines profile completeness and order lifecycle metrics.',
    kpis: [
      { title: 'Total Orders', value: orders.length, icon: HiOutlineShoppingBag, color: 'bg-orange-50 text-orange-500' },
      { title: 'Paid Orders', value: paidOrders.length, icon: HiOutlineCheckCircle, color: 'bg-emerald-50 text-emerald-500' },
      { title: 'Pending Payment', value: pendingPayments.length, icon: HiOutlineClock, color: 'bg-amber-50 text-amber-500' },
      { title: 'Profile Score', value: `${profileScore}/3`, icon: HiOutlineUser, color: 'bg-blue-50 text-blue-500' },
    ],
    rows: recentOrders,
    rowTitle: 'Recent Account Activity',
    renderRow: (row) => (
      <div key={row.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
        <div>
          <p className="font-mono text-sm font-bold text-gray-900">#{row.order_number}</p>
          <p className="text-xs text-gray-400 mt-0.5">{formatDate(row.created_at)}</p>
          <div className="mt-1"><StatusBadge status={row.status} /></div>
        </div>
        <div className="text-right">
          <p className="font-semibold text-sm text-orange-500">{formatCurrency(row.total_amount)}</p>
          <p className="text-xs text-gray-500 mt-0.5">{isPaid(row) ? 'Paid' : 'Unpaid'}</p>
        </div>
      </div>
    ),
    extra: {
      name: user?.name || '-',
      email: user?.email || '-',
      phone: user?.phone || '-',
      cancelledOrders: cancelledOrders.length,
    },
  };
}

function getMobileRowAction(pageKey, row) {
  if (pageKey === 'reorder') {
    return { to: '/mobile/catalog', label: 'Reorder' };
  }

  if (pageKey === 'delivery') {
    if (row?.order_number) {
      return { to: `/track/${row.order_number}`, label: 'Track' };
    }
    return { to: '/mobile/orders', label: 'Open' };
  }

  return { to: '/mobile/orders', label: 'Open' };
}

export default function MobilePhase1Workspace({ pageKey }) {
  const { user } = useAuth();
  const page = PAGE_CONFIG[pageKey] || FALLBACK_PAGE;
  const Icon = page.icon;
  const inFlightRef = useRef(false);

  const [state, setState] = useState({ loading: true, error: '', payload: {} });
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastSyncAt, setLastSyncAt] = useState(null);

  const refreshData = useCallback(async (silent = false) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    if (!silent) {
      setState({ loading: true, error: '', payload: {} });
    } else {
      setState((prev) => ({ ...prev, error: '' }));
    }

    try {
      const payload = await loadMobileData(pageKey);
      setState({ loading: false, error: '', payload });
      setLastSyncAt(new Date().toISOString());
    } catch (err) {
      setState((prev) => ({
        loading: false,
        error: err?.message || 'Failed to load module data',
        payload: silent ? prev.payload : {},
      }));
    } finally {
      inFlightRef.current = false;
    }
  }, [pageKey]);

  useEffect(() => {
    refreshData(false);
  }, [refreshData]);

  useEffect(() => {
    if (!autoRefresh) return undefined;

    const interval = setInterval(() => {
      refreshData(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshData]);

  const view = useMemo(() => buildView(pageKey, state.payload, user), [pageKey, state.payload, user]);

  return (
    <div className="px-4 pt-6 pb-24 min-h-screen bg-white page-enter space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-2">
          <span className="inline-flex items-center rounded-full bg-orange-100 text-orange-700 text-xs font-semibold px-2.5 py-1">
            Live Data
          </span>
          <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
            <Icon className="w-5 h-5" />
          </div>
        </div>
        <h1 className="text-lg font-bold text-gray-900">{page.title}</h1>
        <p className="text-sm text-gray-600 mt-1">{page.summary}</p>
        <p className="text-xs text-gray-500 mt-1.5">{view.intro}</p>
        <p className="text-xs text-gray-400 mt-1">Last sync: {lastSyncAt ? formatRelative(lastSyncAt) : 'Not synced yet'}</p>
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh((prev) => !prev)}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${autoRefresh ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}
          >
            {autoRefresh ? 'Auto: ON' : 'Auto: OFF'}
          </button>
          <button
            onClick={() => refreshData(true)}
            className="rounded-lg bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {state.error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {state.loading
          ? Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
          ))
          : view.kpis.map((kpi) => (
            <div key={kpi.title} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${kpi.color}`}>
                <kpi.icon size={18} />
              </div>
              <p className="text-xl font-bold text-gray-900">{kpi.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{kpi.title}</p>
            </div>
          ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">{view.rowTitle}</h2>

        {state.loading ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" color="warning" />
          </div>
        ) : view.rows.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-400">No records available yet</div>
        ) : (
          <div className="space-y-2.5">
            {view.rows.map((row, idx) => {
              const action = getMobileRowAction(pageKey, row);
              return (
                <div key={row.id || row.key || idx} className="space-y-1.5">
                  {view.renderRow(row)}
                  {action && (
                    <div className="flex justify-end">
                      <Link
                        to={action.to}
                        className="inline-flex items-center rounded-lg bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700"
                      >
                        {action.label}
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {pageKey === 'account' && !state.loading && view.extra && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Profile Snapshot</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-gray-500">Name</span>
              <span className="font-medium text-gray-900 text-right">{view.extra.name}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-gray-500">Email</span>
              <span className="font-medium text-gray-900 text-right">{view.extra.email}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-gray-500">Phone</span>
              <span className="font-medium text-gray-900 text-right">{view.extra.phone}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-gray-500">Cancelled Orders</span>
              <span className="font-medium text-red-600 text-right">{view.extra.cancelledOrders}</span>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Quick Links</h3>
        <div className="space-y-2">
          {page.links.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
            >
              <span>{item.label}</span>
              <HiOutlineArrowRight className="w-4 h-4 text-gray-500" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
