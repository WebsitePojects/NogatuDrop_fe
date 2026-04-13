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
import { Link, useParams } from 'react-router-dom';
import {
  HiOutlineArrowRight,
  HiOutlineChartBar,
  HiOutlineCheckCircle,
  HiOutlineClipboardCheck,
  HiOutlineClipboardList,
  HiOutlineClock,
  HiOutlineCube,
  HiOutlineCurrencyDollar,
  HiOutlineDocumentText,
  HiOutlineExclamationCircle,
  HiOutlineOfficeBuilding,
  HiOutlineRefresh,
  HiOutlineTruck,
  HiOutlineUserGroup,
} from 'react-icons/hi';
import PageHeader from '@/components/PageHeader';
import KpiCard from '@/components/KpiCard';
import EmptyState from '@/components/EmptyState';
import StatusBadge from '@/components/StatusBadge';
import api from '@/services/api';
import {
  APPLICATIONS,
  BANK_ACCOUNTS,
  COURIERS,
  INVENTORY,
  ORDERS,
  REPORTS,
  STOCK_TRANSFERS,
  TRACKING,
  WAREHOUSES,
} from '@/services/endpoints';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDate, formatRelative } from '@/utils/formatDate';

const PAGE_CONFIG = {
  'operations-control-tower': {
    title: 'Control Tower',
    tab: 'Operations',
    summary: 'Live queue health across order intake, dispatch readiness, and deliveries.',
    icon: HiOutlineClipboardList,
    group: 'operations',
    links: [
      { to: '/main/orders', label: 'Open Orders' },
      { to: '/main/stock-transfers', label: 'Stock Transfers' },
      { to: '/main/couriers', label: 'Courier Directory' },
    ],
  },
  'operations-dispatch-board': {
    title: 'Dispatch Board',
    tab: 'Operations',
    summary: 'Live dispatch lane for paid approvals, transfer readiness, and handoff velocity.',
    icon: HiOutlineTruck,
    group: 'operations',
    links: [
      { to: '/main/orders', label: 'Order Queue' },
      { to: '/main/stock-transfers', label: 'Transfer Queue' },
      { to: '/main/couriers', label: 'Courier Workspace' },
    ],
  },
  'operations-exceptions': {
    title: 'Delivery Exceptions',
    tab: 'Operations',
    summary: 'Live exception feed for cancellations, rejections, and stale in-transit pings.',
    icon: HiOutlineExclamationCircle,
    group: 'operations',
    links: [
      { to: '/main/orders', label: 'Order Exceptions' },
      { to: '/main/reports', label: 'Operations Reports' },
      { to: '/main/couriers', label: 'Courier Contacts' },
    ],
  },
  'payments-queue': {
    title: 'Payment Verification Queue',
    tab: 'Payments',
    summary: 'Real-time payment proof verification queue with deadline risk monitoring.',
    icon: HiOutlineCurrencyDollar,
    group: 'payments',
    links: [
      { to: '/main/orders', label: 'Orders Needing Verification' },
      { to: '/main/bank-accounts', label: 'Bank Accounts' },
      { to: '/main/reports', label: 'Payment Analytics' },
    ],
  },
  'payments-routing': {
    title: 'Regional Bank Routing',
    tab: 'Payments',
    summary: 'Warehouse-to-bank account routing coverage using current master data.',
    icon: HiOutlineOfficeBuilding,
    group: 'payments',
    links: [
      { to: '/main/bank-accounts', label: 'Bank Mapping' },
      { to: '/main/warehouses', label: 'Warehouse List' },
      { to: '/main/orders', label: 'Approved Orders' },
    ],
  },
  'payments-settlements': {
    title: 'Settlement Monitor',
    tab: 'Payments',
    summary: 'Live paid-order settlement watchlist with delivery completion context.',
    icon: HiOutlineClock,
    group: 'payments',
    links: [
      { to: '/main/orders', label: 'Paid Orders' },
      { to: '/main/reports', label: 'Revenue Reports' },
      { to: '/main/partners', label: 'Stockist Accounts' },
    ],
  },
  'stock-replenishment': {
    title: 'Replenishment Planner',
    tab: 'Stock Health',
    summary: 'Low-stock live board prioritized by urgency and warehouse exposure.',
    icon: HiOutlineCube,
    group: 'stock',
    links: [
      { to: '/main/inventory', label: 'Inventory Snapshot' },
      { to: '/main/purchase-orders', label: 'Purchase Orders' },
      { to: '/main/stock-movements', label: 'Stock Movements' },
    ],
  },
  'stock-expiry-risk': {
    title: 'Expiry Risk Board',
    tab: 'Stock Health',
    summary: 'Batch-level expiry risk list for immediate movement and liquidation actions.',
    icon: HiOutlineExclamationCircle,
    group: 'stock',
    links: [
      { to: '/main/inventory', label: 'Batch Inventory' },
      { to: '/main/stock-transfers', label: 'Transfers' },
      { to: '/main/reports', label: 'Product Reports' },
    ],
  },
  'stock-capacity': {
    title: 'Warehouse Capacity Heatmap',
    tab: 'Stock Health',
    summary: 'Live warehouse load, low-stock pressure, and balancing opportunities.',
    icon: HiOutlineChartBar,
    group: 'stock',
    links: [
      { to: '/main/warehouses', label: 'Warehouses' },
      { to: '/main/stock-transfers', label: 'Transfer Planner' },
      { to: '/main/reports', label: 'Movement Reports' },
    ],
  },
  'applications-pipeline': {
    title: 'Applications Pipeline Board',
    tab: 'Applications',
    summary: 'Live funnel of Stockist applications from pending to approved conversion.',
    icon: HiOutlineClipboardCheck,
    group: 'applications',
    links: [
      { to: '/main/applications', label: 'Application Queue' },
      { to: '/main/partners', label: 'Converted Stockists' },
      { to: '/main/users', label: 'Provisioned Users' },
    ],
  },
  'applications-review': {
    title: 'KYC Review Workspace',
    tab: 'Applications',
    summary: 'Detailed review queue with live applicant details and document links.',
    icon: HiOutlineCheckCircle,
    group: 'applications',
    links: [
      { to: '/main/applications', label: 'Back to Applications' },
      { to: '/main/partners', label: 'Stockist Registry' },
      { to: '/main/users', label: 'User Provisioning' },
    ],
  },
  'applications-analytics': {
    title: 'Conversion Analytics',
    tab: 'Applications',
    summary: 'Live approval/rejection analytics and turnaround quality signals.',
    icon: HiOutlineChartBar,
    group: 'applications',
    links: [
      { to: '/main/applications', label: 'Applications' },
      { to: '/main/reports', label: 'Reports' },
      { to: '/main/partners', label: 'Active Stockists' },
    ],
  },
};

const FALLBACK_PAGE = {
  title: 'Operations Workspace',
  tab: 'Operations',
  summary: 'Live module workspace',
  icon: HiOutlineClipboardList,
  group: 'operations',
  links: [{ to: '/main/dashboard', label: 'Dashboard' }],
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

function daysUntil(isoDate) {
  if (!isoDate) return null;
  const diffMs = new Date(isoDate).getTime() - Date.now();
  return Math.ceil(diffMs / 86400000);
}

function isToday(isoDate) {
  if (!isoDate) return false;
  const d = new Date(isoDate);
  const now = new Date();
  return d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate();
}

function byDateDesc(a, b, key = 'created_at') {
  return new Date(b?.[key] || 0).getTime() - new Date(a?.[key] || 0).getTime();
}

async function loadModuleData(group, selectedApplicationId) {
  if (group === 'operations') {
    const [ordersRes, transfersRes, activeRes, couriersRes] = await Promise.allSettled([
      api.get(ORDERS.LIST, { params: { limit: 200 } }),
      api.get(STOCK_TRANSFERS.LIST, { params: { limit: 200 } }),
      api.get(TRACKING.ACTIVE),
      api.get(COURIERS.LIST, { params: { limit: 200 } }),
    ]);

    return {
      orders: toList(settledData(ordersRes)),
      transfers: toList(settledData(transfersRes)),
      activeTracking: toList(settledData(activeRes)),
      couriers: toList(settledData(couriersRes)),
    };
  }

  if (group === 'payments') {
    const [ordersRes, accountsRes, warehousesRes, revenueRes] = await Promise.allSettled([
      api.get(ORDERS.LIST, { params: { limit: 200 } }),
      api.get(BANK_ACCOUNTS.LIST, { params: { limit: 300 } }),
      api.get(WAREHOUSES.LIST, { params: { limit: 300 } }),
      api.get(REPORTS.REVENUE),
    ]);

    return {
      orders: toList(settledData(ordersRes)),
      bankAccounts: toList(settledData(accountsRes)),
      warehouses: toList(settledData(warehousesRes)),
      revenue: settledData(revenueRes) || {},
    };
  }

  if (group === 'stock') {
    const [inventoryRes, transfersRes, movementRes] = await Promise.allSettled([
      api.get(INVENTORY.LIST, { params: { limit: 400 } }),
      api.get(STOCK_TRANSFERS.LIST, { params: { limit: 200 } }),
      api.get(REPORTS.MOVEMENTS, { params: { from: '', to: '' } }),
    ]);

    return {
      inventory: toList(settledData(inventoryRes)),
      transfers: toList(settledData(transfersRes)),
      movements: toList(settledData(movementRes), ['movements']),
    };
  }

  const [appsRes, partnersRes, appDetailRes] = await Promise.allSettled([
    api.get(APPLICATIONS.LIST, { params: { limit: 300, page: 1 } }),
    api.get('/partners', { params: { limit: 300 } }),
    selectedApplicationId ? api.get(APPLICATIONS.BY_ID(selectedApplicationId)) : Promise.resolve({ data: { data: null } }),
  ]);

  return {
    applications: toList(settledData(appsRes)),
    partners: toList(settledData(partnersRes)),
    selectedApplication: settledData(appDetailRes),
  };
}

function buildView(key, page, payload) {
  const orders = payload.orders || [];
  const transfers = payload.transfers || [];
  const activeTracking = payload.activeTracking || [];
  const couriers = payload.couriers || [];
  const bankAccounts = payload.bankAccounts || [];
  const warehouses = payload.warehouses || [];
  const inventory = payload.inventory || [];
  const movements = payload.movements || [];
  const applications = payload.applications || [];
  const selectedApplication = payload.selectedApplication || null;

  const staleTracking = activeTracking.filter((row) => {
    if (!row.last_pinged_at) return true;
    const mins = (Date.now() - new Date(row.last_pinged_at).getTime()) / 60000;
    return mins > 60;
  });

  const approvedUnpaid = orders.filter((row) => lower(row.status) === 'approved' && !isPaid(row));
  const approvedPaid = orders.filter((row) => lower(row.status) === 'approved' && isPaid(row));
  const deliveringOrders = orders.filter((row) => lower(row.status) === 'delivering');
  const paidOrders = orders.filter((row) => isPaid(row));
  const lowStock = inventory.filter((row) => ['low_stock', 'out_of_stock'].includes(lower(row.status)));
  const expiringRows = inventory
    .map((row) => ({ ...row, days_left: daysUntil(row.expiry_date) }))
    .filter((row) => row.days_left !== null && row.days_left <= 30)
    .sort((a, b) => (a.days_left ?? 0) - (b.days_left ?? 0));

  const detailCard = selectedApplication || applications[0] || null;

  if (key === 'operations-control-tower') {
    const queueRows = orders
      .filter((row) => ['pending', 'approved', 'delivering'].includes(lower(row.status)))
      .sort((a, b) => byDateDesc(a, b))
      .slice(0, 12);

    return {
      intro: 'Live queue overview for the operations team. Data refreshes when the module route is opened.',
      kpis: [
        { title: 'Pending Orders', value: orders.filter((row) => lower(row.status) === 'pending').length, icon: HiOutlineClipboardList, iconBg: 'bg-amber-100' },
        { title: 'Approved Unpaid', value: approvedUnpaid.length, icon: HiOutlineClock, iconBg: 'bg-orange-100' },
        { title: 'Dispatch Ready', value: approvedPaid.length, icon: HiOutlineCheckCircle, iconBg: 'bg-green-100' },
        { title: 'Active Deliveries', value: activeTracking.length, icon: HiOutlineTruck, iconBg: 'bg-blue-100' },
      ],
      tableTitle: 'Live Order Queue',
      rows: queueRows,
      columns: [
        { label: 'Order', render: (row) => <span className="font-mono text-xs font-semibold">#{row.order_number}</span> },
        { label: 'Stockist', render: (row) => row.partner_name || 'N/A' },
        { label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
        { label: 'Payment', render: (row) => <StatusBadge status={row.payment_status || 'unpaid'} /> },
        { label: 'Total', render: (row) => <span className="font-semibold">{formatCurrency(row.total_amount)}</span> },
        { label: 'Placed', render: (row) => <span className="text-xs text-gray-500">{formatRelative(row.created_at)}</span> },
      ],
      insights: [
        `${staleTracking.length} delivery routes have stale or missing pings.`,
        `${transfers.filter((row) => !['completed', 'cancelled'].includes(lower(row.status))).length} stock transfers remain open.`,
        `${couriers.filter((row) => lower(row.is_active) !== '0' && lower(row.is_active) !== 'false').length} active couriers in registry.`,
      ],
      detailCard: null,
    };
  }

  if (key === 'operations-dispatch-board') {
    const dispatchRows = [...approvedPaid, ...deliveringOrders].sort((a, b) => byDateDesc(a, b)).slice(0, 12);

    return {
      intro: 'Dispatch handoff board built from paid approvals and in-transit orders.',
      kpis: [
        { title: 'Ready To Dispatch', value: approvedPaid.length, icon: HiOutlineCheckCircle, iconBg: 'bg-green-100' },
        { title: 'In Transit', value: deliveringOrders.length, icon: HiOutlineTruck, iconBg: 'bg-blue-100' },
        { title: 'Open Transfers', value: transfers.filter((row) => !['completed', 'cancelled'].includes(lower(row.status))).length, icon: HiOutlineRefresh, iconBg: 'bg-violet-100' },
        { title: 'Stale Tracking', value: staleTracking.length, icon: HiOutlineExclamationCircle, iconBg: 'bg-red-100' },
      ],
      tableTitle: 'Dispatch Lane',
      rows: dispatchRows,
      columns: [
        { label: 'Order', render: (row) => <span className="font-mono text-xs font-semibold">#{row.order_number}</span> },
        { label: 'Stockist', render: (row) => row.partner_name || 'N/A' },
        { label: 'Payment', render: (row) => <StatusBadge status={row.payment_status || 'unpaid'} /> },
        { label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
        {
          label: 'Deadline',
          render: (row) => (row.payment_deadline
            ? <span className="text-xs text-gray-500">{formatDate(row.payment_deadline, true)}</span>
            : <span className="text-xs text-gray-400">-</span>),
        },
        {
          label: 'Next Action',
          render: (row) => (
            <span className="text-xs font-medium text-amber-700">
              {lower(row.status) === 'approved' ? 'Assign courier' : 'Monitor in transit'}
            </span>
          ),
        },
      ],
      insights: [
        `${approvedPaid.length} paid orders can move immediately to dispatch assignment.`,
        `${transfers.filter((row) => lower(row.status) === 'draft').length} transfers are still draft and may block dispatch.`,
      ],
      detailCard: null,
    };
  }

  if (key === 'operations-exceptions') {
    const cancelled = orders.filter((row) => lower(row.status) === 'cancelled');
    const rejected = orders.filter((row) => lower(row.status) === 'rejected');
    const deadlineBreaches = approvedUnpaid.filter((row) => row.payment_deadline && daysUntil(row.payment_deadline) < 0);
    const exceptionRows = [...deadlineBreaches, ...cancelled, ...rejected]
      .sort((a, b) => byDateDesc(a, b))
      .slice(0, 15);

    return {
      intro: 'Exception-focused queue for immediate intervention and escalation.',
      kpis: [
        { title: 'Cancelled', value: cancelled.length, icon: HiOutlineExclamationCircle, iconBg: 'bg-red-100' },
        { title: 'Rejected', value: rejected.length, icon: HiOutlineDocumentText, iconBg: 'bg-orange-100' },
        { title: 'Deadline Breach', value: deadlineBreaches.length, icon: HiOutlineClock, iconBg: 'bg-amber-100' },
        { title: 'Stale Pings', value: staleTracking.length, icon: HiOutlineTruck, iconBg: 'bg-blue-100' },
      ],
      tableTitle: 'Exception Cases',
      rows: exceptionRows,
      columns: [
        { label: 'Order', render: (row) => <span className="font-mono text-xs font-semibold">#{row.order_number}</span> },
        { label: 'Stockist', render: (row) => row.partner_name || 'N/A' },
        { label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
        { label: 'Payment', render: (row) => <StatusBadge status={row.payment_status || 'unpaid'} /> },
        {
          label: 'Issue',
          render: (row) => {
            if (row.payment_deadline && daysUntil(row.payment_deadline) < 0 && !isPaid(row)) {
              return <span className="text-xs font-medium text-red-700">Payment deadline breached</span>;
            }
            return <span className="text-xs text-gray-600">Order lifecycle exception</span>;
          },
        },
        { label: 'Last Update', render: (row) => <span className="text-xs text-gray-500">{formatRelative(row.created_at)}</span> },
      ],
      insights: [
        `${cancelled.length + rejected.length} orders were cancelled or rejected.`,
        `${staleTracking.length} active routes may need rider follow-up.`,
      ],
      detailCard: null,
    };
  }

  if (key === 'payments-queue') {
    const verificationRows = approvedUnpaid
      .filter((row) => row.payment_proof_url)
      .sort((a, b) => byDateDesc(a, b))
      .slice(0, 15);
    const missingProof = approvedUnpaid.filter((row) => !row.payment_proof_url);
    const deadlineRisk = approvedUnpaid.filter((row) => {
      if (!row.payment_deadline) return false;
      const remaining = daysUntil(row.payment_deadline);
      return remaining !== null && remaining <= 1;
    });

    return {
      intro: 'Verification queue for payment proof triage and deadline-driven follow-up.',
      kpis: [
        { title: 'Proof Uploaded', value: verificationRows.length, icon: HiOutlineDocumentText, iconBg: 'bg-blue-100' },
        { title: 'Awaiting Proof', value: missingProof.length, icon: HiOutlineClock, iconBg: 'bg-amber-100' },
        { title: 'Deadline Risk', value: deadlineRisk.length, icon: HiOutlineExclamationCircle, iconBg: 'bg-red-100' },
        { title: 'Paid Today', value: paidOrders.filter((row) => isToday(row.created_at)).length, icon: HiOutlineCurrencyDollar, iconBg: 'bg-green-100' },
      ],
      tableTitle: 'Verification Queue',
      rows: verificationRows,
      columns: [
        { label: 'Order', render: (row) => <span className="font-mono text-xs font-semibold">#{row.order_number}</span> },
        { label: 'Stockist', render: (row) => row.partner_name || 'N/A' },
        { label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
        { label: 'Payment', render: (row) => <StatusBadge status={row.payment_status || 'unpaid'} /> },
        {
          label: 'Proof',
          render: (row) => (
            row.payment_proof_url
              ? <a className="text-xs text-blue-600 hover:underline" href={row.payment_proof_url} target="_blank" rel="noreferrer">View upload</a>
              : <span className="text-xs text-gray-400">No file</span>
          ),
        },
        {
          label: 'Deadline',
          render: (row) => (
            row.payment_deadline
              ? <span className="text-xs text-gray-600">{formatDate(row.payment_deadline, true)}</span>
              : <span className="text-xs text-gray-400">-</span>
          ),
        },
      ],
      insights: [
        `${missingProof.length} approved orders are still waiting for payment proof uploads.`,
        `${deadlineRisk.length} approvals are within 24 hours of payment deadline.`,
      ],
      detailCard: null,
    };
  }

  if (key === 'payments-routing') {
    const activeAccounts = bankAccounts.filter((row) => Number(row.is_active) !== 0);
    const warehousesWithAccount = new Set(activeAccounts.map((row) => Number(row.warehouse_id)).filter(Boolean));
    const mappedRows = warehouses
      .map((warehouse) => {
        const account = activeAccounts.find((row) => Number(row.warehouse_id) === Number(warehouse.id))
          || bankAccounts.find((row) => Number(row.warehouse_id) === Number(warehouse.id));
        return {
          warehouse,
          account,
          is_mapped: !!account,
        };
      })
      .sort((a, b) => Number(a.is_mapped) - Number(b.is_mapped));

    const coverage = warehouses.length > 0
      ? Math.round((warehousesWithAccount.size / warehouses.length) * 100)
      : 0;

    return {
      intro: 'Warehouse-to-bank routing matrix to prevent approval-time payment routing gaps.',
      kpis: [
        { title: 'Warehouses', value: warehouses.length, icon: HiOutlineOfficeBuilding, iconBg: 'bg-blue-100' },
        { title: 'Active Bank Accounts', value: activeAccounts.length, icon: HiOutlineCurrencyDollar, iconBg: 'bg-green-100' },
        { title: 'Mapped Warehouses', value: warehousesWithAccount.size, icon: HiOutlineCheckCircle, iconBg: 'bg-emerald-100' },
        { title: 'Coverage', value: `${coverage}%`, icon: HiOutlineChartBar, iconBg: 'bg-amber-100' },
      ],
      tableTitle: 'Warehouse Routing Matrix',
      rows: mappedRows,
      columns: [
        { label: 'Warehouse', render: (row) => <span className="font-medium">{row.warehouse.name}</span> },
        { label: 'Type', render: (row) => <span className="text-xs capitalize">{String(row.warehouse.type || '-').replace(/_/g, ' ')}</span> },
        {
          label: 'Bank',
          render: (row) => (
            row.account
              ? <span className="text-xs">{row.account.bank_name}</span>
              : <span className="text-xs text-red-600">No mapping</span>
          ),
        },
        {
          label: 'Account Name',
          render: (row) => (
            row.account
              ? <span className="text-xs">{row.account.account_name}</span>
              : <span className="text-xs text-gray-400">-</span>
          ),
        },
        {
          label: 'Account Number',
          render: (row) => (
            row.account
              ? <span className="font-mono text-xs">{row.account.account_number}</span>
              : <span className="text-xs text-gray-400">-</span>
          ),
        },
        { label: 'Status', render: (row) => <StatusBadge status={row.is_mapped ? 'active' : 'inactive'} /> },
      ],
      insights: [
        `${warehouses.length - warehousesWithAccount.size} warehouses are still missing an active payment route.`,
        `${approvedUnpaid.length} approved orders are currently waiting for payment completion.`,
      ],
      detailCard: null,
    };
  }

  if (key === 'payments-settlements') {
    const paidToday = paidOrders.filter((row) => isToday(row.created_at));
    const deliveredPaid = paidOrders.filter((row) => lower(row.status) === 'delivered');
    const averagePaidOrder = paidOrders.length
      ? paidOrders.reduce((sum, row) => sum + Number(row.total_amount || 0), 0) / paidOrders.length
      : 0;
    const settlementRows = [...paidOrders].sort((a, b) => byDateDesc(a, b)).slice(0, 15);

    return {
      intro: 'Settlement monitor for paid orders with delivery completion visibility.',
      kpis: [
        { title: 'Paid Orders', value: paidOrders.length, icon: HiOutlineCurrencyDollar, iconBg: 'bg-green-100' },
        { title: 'Paid Today', value: paidToday.length, icon: HiOutlineClock, iconBg: 'bg-amber-100' },
        { title: 'Delivered & Paid', value: deliveredPaid.length, icon: HiOutlineCheckCircle, iconBg: 'bg-blue-100' },
        { title: 'Avg Paid Order', value: formatCurrency(averagePaidOrder), icon: HiOutlineChartBar, iconBg: 'bg-violet-100' },
      ],
      tableTitle: 'Latest Paid Orders',
      rows: settlementRows,
      columns: [
        { label: 'Order', render: (row) => <span className="font-mono text-xs font-semibold">#{row.order_number}</span> },
        { label: 'Stockist', render: (row) => row.partner_name || 'N/A' },
        { label: 'Order Status', render: (row) => <StatusBadge status={row.status} /> },
        { label: 'Payment', render: (row) => <StatusBadge status={row.payment_status || 'unpaid'} /> },
        { label: 'Amount', render: (row) => <span className="font-semibold">{formatCurrency(row.total_amount)}</span> },
        { label: 'Date', render: (row) => <span className="text-xs text-gray-500">{formatDate(row.created_at, true)}</span> },
      ],
      insights: [
        `${deliveredPaid.length} paid orders have fully completed lifecycle status.`,
        `${paidOrders.length - deliveredPaid.length} paid orders are still in post-payment fulfillment stages.`,
      ],
      detailCard: null,
    };
  }

  if (key === 'stock-replenishment') {
    const outOfStock = lowStock.filter((row) => lower(row.status) === 'out_of_stock');
    const warningStock = lowStock.filter((row) => lower(row.status) === 'low_stock');
    const transferOpen = transfers.filter((row) => !['completed', 'cancelled'].includes(lower(row.status))).length;

    return {
      intro: 'Low-stock queue prioritized for replenishment action and transfer balancing.',
      kpis: [
        { title: 'Low Stock SKUs', value: warningStock.length, icon: HiOutlineExclamationCircle, iconBg: 'bg-amber-100' },
        { title: 'Out Of Stock', value: outOfStock.length, icon: HiOutlineDocumentText, iconBg: 'bg-red-100' },
        { title: 'Open Transfers', value: transferOpen, icon: HiOutlineRefresh, iconBg: 'bg-blue-100' },
        { title: 'Inventory Rows', value: inventory.length, icon: HiOutlineCube, iconBg: 'bg-purple-100' },
      ],
      tableTitle: 'Replenishment Queue',
      rows: lowStock.slice(0, 20),
      columns: [
        { label: 'Product', render: (row) => <span className="font-medium">{row.product_name}</span> },
        { label: 'Warehouse', render: (row) => row.warehouse_name || '-' },
        { label: 'SKU', render: (row) => <span className="font-mono text-xs">{row.sku || '-'}</span> },
        { label: 'Current Stock', render: (row) => <span className="font-semibold">{Number(row.current_stock || 0)}</span> },
        { label: 'Threshold', render: (row) => Number(row.reorder_threshold || 0) },
        { label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
      ],
      insights: [
        `${outOfStock.length} SKUs are fully out of stock and need urgent action.`,
        `${transferOpen} stock transfers are currently active and can be used for balancing.`,
      ],
      detailCard: null,
    };
  }

  if (key === 'stock-expiry-risk') {
    const critical = expiringRows.filter((row) => (row.days_left ?? 999) <= 7 && (row.days_left ?? 999) >= 0);
    const expired = expiringRows.filter((row) => (row.days_left ?? 0) < 0);

    return {
      intro: 'Expiry board for immediate transfers and controlled liquidation planning.',
      kpis: [
        { title: 'Expiring <= 30d', value: expiringRows.length, icon: HiOutlineExclamationCircle, iconBg: 'bg-amber-100' },
        { title: 'Critical <= 7d', value: critical.length, icon: HiOutlineClock, iconBg: 'bg-red-100' },
        { title: 'Already Expired', value: expired.length, icon: HiOutlineDocumentText, iconBg: 'bg-gray-100' },
        { title: 'At-Risk Units', value: expiringRows.reduce((sum, row) => sum + Number(row.current_stock || 0), 0), icon: HiOutlineCube, iconBg: 'bg-violet-100' },
      ],
      tableTitle: 'Expiry Risk Queue',
      rows: expiringRows.slice(0, 20),
      columns: [
        { label: 'Product', render: (row) => <span className="font-medium">{row.product_name}</span> },
        { label: 'Warehouse', render: (row) => row.warehouse_name || '-' },
        { label: 'Batch', render: (row) => <span className="font-mono text-xs">{row.batch_number || '-'}</span> },
        { label: 'Expiry Date', render: (row) => formatDate(row.expiry_date) },
        {
          label: 'Days Left',
          render: (row) => (
            <span className={`text-xs font-semibold ${(row.days_left ?? 0) <= 7 ? 'text-red-700' : 'text-amber-700'}`}>
              {row.days_left}
            </span>
          ),
        },
        { label: 'Stock', render: (row) => Number(row.current_stock || 0) },
      ],
      insights: [
        `${critical.length} batches are in critical 7-day window.`,
        `${expired.length} rows appear expired and should be quarantined or adjusted.`,
      ],
      detailCard: null,
    };
  }

  if (key === 'stock-capacity') {
    const warehouseMap = new Map();
    inventory.forEach((row) => {
      const keyValue = row.warehouse_name || 'Unknown Warehouse';
      if (!warehouseMap.has(keyValue)) {
        warehouseMap.set(keyValue, {
          warehouse_name: keyValue,
          inventory_rows: 0,
          total_units: 0,
          low_count: 0,
          movement_count: 0,
        });
      }
      const entry = warehouseMap.get(keyValue);
      entry.inventory_rows += 1;
      entry.total_units += Number(row.current_stock || 0);
      if (['low_stock', 'out_of_stock'].includes(lower(row.status))) {
        entry.low_count += 1;
      }
    });

    movements.forEach((row) => {
      const keyValue = row.warehouse_name || 'Unknown Warehouse';
      if (!warehouseMap.has(keyValue)) return;
      warehouseMap.get(keyValue).movement_count += 1;
    });

    const capacityRows = Array.from(warehouseMap.values())
      .map((row) => ({
        ...row,
        low_ratio: row.inventory_rows > 0 ? row.low_count / row.inventory_rows : 0,
      }))
      .sort((a, b) => b.low_ratio - a.low_ratio);

    return {
      intro: 'Warehouse pressure heatmap using stock composition and recent movement volume.',
      kpis: [
        { title: 'Warehouses', value: capacityRows.length, icon: HiOutlineOfficeBuilding, iconBg: 'bg-blue-100' },
        { title: 'Total Units', value: capacityRows.reduce((sum, row) => sum + row.total_units, 0), icon: HiOutlineCube, iconBg: 'bg-violet-100' },
        { title: 'High-Risk Warehouses', value: capacityRows.filter((row) => row.low_ratio >= 0.3).length, icon: HiOutlineExclamationCircle, iconBg: 'bg-red-100' },
        { title: 'Movements (Recent)', value: movements.length, icon: HiOutlineRefresh, iconBg: 'bg-amber-100' },
      ],
      tableTitle: 'Warehouse Capacity Signals',
      rows: capacityRows,
      columns: [
        { label: 'Warehouse', render: (row) => <span className="font-medium">{row.warehouse_name}</span> },
        { label: 'Inventory Rows', render: (row) => row.inventory_rows },
        { label: 'Total Units', render: (row) => row.total_units.toLocaleString('en-PH') },
        { label: 'Low Stock Rows', render: (row) => row.low_count },
        {
          label: 'Pressure',
          render: (row) => {
            const percent = Math.round(row.low_ratio * 100);
            return <span className={`text-xs font-semibold ${percent >= 30 ? 'text-red-700' : 'text-emerald-700'}`}>{percent}%</span>;
          },
        },
        { label: 'Movement Count', render: (row) => row.movement_count },
      ],
      insights: [
        `${capacityRows.filter((row) => row.low_ratio >= 0.3).length} warehouses show elevated low-stock pressure.`,
        `${capacityRows.filter((row) => row.movement_count === 0).length} warehouses have no recent movement activity.`,
      ],
      detailCard: null,
    };
  }

  if (key === 'applications-pipeline') {
    const pending = applications.filter((row) => lower(row.status) === 'pending');
    const approved = applications.filter((row) => lower(row.status) === 'approved');
    const rejected = applications.filter((row) => lower(row.status) === 'rejected');
    const total = applications.length;

    return {
      intro: 'Live conversion funnel for incoming Stockist applications.',
      kpis: [
        { title: 'Total Applications', value: total, icon: HiOutlineClipboardCheck, iconBg: 'bg-blue-100' },
        { title: 'Pending Review', value: pending.length, icon: HiOutlineClock, iconBg: 'bg-amber-100' },
        { title: 'Approved', value: approved.length, icon: HiOutlineCheckCircle, iconBg: 'bg-green-100' },
        { title: 'Rejection Rate', value: total > 0 ? `${Math.round((rejected.length / total) * 100)}%` : '0%', icon: HiOutlineExclamationCircle, iconBg: 'bg-red-100' },
      ],
      tableTitle: 'Application Pipeline',
      rows: [...applications].sort((a, b) => byDateDesc(a, b)).slice(0, 15),
      columns: [
        { label: 'Applicant', render: (row) => <span className="font-medium">{row.full_name || row.applicant_name || 'N/A'}</span> },
        { label: 'Business', render: (row) => row.business_name || '-' },
        {
          label: 'Requested Level',
          render: (row) => (
            <span className="text-xs capitalize">
              {String(row.stockist_level || row.requested_level || '-').replace(/_/g, ' ')}
            </span>
          ),
        },
        { label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
        { label: 'Submitted', render: (row) => <span className="text-xs text-gray-500">{formatDate(row.created_at, true)}</span> },
        { label: 'Reviewed', render: (row) => <span className="text-xs text-gray-500">{row.reviewed_at ? formatDate(row.reviewed_at, true) : '-'}</span> },
      ],
      insights: [
        `${approved.length} applications converted to Stockist accounts.`,
        `${pending.length} applications are still waiting for review action.`,
      ],
      detailCard: null,
    };
  }

  if (key === 'applications-review') {
    const pendingRows = applications
      .filter((row) => lower(row.status) === 'pending')
      .sort((a, b) => byDateDesc(a, b))
      .slice(0, 15);

    const reviewedToday = applications.filter((row) => row.reviewed_at && isToday(row.reviewed_at)).length;
    const withDocuments = applications.filter((row) => row.id_front_url || row.id_document_url).length;
    const avgPendingDays = pendingRows.length > 0
      ? Math.round(
        pendingRows.reduce((sum, row) => {
          const ageMs = Date.now() - new Date(row.created_at).getTime();
          return sum + ageMs / 86400000;
        }, 0) / pendingRows.length,
      )
      : 0;

    return {
      intro: 'Review queue with live applicant detail for KYC and approval decisions.',
      kpis: [
        { title: 'Pending Queue', value: pendingRows.length, icon: HiOutlineClipboardList, iconBg: 'bg-amber-100' },
        { title: 'With Documents', value: withDocuments, icon: HiOutlineDocumentText, iconBg: 'bg-blue-100' },
        { title: 'Reviewed Today', value: reviewedToday, icon: HiOutlineCheckCircle, iconBg: 'bg-green-100' },
        { title: 'Avg Pending Days', value: avgPendingDays, icon: HiOutlineClock, iconBg: 'bg-violet-100' },
      ],
      tableTitle: 'Pending Review Queue',
      rows: pendingRows,
      columns: [
        { label: 'Applicant', render: (row) => <span className="font-medium">{row.full_name || row.applicant_name || 'N/A'}</span> },
        { label: 'Business', render: (row) => row.business_name || '-' },
        { label: 'Phone', render: (row) => row.phone || '-' },
        { label: 'Requested Level', render: (row) => <span className="text-xs capitalize">{String(row.stockist_level || row.requested_level || '-').replace(/_/g, ' ')}</span> },
        { label: 'Submitted', render: (row) => <span className="text-xs text-gray-500">{formatDate(row.created_at, true)}</span> },
        { label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
      ],
      insights: [
        `${pendingRows.length} pending applications are in active review queue.`,
        `${avgPendingDays} days average age across pending applications.`,
      ],
      detailCard: detailCard,
    };
  }

  const approvedApps = applications.filter((row) => lower(row.status) === 'approved');
  const rejectedApps = applications.filter((row) => lower(row.status) === 'rejected');
  const totalApps = applications.length;

  const reasonMap = new Map();
  rejectedApps.forEach((row) => {
    const reason = row.notes || row.rejection_reason || 'No rejection note';
    reasonMap.set(reason, (reasonMap.get(reason) || 0) + 1);
  });

  const reasons = Array.from(reasonMap.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);

  const avgReviewHours = approvedApps.length > 0
    ? Math.round(
      approvedApps.reduce((sum, row) => {
        if (!row.reviewed_at || !row.created_at) return sum;
        return sum + ((new Date(row.reviewed_at).getTime() - new Date(row.created_at).getTime()) / 3600000);
      }, 0) / approvedApps.length,
    )
    : 0;

  return {
    intro: 'Approval, rejection, and turnaround metrics for application quality control.',
    kpis: [
      { title: 'Total Applications', value: totalApps, icon: HiOutlineClipboardCheck, iconBg: 'bg-blue-100' },
      { title: 'Approval Rate', value: totalApps > 0 ? `${Math.round((approvedApps.length / totalApps) * 100)}%` : '0%', icon: HiOutlineCheckCircle, iconBg: 'bg-green-100' },
      { title: 'Rejection Rate', value: totalApps > 0 ? `${Math.round((rejectedApps.length / totalApps) * 100)}%` : '0%', icon: HiOutlineExclamationCircle, iconBg: 'bg-red-100' },
      { title: 'Avg Review Time', value: `${avgReviewHours}h`, icon: HiOutlineClock, iconBg: 'bg-violet-100' },
    ],
    tableTitle: 'Top Rejection Reasons',
    rows: reasons,
    columns: [
      { label: 'Reason', render: (row) => <span className="text-sm">{row.reason}</span> },
      { label: 'Count', render: (row) => <span className="font-semibold text-red-700">{row.count}</span> },
    ],
    insights: [
      `${reasons[0]?.reason || 'No rejection reasons yet'} is currently the top rejection pattern.`,
      `${approvedApps.length} applications were approved to Stockist accounts.`,
    ],
    detailCard: null,
  };
}

function getMainRowAction(key, row) {
  if (key === 'applications-review' || key === 'applications-pipeline') {
    if (row?.id) return { to: `/main/applications/review/${row.id}`, label: 'Review' };
    return { to: '/main/applications', label: 'Open' };
  }

  if (key === 'applications-analytics') {
    return { to: '/main/applications', label: 'Open' };
  }

  if (key === 'payments-routing') {
    return { to: '/main/bank-accounts', label: 'Manage' };
  }

  if (String(key || '').startsWith('stock-')) {
    return { to: '/main/inventory', label: 'Open' };
  }

  return { to: '/main/orders', label: 'Open' };
}

export default function MainPhase1Workspace({ pageKey }) {
  const params = useParams();
  const resolvedKey = pageKey === 'applications-review' && params.id
    ? 'applications-review'
    : pageKey;

  const page = PAGE_CONFIG[resolvedKey] || FALLBACK_PAGE;
  const Icon = page.icon;
  const inFlightRef = useRef(false);

  const [state, setState] = useState({
    loading: true,
    error: '',
    payload: {},
  });
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
      const payload = await loadModuleData(page.group, params.id);
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
  }, [page.group, params.id, resolvedKey]);

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

  const view = useMemo(() => buildView(resolvedKey, page, state.payload), [resolvedKey, page, state.payload]);

  return (
    <div className="space-y-5 page-enter">
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

      <Card className="border-l-4 border-l-amber-500">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge color="warning">{page.tab}</Badge>
              <Badge color="success">Live Data</Badge>
            </div>
            <p className="text-sm text-gray-600">{page.summary}</p>
            <p className="text-xs text-gray-500">{view.intro}</p>
            <p className="text-xs text-gray-400">Last sync: {lastSyncAt ? formatRelative(lastSyncAt) : 'Not synced yet'}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
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
              description="No live records currently match this module view."
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
                    <TableRow key={row.id || `${row.reason || 'row'}-${idx}`} className="hover:bg-amber-50/30">
                      {view.columns.map((column) => (
                        <TableCell key={column.label}>{column.render(row)}</TableCell>
                      ))}
                      <TableCell>
                        {(() => {
                          const action = getMainRowAction(resolvedKey, row);
                          if (!action) return <span className="text-xs text-gray-400">-</span>;
                          return (
                            <Link
                              to={action.to}
                              className="inline-flex items-center rounded-lg bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-200"
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

      {!state.loading && view.detailCard && resolvedKey === 'applications-review' && (
        <Card>
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Focused Applicant Detail</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-500">Full Name</p>
              <p className="font-semibold text-gray-900">{view.detailCard.full_name || view.detailCard.applicant_name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Business</p>
              <p className="font-semibold text-gray-900">{view.detailCard.business_name || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Email</p>
              <p className="text-gray-800">{view.detailCard.email || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Phone</p>
              <p className="text-gray-800">{view.detailCard.phone || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Requested Level</p>
              <p className="capitalize text-gray-800">{String(view.detailCard.stockist_level || view.detailCard.requested_level || '-').replace(/_/g, ' ')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Status</p>
              <StatusBadge status={view.detailCard.status} />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-3">
            {(view.detailCard.id_front_url || view.detailCard.id_document_url) && (
              <a
                href={view.detailCard.id_front_url || view.detailCard.id_document_url}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                Open ID Document
              </a>
            )}
            {(view.detailCard.id_back_url || view.detailCard.business_permit_url) && (
              <a
                href={view.detailCard.id_back_url || view.detailCard.business_permit_url}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                Open Business Permit
              </a>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
