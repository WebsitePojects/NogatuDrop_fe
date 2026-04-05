import { useState, useEffect, useCallback } from 'react';
import {
  Button, Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell,
  Card, TextInput, Select, Pagination,
} from 'flowbite-react';
import { HiOutlineSearch, HiOutlineDownload, HiOutlineCollection } from 'react-icons/hi';
import api from '@/services/api';
import { STOCK_MOVEMENTS, WAREHOUSES, PRODUCTS } from '@/services/endpoints';
import { formatDate, formatDateTime } from '@/utils/formatDate';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import { ToastContainer, useToast } from '@/components/Toast';

const TYPE_BADGE = {
  in:         'bg-emerald-100 text-emerald-700',
  out:        'bg-red-100 text-red-700',
  reserve:    'bg-amber-100 text-amber-700',
  release:    'bg-blue-100 text-blue-700',
  adjustment: 'bg-gray-100 text-gray-700',
  grn:        'bg-purple-100 text-purple-700',
  transfer:   'bg-violet-100 text-violet-700',
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

  const exportCSV = () => {
    const headers = ['Date', 'Product', 'Warehouse', 'Type', 'Quantity', 'Before', 'After', 'Reference', 'Notes'];
    const rows = movements.map((m) => [
      formatDate(m.created_at),
      m.product_name,
      m.warehouse_name,
      m.movement_type,
      m.quantity,
      m.stock_before,
      m.stock_after,
      m.reference_id || '',
      m.notes || '',
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-movements-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exported', 'success');
  };

  const typeSpan = (type) => {
    const cls = TYPE_BADGE[type] || 'bg-gray-100 text-gray-600';
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{type}</span>;
  };

  return (
    <div className="page-enter">
      <PageHeader
        title="Stock Movements"
        subtitle="Read-only log of all inventory movements"
        actions={[
          { label: 'Export CSV', icon: <HiOutlineDownload className="w-4 h-4" />, onClick: exportCSV, color: 'light' },
        ]}
      />

      <Card>
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-40">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
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
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </Select>
          <Select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} sizing="sm">
            <option value="">All Types</option>
            {Object.keys(TYPE_BADGE).map((t) => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
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
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((__, j) => (
                      <TableCell key={j}><div className="skeleton h-4 w-full rounded" /></TableCell>
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
                movements.map((m) => (
                  <TableRow key={m.id} className="hover:bg-amber-50/20">
                    <TableCell className="text-xs text-gray-600">{formatDateTime(m.created_at)}</TableCell>
                    <TableCell className="font-medium text-gray-900 text-xs">{m.product_name}</TableCell>
                    <TableCell className="text-xs">{m.warehouse_name}</TableCell>
                    <TableCell>{typeSpan(m.movement_type)}</TableCell>
                    <TableCell>
                      <span className={`font-bold text-sm ${m.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {m.quantity > 0 ? '+' : ''}{m.quantity}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">{m.stock_before ?? '—'}</TableCell>
                    <TableCell className="text-xs">{m.stock_after ?? '—'}</TableCell>
                    <TableCell className="text-xs font-mono text-gray-500">{m.reference_id || '—'}</TableCell>
                    <TableCell className="text-xs text-gray-500 max-w-xs truncate">{m.notes || '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {totalPages > 1 && (
          <div className="flex justify-center mt-4">
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} showIcons />
          </div>
        )}
      </Card>

      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
