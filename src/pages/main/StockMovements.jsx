import { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Table,
  TableHead,
  TableHeadCell,
  TableBody,
  TableRow,
  TableCell,
  Card,
  TextInput,
  Select,
  Pagination,
} from 'flowbite-react';
import { HiOutlineSearch, HiOutlineDownload, HiOutlineCollection } from 'react-icons/hi';
import api from '@/services/api';
import { EXPORTS, STOCK_MOVEMENTS, WAREHOUSES } from '@/services/endpoints';
import { formatDateTime } from '@/utils/formatDate';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import { ToastContainer, useToast } from '@/components/Toast';

const TYPE_BADGE = {
  in: 'bg-emerald-100 text-emerald-700',
  out: 'bg-red-100 text-red-700',
  reserve: 'bg-amber-100 text-amber-700',
  release: 'bg-blue-100 text-blue-700',
  adjustment: 'bg-gray-100 text-gray-700',
  grn: 'bg-purple-100 text-purple-700',
  transfer: 'bg-violet-100 text-violet-700',
  cycle_count_increase: 'bg-teal-100 text-teal-700',
  cycle_count_decrease: 'bg-rose-100 text-rose-700',
};

export default function StockMovements() {
  const { toasts, showToast, dismiss } = useToast();
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [warehouses, setWarehouses] = useState([]);

  const fetchMovements = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(STOCK_MOVEMENTS.LIST, {
        params: {
          page,
          search: search || undefined,
          movement_type: typeFilter || undefined,
          warehouse_id: warehouseFilter || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          limit: 20,
        },
      });
      setMovements(data.data || []);
      setTotalPages(data.pagination?.pages || 1);
    } catch {
      setMovements([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter, warehouseFilter, dateFrom, dateTo]);

  useEffect(() => { fetchMovements(); }, [fetchMovements]);

  useEffect(() => {
    api.get(WAREHOUSES.LIST, { params: { limit: 100 } })
      .then((r) => setWarehouses(r.data.data || []))
      .catch(() => {});
  }, []);

  const exportCSV = async () => {
    try {
      const { data } = await api.get(EXPORTS.STOCK_MOVEMENTS, {
        params: {
          search: search || undefined,
          movement_type: typeFilter || undefined,
          warehouse_id: warehouseFilter || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        },
      });

      const payload = data.data;
      const blob = new Blob([payload.content], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = payload.filename;
      anchor.click();
      URL.revokeObjectURL(url);
      showToast(`Signed export ${payload.export_number} generated (${payload.row_count} rows)`, 'success');
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to export stock movements', 'error');
    }
  };

  const typeSpan = (type) => {
    const cls = TYPE_BADGE[type] || 'bg-gray-100 text-gray-600';
    return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{type}</span>;
  };

  const summary = movements.reduce((acc, movement) => {
    const quantity = Number(movement.quantity || 0);
    if (quantity > 0) acc.inbound += quantity;
    if (quantity < 0) acc.outbound += Math.abs(quantity);
    acc.net += quantity;
    return acc;
  }, { inbound: 0, outbound: 0, net: 0 });

  const openingBalance = movements.length > 0 ? movements[movements.length - 1].stock_before : null;
  const closingBalance = movements.length > 0 ? movements[0].stock_after : null;

  return (
    <div className="page-enter">
      <PageHeader
        title="Stock Movements"
        subtitle="Read-only ledger window for inventory movement review and governed export"
        actions={[
          { label: 'Export CSV', icon: <HiOutlineDownload className="h-4 w-4" />, onClick: exportCSV, color: 'light' },
        ]}
      />

      <div className="mb-4 grid gap-4 md:grid-cols-4">
        <Card>
          <p className="text-xs uppercase tracking-wide text-gray-500">Window Opening</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{openingBalance ?? '-'}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-gray-500">Window Closing</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{closingBalance ?? '-'}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-gray-500">Inbound Qty</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-600">+{summary.inbound}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-gray-500">Outbound Qty</p>
          <p className="mt-2 text-2xl font-semibold text-red-600">-{summary.outbound}</p>
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="relative min-w-40 flex-1">
            <HiOutlineSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <TextInput
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search product..."
              className="pl-8"
              sizing="sm"
            />
          </div>
          <Select value={warehouseFilter} onChange={(e) => { setWarehouseFilter(e.target.value); setPage(1); }} sizing="sm">
            <option value="">All Warehouses</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
            ))}
          </Select>
          <Select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} sizing="sm">
            <option value="">All Types</option>
            {Object.keys(TYPE_BADGE).map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </Select>
          <TextInput type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} sizing="sm" />
          <TextInput type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} sizing="sm" />
        </div>

        <div className="overflow-x-auto">
          <Table striped>
            <TableHead>
              <TableHeadCell>Date</TableHeadCell>
              <TableHeadCell>Product</TableHeadCell>
              <TableHeadCell>Warehouse</TableHeadCell>
              <TableHeadCell>Type</TableHeadCell>
              <TableHeadCell>Qty</TableHeadCell>
              <TableHeadCell>Before</TableHeadCell>
              <TableHeadCell>After</TableHeadCell>
              <TableHeadCell>Reference</TableHeadCell>
              <TableHeadCell>Notes</TableHeadCell>
            </TableHead>
            <TableBody className="divide-y">
              {loading ? (
                Array.from({ length: 10 }).map((_, index) => (
                  <TableRow key={index}>
                    {Array.from({ length: 9 }).map((__, cellIndex) => (
                      <TableCell key={cellIndex}><div className="skeleton h-4 w-full rounded" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : movements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9}>
                    <EmptyState icon={HiOutlineCollection} title="No movements found" description="No stock movements match the current filters" />
                  </TableCell>
                </TableRow>
              ) : (
                movements.map((movement) => (
                  <TableRow key={movement.id} className="hover:bg-amber-50/20">
                    <TableCell className="text-xs text-gray-600 dark:text-[var(--dark-muted)]">{formatDateTime(movement.created_at)}</TableCell>
                    <TableCell className="text-xs font-medium text-gray-900 dark:text-[var(--dark-text)]">{movement.product_name}</TableCell>
                    <TableCell className="text-xs">{movement.warehouse_name}</TableCell>
                    <TableCell>{typeSpan(movement.movement_type)}</TableCell>
                    <TableCell>
                      <span className={`text-sm font-bold ${Number(movement.quantity) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {Number(movement.quantity) > 0 ? '+' : ''}{movement.quantity}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">{movement.stock_before ?? '-'}</TableCell>
                    <TableCell className="text-xs">{movement.stock_after ?? '-'}</TableCell>
                    <TableCell className="font-mono text-xs text-gray-500 dark:text-[var(--dark-muted)]">{movement.reference_id || '-'}</TableCell>
                    <TableCell className="max-w-xs truncate text-xs text-gray-500 dark:text-[var(--dark-muted)]">{movement.notes || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex justify-center">
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} showIcons />
          </div>
        )}
      </Card>

      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
