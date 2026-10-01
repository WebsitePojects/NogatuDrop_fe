import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/AnimatedModal';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Button, Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell, Card, TextInput, Select, Label, Pagination } from 'flowbite-react';
import { HiOutlinePlus, HiOutlineSearch, HiOutlinePencil, HiOutlineAdjustments } from 'react-icons/hi';
import api from '@/services/api';
import { INVENTORY, WAREHOUSES, PRODUCTS } from '@/services/endpoints';
import { formatDate } from '@/utils/formatDate';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import { ToastContainer, useToast } from '@/components/Toast';
import QuickStockModal from '@/components/QuickStockModal';

const STOCK_STATUS_COLOR = {
  in_stock: 'bg-green-100 text-green-800',
  low_stock: 'bg-amber-100 text-amber-800',
  out_of_stock: 'bg-red-100 text-red-800',
};

const EMPTY_FORM = {
  product_id: '', warehouse_id: '', current_stock: '', batch_number: '',
  expiry_date: '', reorder_threshold: '50', warning_threshold: '20',
};

export default function Inventory() {
  const { toasts, showToast, dismiss } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [totalItems, setTotalItems] = useState(0);

  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);

  const [showQuickStock, setShowQuickStock] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState('add');
  const [adjustNote, setAdjustNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // `disabled` alone loses to a fast double-click or Enter key repeat; the ref blocks re-entry.
  const inFlightRef = useRef(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(INVENTORY.LIST, {
        params: { page, search: search || undefined, status: statusFilter || undefined, warehouse_id: warehouseFilter || undefined, limit: pageSize },
      });
      setItems(data.data || []);
      setTotalPages(data.pagination?.pages || 1);
      setTotalItems(data.pagination?.total ?? (data.data || []).length);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, warehouseFilter, pageSize]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  useEffect(() => {
    Promise.allSettled([
      api.get(WAREHOUSES.LIST, { params: { limit: 100 } }),
      api.get(PRODUCTS.LIST, { params: { limit: 200 } }),
    ]).then(([wRes, pRes]) => {
      if (wRes.status === 'fulfilled') setWarehouses(wRes.value.data.data || []);
      if (pRes.status === 'fulfilled') setProducts(pRes.value.data.data || []);
    });
  }, []);

  const handleStockSaved = (message) => {
    showToast(message, 'success');
    fetchItems();
  };

  const openEdit = (item) => {
    setSelected(item);
    setForm({
      product_id: item.product_id,
      warehouse_id: item.warehouse_id,
      current_stock: item.current_stock,
      batch_number: item.batch_number || '',
      expiry_date: item.expiry_date ? item.expiry_date.slice(0, 10) : '',
      reorder_threshold: item.reorder_threshold || '50',
      warning_threshold: item.warning_threshold || '20',
    });
    setShowEditModal(true);
  };
  const openAdjust = (item) => {
    setSelected(item);
    setAdjustQty('');
    setAdjustType('add');
    setAdjustNote('');
    setShowAdjustModal(true);
  };
  const openDetail = (item) => { setSelected(item); setShowDetailModal(true); };

  const handleEdit = async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setSubmitting(true);
    try {
      await api.put(INVENTORY.UPDATE(selected.id), form);
      showToast('Inventory updated', 'success');
      setShowEditModal(false);
      fetchItems();
    } catch (err) {
      showToast(err.response?.data?.message || 'Update failed', 'error');
    } finally {
      inFlightRef.current = false;
      setSubmitting(false);
    }
  };

  const handleAdjust = async () => {
    if (!adjustQty || isNaN(Number(adjustQty))) {
      showToast('Enter a valid quantity', 'warning');
      return;
    }
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setSubmitting(true);
    try {
      await api.post('/stock-adjustments', {
        inventory_id: selected.id,
        type: adjustType,
        quantity: Number(adjustQty),
        reason: adjustNote,
      });
      showToast('Adjustment submitted for approval', 'success');
      setShowAdjustModal(false);
      fetchItems();
    } catch (err) {
      showToast(err.response?.data?.message || 'Adjustment failed', 'error');
    } finally {
      inFlightRef.current = false;
      setSubmitting(false);
    }
  };

  const exportExcel = async () => {
    const XLSX = await import('xlsx');
    const rows = items.map((item) => ({
      'Product': item.product_name,
      'SKU': item.sku,
      'Warehouse': item.warehouse_name,
      'Current Stock': item.current_stock,
      'Reserved': item.reserved_stock ?? 0,
      'Available': (item.current_stock ?? 0) - (item.reserved_stock ?? 0),
      'Status': item.status,
      'Warning Threshold': item.warning_threshold,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
    XLSX.writeFile(wb, `inventory_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportPDF = async () => {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('Inventory Report', 14, 15);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
    autoTable(doc, {
      startY: 28,
      head: [['Product', 'SKU', 'Warehouse', 'Stock', 'Reserved', 'Available', 'Status']],
      body: items.map((item) => [
        item.product_name,
        item.sku || '-',
        item.warehouse_name || '-',
        item.current_stock,
        item.reserved_stock ?? 0,
        (item.current_stock ?? 0) - (item.reserved_stock ?? 0),
        item.status || '-',
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [61, 24, 0] },
    });
    doc.save(`inventory_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const fld = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const stockStatusBadge = (item) => {
    const cls = STOCK_STATUS_COLOR[item.status] || 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300';
    const avail = Math.max(0, (item.current_stock || 0) - (item.reserved_stock || 0));
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
        {item.status?.replace(/_/g, ' ')} ({avail})
      </span>
    );
  };

  return (
    <div className="page-enter">
      <PageHeader
        title="Inventory"
        subtitle="Manage stock levels across all warehouses"
        actions={[
          { label: 'Add Stock', icon: <HiOutlinePlus className="w-4 h-4" />, onClick: () => setShowQuickStock(true) },
        ]}
      />

      <Card>
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-48">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted w-4 h-4" />
            <TextInput
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search product or batch..."
              className="pl-8"
              sizing="sm"
            />
          </div>
          <Select value={warehouseFilter} onChange={(e) => { setWarehouseFilter(e.target.value); setPage(1); }} sizing="sm">
            <option value="">All Warehouses</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </Select>
          <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} sizing="sm">
            <option value="">All Status</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
          </Select>
          <Button size="sm" color="success" onClick={exportExcel} disabled={items.length === 0}>
            Export Excel
          </Button>
          <Button size="sm" color="failure" onClick={exportPDF} disabled={items.length === 0}>
            Export PDF
          </Button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table striped>
            <TableHead>
              <TableRow>
                <TableHeadCell>Product</TableHeadCell>
                <TableHeadCell>Warehouse</TableHeadCell>
                <TableHeadCell>Batch</TableHeadCell>
                <TableHeadCell>Expiry</TableHeadCell>
                <TableHeadCell>Stock</TableHeadCell>
                <TableHeadCell>Reserved</TableHeadCell>
                <TableHeadCell>Available</TableHeadCell>
                <TableHeadCell>Status</TableHeadCell>
                <TableHeadCell>Actions</TableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody className="divide-y">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((__, j) => (
                      <TableCell key={j}><div className="skeleton h-4 w-full rounded" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9}>
                    <EmptyState
                      icon={HiOutlineAdjustments}
                      title="No inventory records"
                      description="Add inventory items to get started"
                      actionLabel="Add Stock"
                      onAction={() => setShowQuickStock(true)}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => {
                  const avail = Math.max(0, (item.current_stock || 0) - (item.reserved_stock || 0));
                  return (
                    <TableRow key={item.id} className="hover:bg-amber-50/30 cursor-pointer" onClick={() => openDetail(item)}>
                      <TableCell className="font-medium text-strong">{item.product_name}</TableCell>
                      <TableCell className="text-xs text-gray-600 dark:text-[var(--dark-muted)]">{item.warehouse_name}</TableCell>
                      <TableCell className="text-xs font-mono">{item.batch_number || '—'}</TableCell>
                      <TableCell className="text-xs">{item.expiry_date ? formatDate(item.expiry_date) : '—'}</TableCell>
                      <TableCell className="font-semibold">{item.current_stock ?? 0}</TableCell>
                      <TableCell className="text-amber-700">{item.reserved_stock ?? 0}</TableCell>
                      <TableCell className={avail === 0 ? 'text-red-600 font-bold' : 'text-green-700 font-semibold'}>{avail}</TableCell>
                      <TableCell>{stockStatusBadge(item)}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <Button size="xs" color="light" onClick={() => openEdit(item)} title="Edit">
                            <HiOutlinePencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="xs" color="warning" onClick={() => openAdjust(item)} title="Adjust">
                            <HiOutlineAdjustments className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-[var(--dark-muted)]">
            <span>Show</span>
            <Select
              sizing="sm"
              className="w-20"
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            >
              <option value={15}>15</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </Select>
            <span>{totalItems} item{totalItems === 1 ? '' : 's'}</span>
          </div>
          {totalPages > 1 && (
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} showIcons />
          )}
        </div>
      </Card>

      <QuickStockModal
        show={showQuickStock}
        onClose={() => setShowQuickStock(false)}
        products={products}
        warehouses={warehouses}
        warehouseRequired
        onSaved={handleStockSaved}
      />

      {/* Edit Modal */}
      <Modal show={showEditModal} onClose={() => setShowEditModal(false)} size="lg" backdropClasses="bg-black/50 backdrop-blur-sm">
        <ModalHeader className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 px-6 py-4">
          <div className="flex flex-col">
            <span className="text-xl font-bold text-gray-900 dark:text-white">Edit Inventory</span>
            {selected && (
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1 tracking-wide line-clamp-1">{selected.product_name}</span>
            )}
          </div>
        </ModalHeader>
        <ModalBody className="px-6 py-6">
          <div className="bg-gray-50/50 dark:bg-gray-800/20 p-5 rounded-xl border border-gray-100 dark:border-gray-700 space-y-5 shadow-sm">
             <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">Current Stock</label>
                <TextInput type="number" min="0" value={form.current_stock} onChange={fld('current_stock')} className="font-bold text-strong" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">Batch Number</label>
                <TextInput value={form.batch_number} onChange={fld('batch_number')} className="font-mono text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">Expiry Date</label>
                <TextInput type="date" value={form.expiry_date} onChange={fld('expiry_date')} />
              </div>
              <div className="col-span-2 border-t border-gray-100 dark:border-gray-700 pt-5 mt-2 flex gap-5">
                <div className="w-1/2">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">Warning Limit</label>
                  <TextInput type="number" min="0" value={form.warning_threshold} onChange={fld('warning_threshold')} />
                </div>
                <div className="w-1/2">
                  <label className="text-xs font-bold text-orange-700 dark:text-orange-400 uppercase tracking-wider mb-2 block">Reorder Limit</label>
                  <TextInput type="number" min="0" value={form.reorder_threshold} onChange={fld('reorder_threshold')} />
                </div>
              </div>
            </div>
          </div>
        </ModalBody>
        <ModalFooter className="border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 px-6 py-4 flex justify-end gap-3">
          <Button color="gray" onClick={() => setShowEditModal(false)} className="font-bold shadow-sm">Cancel</Button>
          <Button color="warning" onClick={handleEdit} disabled={submitting} className="font-bold shadow-sm">
            {submitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Adjust Modal */}
      <Modal show={showAdjustModal} onClose={() => setShowAdjustModal(false)} size="sm">
        <ModalHeader>Adjust Stock — {selected?.product_name}</ModalHeader>
        <ModalBody>
          <p className="text-sm text-muted mb-4">
            Current stock: <span className="font-bold text-strong">{selected?.current_stock ?? 0}</span>
          </p>
          <div className="space-y-3">
            <div>
              <Label htmlFor="adj_type" className="mb-1">Adjustment Type</Label>
              <Select id="adj_type" value={adjustType} onChange={(e) => setAdjustType(e.target.value)}>
                <option value="add">Add Stock</option>
                <option value="subtract">Remove Stock</option>
                <option value="set">Set to Exact Value</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="adj_qty" className="mb-1">Quantity</Label>
              <TextInput id="adj_qty" type="number" min="0" value={adjustQty} onChange={(e) => setAdjustQty(e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label htmlFor="adj_reason" className="mb-1">Reason</Label>
              <TextInput id="adj_reason" value={adjustNote} onChange={(e) => setAdjustNote(e.target.value)} placeholder="Reason for adjustment..." />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="warning" onClick={handleAdjust} disabled={submitting}>Submit Adjustment</Button>
          <Button color="gray" onClick={() => setShowAdjustModal(false)}>Cancel</Button>
        </ModalFooter>
      </Modal>

      {/* Detail Modal */}
      <Modal show={showDetailModal} onClose={() => setShowDetailModal(false)} size="md">
        <ModalHeader>Inventory Detail</ModalHeader>
        <ModalBody>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-muted text-xs">Product</p><p className="font-semibold">{selected.product_name}</p></div>
                <div><p className="text-muted text-xs">SKU</p><p className="font-mono">{selected.sku || '—'}</p></div>
                <div><p className="text-muted text-xs">Warehouse</p><p className="font-semibold">{selected.warehouse_name}</p></div>
                <div><p className="text-muted text-xs">Batch</p><p className="font-mono">{selected.batch_number || '—'}</p></div>
                <div><p className="text-muted text-xs">Expiry Date</p><p>{selected.expiry_date ? formatDate(selected.expiry_date) : '—'}</p></div>
                <div><p className="text-muted text-xs">Status</p>{stockStatusBadge(selected)}</div>
                <div><p className="text-muted text-xs">Current Stock</p><p className="font-bold text-lg">{selected.current_stock ?? 0}</p></div>
                <div><p className="text-muted text-xs">Reserved</p><p className="text-amber-600 font-semibold">{selected.reserved_stock ?? 0}</p></div>
                <div><p className="text-muted text-xs">Available</p><p className="text-green-600 font-semibold">{Math.max(0, (selected.current_stock || 0) - (selected.reserved_stock || 0))}</p></div>
                <div><p className="text-muted text-xs">Reorder At</p><p>{selected.reorder_threshold ?? '—'}</p></div>
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="warning" size="sm" onClick={() => { setShowDetailModal(false); openEdit(selected); }}>Edit</Button>
          <Button color="light" size="sm" onClick={() => { setShowDetailModal(false); openAdjust(selected); }}>Adjust Stock</Button>
          <Button color="gray" size="sm" onClick={() => setShowDetailModal(false)}>Close</Button>
        </ModalFooter>
      </Modal>

      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
