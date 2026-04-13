import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Badge,
  Card,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
} from 'flowbite-react';
import { Link } from 'react-router-dom';
import {
  HiOutlineArrowRight,
  HiOutlineCheckCircle,
  HiOutlineClipboardList,
  HiOutlineClock,
  HiOutlineCreditCard,
  HiOutlineDocumentText,
  HiOutlineExclamationCircle,
  HiOutlineLocationMarker,
  HiOutlineMap,
  HiOutlineShieldCheck,
  HiOutlineTruck,
  HiOutlineUserGroup,
  HiOutlineRefresh,
} from 'react-icons/hi';
import PageHeader from '@/components/PageHeader';
import KpiCard from '@/components/KpiCard';
import EmptyState from '@/components/EmptyState';
import StatusBadge from '@/components/StatusBadge';
import api from '@/services/api';
import { MOBILE_STOCKISTS, ORDERS, REPORTS, TRACKING } from '@/services/endpoints';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDate, formatRelative } from '@/utils/formatDate';

const PAGE_CONFIG = {
  'orders-board': {
    title: 'Order Center: Kanban Orders',
    tab: 'Order Center',
    summary: 'Live status lanes for stockist order flow from pending to delivered.',
    icon: HiOutlineClipboardList,
    links: [
      { to: '/stockist/orders', label: 'Orders List' },
      { to: '/stockist/inventory', label: 'Inventory Snapshot' },
      { to: '/stockist/reports', label: 'Order Performance' },
    ],
  },
  'orders-payments': {
    title: 'Order Center: Payment Status',
    tab: 'Order Center',
    summary: 'Payment proof and deadline posture for approved stockist orders.',
    icon: HiOutlineCreditCard,
    links: [
      { to: '/stockist/orders', label: 'Order Payments' },
      { to: '/stockist/reports', label: 'Payment Turnaround' },
      { to: '/stockist/mobile-stockists', label: 'Mobile Stockists' },
    ],
  },
  'orders-dispatch': {
    title: 'Order Center: Dispatch Readiness',
    tab: 'Order Center',
    summary: 'Paid approvals and in-transit list for dispatch management.',
    icon: HiOutlineTruck,
    links: [
      { to: '/stockist/orders', label: 'Dispatch Candidates' },
      { to: '/stockist/stock-transfers', label: 'Stock Transfers' },
      { to: '/stockist/warehouses', label: 'Warehouse Status' },
    ],
  },
  'delivery-live': {
    title: 'Delivery: Live Deliveries Map',
    tab: 'Delivery',
    summary: 'Active route board using real tracking snapshots per order.',
    icon: HiOutlineMap,
    links: [
      { to: '/stockist/orders', label: 'In-Transit Orders' },
      { to: '/stockist/reports', label: 'Delivery Metrics' },
      { to: '/stockist/dashboard', label: 'Dashboard' },
    ],
  },
  'delivery-couriers': {
    title: 'Delivery: Courier Performance',
    tab: 'Delivery',
    summary: 'Courier health summary based on active order tracking records.',
    icon: HiOutlineClock,
    links: [
      { to: '/stockist/orders', label: 'Assigned Orders' },
      { to: '/stockist/reports', label: 'Reports' },
      { to: '/stockist/dashboard', label: 'Dashboard' },
    ],
  },
  'delivery-pod': {
    title: 'Delivery: Proof of Delivery',
    tab: 'Delivery',
    summary: 'Delivered-order verification board with tracking completion context.',
    icon: HiOutlineShieldCheck,
    links: [
      { to: '/stockist/orders', label: 'Delivered Orders' },
      { to: '/stockist/reports', label: 'Delivery Reports' },
      { to: '/stockist/dashboard', label: 'Operations Summary' },
    ],
  },
  'mobile-stockists-segments': {
    title: 'Mobile Stockists: Segments',
    tab: 'Mobile Stockists',
    summary: 'Segmented mobile stockist list using login recency and status.',
    icon: HiOutlineUserGroup,
    links: [
      { to: '/stockist/mobile-stockists', label: 'Mobile Stockists' },
      { to: '/stockist/orders', label: 'Order Volume' },
      { to: '/stockist/reports', label: 'Reports' },
    ],
  },
  'mobile-stockists-activity': {
    title: 'Mobile Stockists: Activity and Last Login',
    tab: 'Mobile Stockists',
    summary: 'Last-login recency and activity watchlist for field follow-up.',
    icon: HiOutlineLocationMarker,
    links: [
      { to: '/stockist/mobile-stockists', label: 'Mobile Stockists' },
      { to: '/stockist/orders', label: 'Order Activity' },
      { to: '/stockist/reports', label: 'Reports' },
    ],
  },
  'mobile-stockists-risk-signals': {
    title: 'Mobile Stockists: Risk Signals',
    tab: 'Mobile Stockists',
    summary: 'Operational risk score based on status, login recency, and profile completeness.',
    icon: HiOutlineExclamationCircle,
    links: [
      { to: '/stockist/mobile-stockists', label: 'Network Health' },
      { to: '/stockist/orders', label: 'Recent Exceptions' },
      { to: '/stockist/reports', label: 'Risk Analytics' },
    ],
  },
};

const FALLBACK_PAGE = {
  title: 'Stockist Workspace',
  tab: 'Operations',
  summary: 'Live Stockist operations workspace',
  icon: HiOutlineClipboardList,
  links: [{ to: '/stockist/dashboard', label: 'Dashboard' }],
};

function toList(raw, nestedKeys = []) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.items)) return raw.items;
  for (const key of nestedKeys) {
    if (Array.isArray(raw?.[key])) return raw[key];
  }
  return [];
}

function settledData(settled) {
  if (settled.status !== 'fulfilled') return null;
  return settled.value?.data?.data ?? null;
}

function lower(value) {
  return String(value || '').trim().toLowerCase();
}

function isPaid(order) {
  return ['paid', 'verified'].includes(lower(order?.payment_status));
}

function daysSince(isoDate) {
  if (!isoDate) return null;
  const diff = Date.now() - new Date(isoDate).getTime();
  return Math.floor(diff / 86400000);
}

function segmentFromLogin(lastLogin) {
  const days = daysSince(lastLogin);
  if (days === null) return 'dormant';
  if (days <= 7) return 'active';
  if (days <= 30) return 'warming';
  return 'dormant';
}

function byDateDesc(a, b, key = 'created_at') {
  return new Date(b?.[key] || 0).getTime() - new Date(a?.[key] || 0).getTime();
}

async function loadStockistData(pageKey) {
  const [ordersRes, mobileRes, movementRes] = await Promise.allSettled([
    api.get(ORDERS.LIST, { params: { limit: 250 } }),
    api.get(MOBILE_STOCKISTS.LIST, { params: { page: 1, limit: 250 } }),
    api.get(REPORTS.MOVEMENTS, { params: { from: '', to: '' } }),
  ]);

  const orders = toList(settledData(ordersRes));
  const mobileStockists = toList(settledData(mobileRes));
  const movements = toList(settledData(movementRes), ['movements']);

  let tracking = [];
  if (String(pageKey || '').startsWith('delivery-')) {
    const trackingCandidateOrders = orders
      .filter((row) => ['delivering', 'delivered'].includes(lower(row.status)))
      .slice(0, 12);

    const trackingRes = await Promise.allSettled(
      trackingCandidateOrders.map((row) => api.get(TRACKING.BY_ORDER(row.id))),
    );

    tracking = trackingRes
      .filter((row) => row.status === 'fulfilled')
      .map((row) => row.value?.data?.data)
      .filter(Boolean);
  }

  return { orders, mobileStockists, movements, tracking };
}

function buildView(pageKey, payload) {
  const orders = payload.orders || [];
  const mobileStockists = payload.mobileStockists || [];
  const tracking = payload.tracking || [];

  const pending = orders.filter((row) => lower(row.status) === 'pending');
  const approved = orders.filter((row) => lower(row.status) === 'approved');
  const approvedUnpaid = approved.filter((row) => !isPaid(row));
  const approvedPaid = approved.filter((row) => isPaid(row));
  const delivering = orders.filter((row) => lower(row.status) === 'delivering');
  const delivered = orders.filter((row) => lower(row.status) === 'delivered');
  const cancelled = orders.filter((row) => ['cancelled', 'rejected'].includes(lower(row.status)));

  const trackingByOrder = new Map(tracking.map((row) => [Number(row.order_id), row]));

  if (pageKey === 'orders-board') {
    const rows = [...orders].sort((a, b) => byDateDesc(a, b)).slice(0, 15);
    return {
      intro: 'Live order lanes from current stockist-scoped order data.',
      kpis: [
        { title: 'Pending', value: pending.length, icon: HiOutlineClock, iconBg: 'bg-amber-100' },
        { title: 'Approved', value: approved.length, icon: HiOutlineCheckCircle, iconBg: 'bg-blue-100' },
        { title: 'Delivering', value: delivering.length, icon: HiOutlineTruck, iconBg: 'bg-violet-100' },
        { title: 'Delivered', value: delivered.length, icon: HiOutlineShieldCheck, iconBg: 'bg-green-100' },
      ],
      tableTitle: 'Live Order Queue',
      rows,
      columns: [
        { label: 'Order', render: (row) => <span className="font-mono text-xs font-semibold">#{row.order_number}</span> },
        { label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
        { label: 'Payment', render: (row) => <StatusBadge status={row.payment_status || 'unpaid'} /> },
        { label: 'Items', render: (row) => row.items?.length || 0 },
        { label: 'Total', render: (row) => <span className="font-semibold">{formatCurrency(row.total_amount)}</span> },
        { label: 'Created', render: (row) => <span className="text-xs text-gray-500">{formatRelative(row.created_at)}</span> },
      ],
      insights: [
        `${approvedPaid.length} orders are paid and ready for dispatch progression.`,
        `${cancelled.length} orders are currently in cancellation or rejection states.`,
      ],
    };
  }

  if (pageKey === 'orders-payments') {
    const rows = [...approved].sort((a, b) => byDateDesc(a, b)).slice(0, 15);
    const uploadedProof = approvedUnpaid.filter((row) => row.payment_proof_url);
    const noProof = approvedUnpaid.filter((row) => !row.payment_proof_url);

    return {
      intro: 'Payment queue and proof visibility for approved orders.',
      kpis: [
        { title: 'Approved Unpaid', value: approvedUnpaid.length, icon: HiOutlineClock, iconBg: 'bg-amber-100' },
        { title: 'Proof Uploaded', value: uploadedProof.length, icon: HiOutlineDocumentText, iconBg: 'bg-blue-100' },
        { title: 'Awaiting Proof', value: noProof.length, icon: HiOutlineExclamationCircle, iconBg: 'bg-red-100' },
        { title: 'Paid Orders', value: orders.filter((row) => isPaid(row)).length, icon: HiOutlineCreditCard, iconBg: 'bg-green-100' },
      ],
      tableTitle: 'Payment Status Board',
      rows,
      columns: [
        { label: 'Order', render: (row) => <span className="font-mono text-xs font-semibold">#{row.order_number}</span> },
        { label: 'Payment', render: (row) => <StatusBadge status={row.payment_status || 'unpaid'} /> },
        {
          label: 'Proof',
          render: (row) => (
            row.payment_proof_url
              ? <a href={row.payment_proof_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">View file</a>
              : <span className="text-xs text-gray-400">No upload</span>
          ),
        },
        { label: 'Deadline', render: (row) => (row.payment_deadline ? <span className="text-xs">{formatDate(row.payment_deadline, true)}</span> : <span className="text-xs text-gray-400">-</span>) },
        { label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
        { label: 'Amount', render: (row) => <span className="font-semibold">{formatCurrency(row.total_amount)}</span> },
      ],
      insights: [
        `${uploadedProof.length} orders have payment proof waiting for verification.`,
        `${noProof.length} approved orders still require stockist proof upload.`,
      ],
    };
  }

  if (pageKey === 'orders-dispatch') {
    const rows = [...approvedPaid, ...delivering].sort((a, b) => byDateDesc(a, b)).slice(0, 15);
    return {
      intro: 'Dispatch readiness using paid approvals and in-transit records.',
      kpis: [
        { title: 'Ready To Dispatch', value: approvedPaid.length, icon: HiOutlineCheckCircle, iconBg: 'bg-green-100' },
        { title: 'In Transit', value: delivering.length, icon: HiOutlineTruck, iconBg: 'bg-blue-100' },
        { title: 'Pending Payment', value: approvedUnpaid.length, icon: HiOutlineClock, iconBg: 'bg-amber-100' },
        { title: 'Dispatch Blockers', value: cancelled.length, icon: HiOutlineExclamationCircle, iconBg: 'bg-red-100' },
      ],
      tableTitle: 'Dispatch Pipeline',
      rows,
      columns: [
        { label: 'Order', render: (row) => <span className="font-mono text-xs font-semibold">#{row.order_number}</span> },
        { label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
        { label: 'Payment', render: (row) => <StatusBadge status={row.payment_status || 'unpaid'} /> },
        { label: 'Dispatch Signal', render: (row) => <span className="text-xs font-medium text-green-700">{lower(row.status) === 'approved' ? 'Assign courier' : 'Monitor route'}</span> },
        { label: 'Total', render: (row) => <span className="font-semibold">{formatCurrency(row.total_amount)}</span> },
        { label: 'Created', render: (row) => <span className="text-xs text-gray-500">{formatRelative(row.created_at)}</span> },
      ],
      insights: [
        `${approvedPaid.length} orders can move to courier dispatch now.`,
        `${approvedUnpaid.length} approved orders are paused until payment clears.`,
      ],
    };
  }

  if (pageKey === 'delivery-live') {
    const rows = delivering.map((order) => {
      const tr = trackingByOrder.get(Number(order.id));
      return {
        ...order,
        courier_name: tr?.courier_name || tr?.rider_name || 'Not assigned',
        latest_ping: tr?.latest_ping?.pinged_at || null,
        tracking_status: tr?.status || null,
      };
    });
    const stale = rows.filter((row) => !row.latest_ping || ((Date.now() - new Date(row.latest_ping).getTime()) / 60000) > 45);

    return {
      intro: 'Live delivery board from order and tracking snapshots.',
      kpis: [
        { title: 'Active Deliveries', value: rows.length, icon: HiOutlineTruck, iconBg: 'bg-blue-100' },
        { title: 'Fresh Pings', value: rows.length - stale.length, icon: HiOutlineCheckCircle, iconBg: 'bg-green-100' },
        { title: 'Stale Pings', value: stale.length, icon: HiOutlineExclamationCircle, iconBg: 'bg-red-100' },
        { title: 'Delivered Today', value: delivered.filter((row) => new Date(row.delivered_at || row.created_at).toDateString() === new Date().toDateString()).length, icon: HiOutlineShieldCheck, iconBg: 'bg-violet-100' },
      ],
      tableTitle: 'Active Delivery Routes',
      rows,
      columns: [
        { label: 'Order', render: (row) => <span className="font-mono text-xs font-semibold">#{row.order_number}</span> },
        { label: 'Courier', render: (row) => <span className="text-xs">{row.courier_name}</span> },
        { label: 'Order Status', render: (row) => <StatusBadge status={row.status} /> },
        { label: 'Tracking', render: (row) => row.tracking_status ? <StatusBadge status={row.tracking_status} /> : <span className="text-xs text-gray-400">No tracking</span> },
        { label: 'Last Ping', render: (row) => row.latest_ping ? <span className="text-xs text-gray-500">{formatRelative(row.latest_ping)}</span> : <span className="text-xs text-red-600">Missing</span> },
        { label: 'Total', render: (row) => <span className="font-semibold">{formatCurrency(row.total_amount)}</span> },
      ],
      insights: [
        `${stale.length} active routes have stale or missing pings and may need follow-up.`,
        `${rows.length} delivery orders are actively being monitored.`,
      ],
    };
  }

  if (pageKey === 'delivery-couriers') {
    const courierMap = new Map();
    tracking.forEach((row) => {
      const name = row.courier_name || row.rider_name || 'Unassigned';
      if (!courierMap.has(name)) {
        courierMap.set(name, { courier_name: name, total: 0, active: 0, delivered: 0, stale: 0 });
      }
      const entry = courierMap.get(name);
      entry.total += 1;
      if (['out_for_delivery', 'in_progress'].includes(lower(row.status))) entry.active += 1;
      if (row.delivered_at || lower(row.status) === 'delivered') entry.delivered += 1;
      if (!row.latest_ping?.pinged_at || ((Date.now() - new Date(row.latest_ping.pinged_at).getTime()) / 60000) > 45) entry.stale += 1;
    });

    const rows = Array.from(courierMap.values()).sort((a, b) => b.total - a.total);

    return {
      intro: 'Courier performance snapshot from available tracking records.',
      kpis: [
        { title: 'Courier Records', value: rows.length, icon: HiOutlineUserGroup, iconBg: 'bg-blue-100' },
        { title: 'Active Trips', value: rows.reduce((sum, row) => sum + row.active, 0), icon: HiOutlineTruck, iconBg: 'bg-amber-100' },
        { title: 'Delivered Trips', value: rows.reduce((sum, row) => sum + row.delivered, 0), icon: HiOutlineCheckCircle, iconBg: 'bg-green-100' },
        { title: 'Stale Signals', value: rows.reduce((sum, row) => sum + row.stale, 0), icon: HiOutlineExclamationCircle, iconBg: 'bg-red-100' },
      ],
      tableTitle: 'Courier Scoreboard',
      rows,
      columns: [
        { label: 'Courier', render: (row) => <span className="font-medium">{row.courier_name}</span> },
        { label: 'Tracked Orders', render: (row) => row.total },
        { label: 'Active', render: (row) => row.active },
        { label: 'Delivered', render: (row) => row.delivered },
        { label: 'Stale Ping', render: (row) => <span className={`font-semibold ${row.stale > 0 ? 'text-red-700' : 'text-emerald-700'}`}>{row.stale}</span> },
      ],
      insights: [
        `${rows.filter((row) => row.stale > 0).length} courier entries show stale tracking signals.`,
        `${rows.reduce((sum, row) => sum + row.delivered, 0)} tracked deliveries have completion markers.`,
      ],
    };
  }

  if (pageKey === 'delivery-pod') {
    const rows = delivered
      .map((order) => {
        const tr = trackingByOrder.get(Number(order.id));
        return {
          ...order,
          delivered_at_tracking: tr?.delivered_at || null,
          courier_name: tr?.courier_name || tr?.rider_name || 'Not recorded',
          pod_status: tr?.delivered_at || lower(order.status) === 'delivered' ? 'completed' : 'pending',
        };
      })
      .sort((a, b) => byDateDesc(a, b, 'delivered_at'))
      .slice(0, 15);

    const completePods = rows.filter((row) => row.pod_status === 'completed').length;

    return {
      intro: 'Delivery completion audit board for proof-of-delivery monitoring.',
      kpis: [
        { title: 'Delivered Orders', value: delivered.length, icon: HiOutlineShieldCheck, iconBg: 'bg-green-100' },
        { title: 'POD Completed', value: completePods, icon: HiOutlineCheckCircle, iconBg: 'bg-blue-100' },
        { title: 'Pending Validation', value: Math.max(0, delivered.length - completePods), icon: HiOutlineClock, iconBg: 'bg-amber-100' },
        { title: 'Delivery Exceptions', value: cancelled.length, icon: HiOutlineExclamationCircle, iconBg: 'bg-red-100' },
      ],
      tableTitle: 'Delivery Completion Board',
      rows,
      columns: [
        { label: 'Order', render: (row) => <span className="font-mono text-xs font-semibold">#{row.order_number}</span> },
        { label: 'Courier', render: (row) => row.courier_name },
        { label: 'Order Status', render: (row) => <StatusBadge status={row.status} /> },
        { label: 'POD', render: (row) => <StatusBadge status={row.pod_status} /> },
        { label: 'Delivered', render: (row) => <span className="text-xs text-gray-500">{formatDate(row.delivered_at || row.delivered_at_tracking, true)}</span> },
        { label: 'Total', render: (row) => <span className="font-semibold">{formatCurrency(row.total_amount)}</span> },
      ],
      insights: [
        `${Math.max(0, delivered.length - completePods)} delivered orders still need final completion validation.`,
        `${cancelled.length} orders are in cancelled or rejected state and should be excluded from POD metrics.`,
      ],
    };
  }

  const orderSignalByIdentity = new Map();
  orders.forEach((row) => {
    const emailKey = String(row.customer_email || '').trim().toLowerCase();
    const phoneKey = String(row.customer_phone || '').trim();
    if (emailKey) orderSignalByIdentity.set(`email:${emailKey}`, (orderSignalByIdentity.get(`email:${emailKey}`) || 0) + 1);
    if (phoneKey) orderSignalByIdentity.set(`phone:${phoneKey}`, (orderSignalByIdentity.get(`phone:${phoneKey}`) || 0) + 1);
  });

  const mobileRows = mobileStockists.map((row) => {
    const segment = segmentFromLogin(row.last_login);
    const orderSignals = (orderSignalByIdentity.get(`email:${String(row.email || '').toLowerCase()}`) || 0)
      + (orderSignalByIdentity.get(`phone:${String(row.phone || '')}`) || 0);

    let riskScore = 0;
    if (segment === 'dormant') riskScore += 2;
    if (lower(row.status) !== 'active') riskScore += 2;
    if (!row.phone) riskScore += 1;

    return {
      ...row,
      segment,
      order_signals: orderSignals,
      risk_score: riskScore,
    };
  });

  if (pageKey === 'mobile-stockists-segments') {
    const activeSegment = mobileRows.filter((row) => row.segment === 'active').length;
    const warmingSegment = mobileRows.filter((row) => row.segment === 'warming').length;
    const dormantSegment = mobileRows.filter((row) => row.segment === 'dormant').length;

    return {
      intro: 'Segmentation board based on recency and activity signals.',
      kpis: [
        { title: 'Active Segment', value: activeSegment, icon: HiOutlineCheckCircle, iconBg: 'bg-green-100' },
        { title: 'Warming Segment', value: warmingSegment, icon: HiOutlineClock, iconBg: 'bg-amber-100' },
        { title: 'Dormant Segment', value: dormantSegment, icon: HiOutlineExclamationCircle, iconBg: 'bg-red-100' },
        { title: 'Total Mobile Stockists', value: mobileRows.length, icon: HiOutlineUserGroup, iconBg: 'bg-blue-100' },
      ],
      tableTitle: 'Segmented Mobile Stockists',
      rows: [...mobileRows].sort((a, b) => b.order_signals - a.order_signals),
      columns: [
        { label: 'Name', render: (row) => <span className="font-medium">{row.name}</span> },
        { label: 'Status', render: (row) => <StatusBadge status={row.status || 'active'} /> },
        { label: 'Segment', render: (row) => <span className="text-xs capitalize">{row.segment}</span> },
        { label: 'Order Signals', render: (row) => row.order_signals },
        { label: 'Last Login', render: (row) => row.last_login ? <span className="text-xs text-gray-500">{formatRelative(row.last_login)}</span> : <span className="text-xs text-gray-400">No login</span> },
      ],
      insights: [
        `${dormantSegment} mobile stockists are dormant and may need reactivation outreach.`,
        `${activeSegment} mobile stockists logged in within the last 7 days.`,
      ],
    };
  }

  if (pageKey === 'mobile-stockists-activity') {
    const recentLogins = mobileRows.filter((row) => {
      const days = daysSince(row.last_login);
      return days !== null && days <= 7;
    }).length;
    const noLogin = mobileRows.filter((row) => !row.last_login).length;

    return {
      intro: 'Activity watchlist highlighting login freshness and inactivity gaps.',
      kpis: [
        { title: 'Logged In <= 7d', value: recentLogins, icon: HiOutlineCheckCircle, iconBg: 'bg-green-100' },
        { title: 'No Login Yet', value: noLogin, icon: HiOutlineClock, iconBg: 'bg-amber-100' },
        { title: 'Inactive/Suspended', value: mobileRows.filter((row) => ['inactive', 'suspended'].includes(lower(row.status))).length, icon: HiOutlineExclamationCircle, iconBg: 'bg-red-100' },
        { title: 'Tracked Accounts', value: mobileRows.length, icon: HiOutlineUserGroup, iconBg: 'bg-blue-100' },
      ],
      tableTitle: 'Activity Timeline',
      rows: [...mobileRows].sort((a, b) => {
        const da = daysSince(a.last_login);
        const db = daysSince(b.last_login);
        if (da === null && db === null) return 0;
        if (da === null) return 1;
        if (db === null) return -1;
        return da - db;
      }),
      columns: [
        { label: 'Name', render: (row) => <span className="font-medium">{row.name}</span> },
        { label: 'Email', render: (row) => <span className="text-xs">{row.email}</span> },
        { label: 'Status', render: (row) => <StatusBadge status={row.status || 'active'} /> },
        { label: 'Last Login', render: (row) => row.last_login ? <span className="text-xs text-gray-500">{formatDate(row.last_login, true)}</span> : <span className="text-xs text-gray-400">No login</span> },
        { label: 'Recency', render: (row) => row.last_login ? <span className="text-xs text-gray-500">{formatRelative(row.last_login)}</span> : <span className="text-xs text-red-600">Dormant</span> },
      ],
      insights: [
        `${noLogin} accounts have no recorded login and may require onboarding support.`,
        `${recentLogins} accounts are currently active in the last 7 days.`,
      ],
    };
  }

  const highRisk = mobileRows.filter((row) => row.risk_score >= 3).length;
  const mediumRisk = mobileRows.filter((row) => row.risk_score === 2).length;

  return {
    intro: 'Risk signals derived from profile completeness, status, and login recency.',
    kpis: [
      { title: 'High Risk', value: highRisk, icon: HiOutlineExclamationCircle, iconBg: 'bg-red-100' },
      { title: 'Medium Risk', value: mediumRisk, icon: HiOutlineClock, iconBg: 'bg-amber-100' },
      { title: 'Low Risk', value: Math.max(0, mobileRows.length - highRisk - mediumRisk), icon: HiOutlineCheckCircle, iconBg: 'bg-green-100' },
      { title: 'Total Mobile Stockists', value: mobileRows.length, icon: HiOutlineUserGroup, iconBg: 'bg-blue-100' },
    ],
    tableTitle: 'Risk Signal Board',
    rows: [...mobileRows].sort((a, b) => b.risk_score - a.risk_score),
    columns: [
      { label: 'Name', render: (row) => <span className="font-medium">{row.name}</span> },
      { label: 'Status', render: (row) => <StatusBadge status={row.status || 'active'} /> },
      { label: 'Segment', render: (row) => <span className="text-xs capitalize">{row.segment}</span> },
      { label: 'Risk Score', render: (row) => <span className={`font-semibold ${row.risk_score >= 3 ? 'text-red-700' : row.risk_score === 2 ? 'text-amber-700' : 'text-green-700'}`}>{row.risk_score}</span> },
      { label: 'Last Login', render: (row) => row.last_login ? <span className="text-xs text-gray-500">{formatRelative(row.last_login)}</span> : <span className="text-xs text-red-600">No login</span> },
    ],
    insights: [
      `${highRisk} mobile stockists require immediate follow-up based on risk score.`,
      `${mobileRows.filter((row) => !row.phone).length} profiles are missing phone contact information.`,
    ],
  };
}

function getStockistRowAction(pageKey, row) {
  if (String(pageKey || '').startsWith('mobile-stockists-')) {
    return { to: '/stockist/mobile-stockists', label: 'Open' };
  }

  if (pageKey === 'delivery-live' && row?.order_number) {
    return { to: `/track/${row.order_number}`, label: 'Track' };
  }

  if (String(pageKey || '').startsWith('delivery-')) {
    return { to: '/stockist/orders', label: 'Open' };
  }

  return { to: '/stockist/orders', label: 'Open' };
}

export default function StockistPhase1Workspace({ pageKey }) {
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
      const payload = await loadStockistData(pageKey);
      setState({ loading: false, error: '', payload });
      setLastSyncAt(new Date().toISOString());
    } catch (err) {
      setState((prev) => ({
        loading: false,
        error: err?.message || 'Failed to load workspace data',
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

  const view = useMemo(() => buildView(pageKey, state.payload), [pageKey, state.payload]);

  return (
    <div className="space-y-5 page-enter p-4 md:p-6 min-h-screen" style={{ background: '#FFF8F0' }}>
      <PageHeader
        title={page.title}
        actions={[
          {
            label: autoRefresh ? 'Auto: ON' : 'Auto: OFF',
            color: autoRefresh ? 'success' : 'light',
            onClick: () => setAutoRefresh((prev) => !prev),
          },
          {
            label: 'Refresh',
            icon: <HiOutlineRefresh className="w-4 h-4" />,
            color: 'light',
            onClick: () => refreshData(true),
          },
        ]}
      />

      <Card className="border-l-4 border-l-green-600">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge color="success">{page.tab}</Badge>
              <Badge color="success">Live Data</Badge>
            </div>
            <p className="text-sm text-gray-600">{page.summary}</p>
            <p className="text-xs text-gray-500">{view.intro}</p>
            <p className="text-xs text-gray-400">Last sync: {lastSyncAt ? formatRelative(lastSyncAt) : 'Not synced yet'}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-green-100 text-green-700 flex items-center justify-center">
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </Card>

      {state.error && (
        <Card className="border border-red-200 bg-red-50">
          <div className="flex items-start gap-2 text-sm text-red-700">
            <HiOutlineExclamationCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <p>{state.error}</p>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {state.loading
          ? Array.from({ length: 4 }).map((_, idx) => (
            <Card key={idx} className="p-0">
              <div className="h-20 animate-pulse bg-gray-100 rounded-lg" />
            </Card>
          ))
          : view.kpis.map((kpi) => (
            <KpiCard
              key={kpi.title}
              title={kpi.title}
              value={kpi.value}
              icon={kpi.icon}
              iconBg={kpi.iconBg}
            />
          ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">{view.tableTitle}</h3>

          {state.loading ? (
            <div className="flex justify-center py-10">
              <Spinner size="lg" color="warning" />
            </div>
          ) : view.rows.length === 0 ? (
            <EmptyState
              icon={HiOutlineClipboardList}
              title="No records found"
              description="No live records currently match this workspace view."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table striped>
                <TableHead>
                  <TableRow>
                    {view.columns.map((column) => (
                      <TableHeadCell key={column.label}>{column.label}</TableHeadCell>
                    ))}
                    <TableHeadCell>Action</TableHeadCell>
                  </TableRow>
                </TableHead>
                <TableBody className="divide-y">
                  {view.rows.map((row, idx) => (
                    <TableRow key={row.id || `${row.name || 'row'}-${idx}`} className="hover:bg-green-50/30">
                      {view.columns.map((column) => (
                        <TableCell key={column.label}>{column.render(row)}</TableCell>
                      ))}
                      <TableCell>
                        {(() => {
                          const action = getStockistRowAction(pageKey, row);
                          if (!action) return <span className="text-xs text-gray-400">-</span>;
                          return (
                            <Link
                              to={action.to}
                              className="inline-flex items-center rounded-lg bg-green-100 px-2 py-1 text-xs font-semibold text-green-700 hover:bg-green-200"
                            >
                              {action.label}
                            </Link>
                          );
                        })()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Live Insights</h3>
          <div className="space-y-2">
            {view.insights.map((item) => (
              <div key={item} className="flex items-start gap-2 text-sm text-gray-600">
                <HiOutlineCheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-gray-100">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Related Pages</h4>
            <div className="space-y-2">
              {page.links.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <span>{item.label}</span>
                  <HiOutlineArrowRight className="w-4 h-4 text-gray-500" />
                </Link>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
