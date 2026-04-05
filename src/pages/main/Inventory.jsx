import { useState, useEffect, useCallback } from 'react';
import {
  Button, Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell,
  Modal, ModalHeader, ModalBody, ModalFooter,
  Card, Spinner, TextInput, Select, Label, Badge, Pagination,
} from 'flowbite-react';
import { HiOutlinePlus, HiOutlineSearch, HiOutlinePencil, HiOutlineAdjustments } from 'react-icons/hi';
import api from '@/services/api';
import { INVENTORY, WAREHOUSES, PRODUCTS } from '@/services/endpoints';
import { formatDate } from '@/utils/formatDate';
import StatusBadge from '@/components/StatusBadge';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import ConfirmModal from '@/components/ConfirmModal';
import { ToastContainer, useToast } from '@/components/Toast';

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

  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState('add');
  const [adjustNote, setAdjustNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(INVENTORY.LIST, {
        params: { page, search: search || undefined, status: statusFilter || undefined, warehouse_id: warehouseFilter || undefined, limit: 15 },
      });
      setItems(data.data || []);
      setTotalPages(data.pagination?.pages || 1);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, warehouseFilter]);

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

  const openAdd = () => { setForm(EMPTY_FORM); setShowAddModal(true); };
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

  const handleAdd = async () => {
    setSubmitting(true);
    try {
      await api.post(INVENTORY.CREATE, form);
      showToast('Inventory item added', 'success');
      setShowAddModal(false);
      fetchItems();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to add item', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    setSubmitting(true);
    try {
      await api.put(INVENTORY.UPDATE(selected.id), form);
      showToast('Inventory updated', 'success');
      setShowEditModal(false);
      fetchItems();
    } catch (err) {
      showToast(err.response?.data?.message || 'Update failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdjust = async () => {
    if (!adjustQty || isNaN(Number(adjustQty))) {
      showToast('Enter a valid quantity', 'warning');
      return;
    }
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
      setSubmitting(false);
    }
  };

  const fld = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const stockStatusBadge = (item) => {
    const cls = STOCK_STATUS_COLOR[item.status] || 'bg-gray-100 text-gray-600';
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
        actions={[{ label: 'Add Inventory', icon: <HiOutlinePlus className="w-4 h-4" />, onClick: openAdd }]}
      />

      <Card>
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-48">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
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
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table striped>
            <TableHead>
              <TableHeadCell>Product</TableHeadCell>
              <TableHeadCell>Warehouse</TableHeadCell>
              <TableHeadCell>Batch</TableHeadCell>
              <TableHeadCell>Expiry</TableHeadCell>
              <TableHeadCell>Stock</TableHeadCell>
              <TableHeadCell>Reserved</TableHeadCell>
              <TableHeadCell>Available</TableHeadCell>
              <TableHeadCell>Status</TableHeadCell>
              <TableHeadCell>Actions</TableHeadCell>
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
                      actionLabel="Add Inventory"
                      onAction={openAdd}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => {
                  const avail = Math.max(0, (item.current_stock || 0) - (item.reserved_stock || 0));
                  return (
                    <TableRow key={item.id} className="hover:bg-amber-50/30 cursor-pointer" onClick={() => openDetail(item)}>
                      <TableCell className="font-medium text-gray-900">{item.product_name}</TableCell>
                      <TableCell className="text-xs text-gray-600">{item.warehouse_name}</TableCell>
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
        {totalPages > 1 && (
          <div className="flex justify-center mt-4">
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} showIcons />
          </div>
        )}
      </Card>

      {/* Add Modal */}
      <Modal show={showAddModal} onClose={() => setShowAddModal(false)} size="lg">
        <ModalHeader>Add Inventory Item</ModalHeader>
        <ModalBody>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="add_product" value="Product" className="mb-1" />
              <Select id="add_product" value={form.product_id} onChange={fld('product_id')} required>
                <option value="">Select product...</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
              </Select>
            </div>
            <div className="col-span-2">
              <Label htmlFor="add_warehouse" value="Warehouse" className="mb-1" />
              <Select id="add_warehouse" value={form.warehouse_id} onChange={fld('warehouse_id')} required>
                <option value="">Select warehouse...</option>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor="add_stock" value="Current Stock" className="mb-1" />
              <TextInput id="add_stock" type="number" min="0" value={form.current_stock} onChange={fld('current_stock')} placeholder="0" />
            </div>
            <div>
              <Label htmlFor="add_batch" value="Batch Number" className="mb-1" />
              <TextInput id="add_batch" value={form.batch_number} onChange={fld('batch_number')} placeholder="BATCH-001" />
            </div>
            <div>
              <Label htmlFor="add_expiry" value="Expiry Date" className="mb-1" />
              <TextInput id="add_expiry" type="date" value={form.expiry_date} onChange={fld('expiry_date')} />
            </div>
            <div>
              <Label htmlFor="add_reorder" value="Reorder Threshold" className="mb-1" />
              <TextInput id="add_reorder" type="number" min="0" value={form.reorder_threshold} onChange={fld('reorder_threshold')} />
            </div>
            <div>
              <Label htmlFor="add_warning" value="Warning Threshold" className="mb-1" />
              <TextInput id="add_warning" type="number" min="0" value={form.warning_threshold} onChange={fld('warning_threshold')} />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="warning" onClick={handleAdd} disabled={submitting} isProcessing={submitting}>Add Item</Button>
          <Button color="gray" onClick={() => setShowAddModal(false)}>Cancel</Button>
        </ModalFooter>
      </Modal>

      {/* Edit Modal */}
      <Modal show={showEditModal} onClose={() => setShowEditModal(false)} size="lg">
        <ModalHeader>Edit Inventory — {selected?.product_name}</ModalHeader>
        <ModalBody>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label value="Current Stock" className="mb-1" />
              <TextInput type="number" min="0" value={form.current_stock} onChange={fld('current_stock')} />
            </div>
            <div>
              <Label value="Batch Number" className="mb-1" />
              <TextInput value={form.batch_number} onChange={fld('batch_number')} />
            </div>
            <div>
              <Label value="Expiry Date" className="mb-1" />
              <TextInput type="date" value={form.expiry_date} onChange={fld('expiry_date')} />
            </div>
            <div>
              <Label value="Reorder Threshold" className="mb-1" />
              <TextInput type="number" min="0" value={form.reorder_threshold} onChange={fld('reorder_threshold')} />
            </div>
            <div>
              <Label value="Warning Threshold" className="mb-1" />
              <TextInput type="number" min="0" value={form.warning_threshold} onChange={fld('warning_threshold')} />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="warning" onClick={handleEdit} disabled={submitting} isProcessing={submitting}>Save Changes</Button>
          <Button color="gray" onClick={() => setShowEditModal(false)}>Cancel</Button>
        </ModalFooter>
      </Modal>

      {/* Adjust Modal */}
      <Modal show={showAdjustModal} onClose={() => setShowAdjustModal(false)} size="sm">
        <ModalHeader>Adjust Stock — {selected?.product_name}</ModalHeader>
        <ModalBody>
          <p className="text-sm text-gray-500 mb-4">
            Current stock: <span className="font-bold text-gray-900">{selected?.current_stock ?? 0}</span>
          </p>
          <div className="space-y-3">
            <div>
              <Label value="Adjustment Type" className="mb-1" />
              <Select value={adjustType} onChange={(e) => setAdjustType(e.target.value)}>
                <option value="add">Add Stock</option>
                <option value="subtract">Remove Stock</option>
                <option value="set">Set to Exact Value</option>
              </Select>
            </div>
            <div>
              <Label value="Quantity" className="mb-1" />
              <TextInput type="number" min="0" value={adjustQty} onChange={(e) => setAdjustQty(e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label value="Reason" className="mb-1" />
              <TextInput value={adjustNote} onChange={(e) => setAdjustNote(e.target.value)} placeholder="Reason for adjustment..." />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="warning" onClick={handleAdjust} disabled={submitting} isProcessing={submitting}>Submit Adjustment</Button>
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
                <div><p className="text-gray-500 text-xs">Product</p><p className="font-semibold">{selected.product_name}</p></div>
                <div><p className="text-gray-500 text-xs">SKU</p><p className="font-mono">{selected.sku || '—'}</p></div>
                <div><p className="text-gray-500 text-xs">Warehouse</p><p className="font-semibold">{selected.warehouse_name}</p></div>
                <div><p className="text-gray-500 text-xs">Batch</p><p className="font-mono">{selected.batch_number || '—'}</p></div>
                <div><p className="text-gray-500 text-xs">Expiry Date</p><p>{selected.expiry_date ? formatDate(selected.expiry_date) : '—'}</p></div>
                <div><p className="text-gray-500 text-xs">Status</p>{stockStatusBadge(selected)}</div>
                <div><p className="text-gray-500 text-xs">Current Stock</p><p className="font-bold text-lg">{selected.current_stock ?? 0}</p></div>
                <div><p className="text-gray-500 text-xs">Reserved</p><p className="text-amber-600 font-semibold">{selected.reserved_stock ?? 0}</p></div>
                <div><p className="text-gray-500 text-xs">Available</p><p className="text-green-600 font-semibold">{Math.max(0, (selected.current_stock || 0) - (selected.reserved_stock || 0))}</p></div>
                <div><p className="text-gray-500 text-xs">Reorder At</p><p>{selected.reorder_threshold ?? '—'}</p></div>
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
