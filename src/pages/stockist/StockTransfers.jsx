/**
 * Stockist: Stock Transfers page
 * Scoped to this stockist's warehouses (backend filters by partner_id via JWT)
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Card, Button, Table, TableHead, TableHeadCell, TableBody, TableRow, TableCell,
  Modal, ModalHeader, ModalBody, ModalFooter, Badge, Label, TextInput, Select,
  Textarea, Spinner, Tabs, TabItem,
} from 'flowbite-react';
import {
  HiOutlineSwitchHorizontal, HiOutlinePlus, HiOutlineSearch,
  HiOutlineEye, HiOutlineRefresh, HiOutlineCheckCircle,
} from 'react-icons/hi';
import api from '@/services/api';
import { STOCK_TRANSFERS, WAREHOUSES, PRODUCTS } from '@/services/endpoints';
import { formatDate } from '@/utils/formatDate';
import StatusBadge from '@/components/StatusBadge';
import ConfirmModal from '@/components/ConfirmModal';
import { ToastContainer, useToast } from '@/components/Toast';
import EmptyState from '@/components/EmptyState';
import PageHeader from '@/components/PageHeader';

const STATUS_STEPS = ['pending', 'in_transit', 'completed'];

export default function StockistStockTransfers() {
  const { toasts, showToast, dismiss } = useToast();
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [viewModal, setViewModal] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [confirm, setConfirm] = useState({ open: false, title: '', message: '', onConfirm: null });
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);

  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(STOCK_TRANSFERS.LIST);
      setTransfers(data.data || []);
    } catch {
      showToast('Failed to load transfers', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransfers();
    api.get(WAREHOUSES.LIST).then(r => setWarehouses(r.data.data || [])).catch(() => {});
    api.get(PRODUCTS.LIST).then(r => setProducts(r.data.data || [])).catch(() => {});
  }, [fetchTransfers]);

  const filtered = transfers.filter((t) => {
    const matchesTab = activeTab === 'all' || t.status === activeTab;
    const matchesSearch = !search || t.transfer_number?.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const handleAdvanceStatus = async (transfer) => {
    const next = transfer.status === 'pending' ? 'in_transit' : 'completed';
    setConfirm({
      open: true,
      title: `Mark as ${next === 'in_transit' ? 'In Transit' : 'Completed'}?`,
      message: `This will update transfer ${transfer.transfer_number} status.`,
      onConfirm: async () => {
        try {
          await api.patch(STOCK_TRANSFERS.COMPLETE(transfer.id));
          showToast('Transfer status updated', 'success');
          fetchTransfers();
        } catch {
          showToast('Failed to update transfer', 'error');
        }
      },
    });
  };

  // Create form state
  const [form, setForm] = useState({ from_warehouse_id: '', to_warehouse_id: '', notes: '', items: [{ product_id: '', quantity: '' }] });
  const [creating, setCreating] = useState(false);

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { product_id: '', quantity: '' }] }));
  const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const updateItem = (i, field, val) => setForm(f => ({
    ...f,
    items: f.items.map((item, idx) => idx === i ? { ...item, [field]: val } : item),
  }));

  const handleCreate = async () => {
    setCreating(true);
    try {
      await api.post(STOCK_TRANSFERS.CREATE, form);
      showToast('Transfer created successfully', 'success');
      setCreateModal(false);
      setForm({ from_warehouse_id: '', to_warehouse_id: '', notes: '', items: [{ product_id: '', quantity: '' }] });
      fetchTransfers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create transfer', 'error');
    } finally {
      setCreating(false);
    }
  };

  const statusColor = { pending: 'warning', in_transit: 'purple', completed: 'success', cancelled: 'failure' };

  return (
    <div className="page-enter">
      <PageHeader
        title="Stock Transfers"
        subtitle="Move inventory between your warehouses"
        actions={[
          {
            label: 'New Transfer',
            icon: <HiOutlinePlus className="w-4 h-4" />,
            onClick: () => setCreateModal(true),
          },
        ]}
      />

      <Card>
        {/* Filter row */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              className="pl-9 pr-4 py-2 w-full text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border-amber-400 outline-none bg-white text-gray-900"
              placeholder="Search transfer number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {['all', 'pending', 'in_transit', 'completed', 'cancelled'].map((s) => (
              <button
                key={s}
                onClick={() => setActiveTab(s)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  activeTab === s
                    ? 'bg-amber-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s === 'all' ? 'All' : s === 'in_transit' ? 'In Transit' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <button
            onClick={fetchTransfers}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
          >
            <HiOutlineRefresh className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-700">
            <thead className="text-xs text-coffee-700 bg-coffee-50 uppercase">
              <tr>
                <th className="px-4 py-3">Transfer #</th>
                <th className="px-4 py-3">From</th>
                <th className="px-4 py-3">To</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="skeleton h-4 w-24 rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    No transfers found
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className="border-b border-gray-100 hover:bg-coffee-50/50 cursor-pointer" onClick={() => { setSelected(t); setViewModal(true); }}>
                    <td className="px-4 py-3 font-medium text-coffee-700">{t.transfer_number}</td>
                    <td className="px-4 py-3">{t.from_warehouse?.name || '—'}</td>
                    <td className="px-4 py-3">{t.to_warehouse?.name || '—'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(t.created_at)}</td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        <button
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                          onClick={() => { setSelected(t); setViewModal(true); }}
                        >
                          <HiOutlineEye className="w-4 h-4" />
                        </button>
                        {(t.status === 'pending' || t.status === 'in_transit') && (
                          <button
                            className="p-1.5 rounded-lg hover:bg-green-50 text-green-600"
                            onClick={() => handleAdvanceStatus(t)}
                          >
                            <HiOutlineCheckCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* View Modal */}
      <Modal show={viewModal} onClose={() => setViewModal(false)} size="xl">
        <ModalHeader>Transfer: {selected?.transfer_number}</ModalHeader>
        <ModalBody>
          {selected && (
            <div className="space-y-4">
              {/* Status timeline */}
              <div className="flex items-center gap-2">
                {STATUS_STEPS.map((s, i) => (
                  <div key={s} className="flex items-center gap-2">
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                      STATUS_STEPS.indexOf(selected.status) >= i
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      {i + 1}. {s === 'in_transit' ? 'In Transit' : s.charAt(0).toUpperCase() + s.slice(1)}
                    </div>
                    {i < STATUS_STEPS.length - 1 && <div className="w-6 h-px bg-gray-300" />}
                  </div>
                ))}
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">From</p>
                  <p className="font-medium text-gray-900">{selected.from_warehouse?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">To</p>
                  <p className="font-medium text-gray-900">{selected.to_warehouse?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Status</p>
                  <StatusBadge status={selected.status} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Date</p>
                  <p className="font-medium text-gray-900">{formatDate(selected.created_at)}</p>
                </div>
              </div>

              {/* Items */}
              {selected.items?.length > 0 && (
                <>
                  <hr className="border-gray-100" />
                  <p className="text-sm font-semibold text-gray-700">Items</p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-500 uppercase">
                        <th className="text-left py-2">Product</th>
                        <th className="text-right py-2">Quantity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.items.map((item, i) => (
                        <tr key={i} className="border-t border-gray-100">
                          <td className="py-2">{item.product?.name || item.product_id}</td>
                          <td className="py-2 text-right font-medium">{item.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              {selected.notes && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                  <span className="font-medium">Notes: </span>{selected.notes}
                </div>
              )}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          {selected && (selected.status === 'pending' || selected.status === 'in_transit') && (
            <Button
              color="success"
              size="sm"
              onClick={() => { setViewModal(false); handleAdvanceStatus(selected); }}
            >
              <HiOutlineCheckCircle className="w-4 h-4 mr-1" />
              {selected.status === 'pending' ? 'Mark In Transit' : 'Mark Completed'}
            </Button>
          )}
          <Button color="light" size="sm" onClick={() => setViewModal(false)}>Close</Button>
        </ModalFooter>
      </Modal>

      {/* Create Modal */}
      <Modal show={createModal} onClose={() => setCreateModal(false)} size="xl">
        <ModalHeader>New Stock Transfer</ModalHeader>
        <ModalBody className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="from_wh" value="From Warehouse" />
              <select
                id="from_wh"
                className="mt-1 block w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:ring-amber-300 focus:border-amber-400"
                value={form.from_warehouse_id}
                onChange={(e) => setForm(f => ({ ...f, from_warehouse_id: e.target.value }))}
              >
                <option value="">Select warehouse</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="to_wh" value="To Warehouse" />
              <select
                id="to_wh"
                className="mt-1 block w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:ring-amber-300 focus:border-amber-400"
                value={form.to_warehouse_id}
                onChange={(e) => setForm(f => ({ ...f, to_warehouse_id: e.target.value }))}
              >
                <option value="">Select warehouse</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <Label value="Items" />
            {form.items.map((item, i) => (
              <div key={i} className="flex gap-2 mt-2">
                <select
                  className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900"
                  value={item.product_id}
                  onChange={(e) => updateItem(i, 'product_id', e.target.value)}
                >
                  <option value="">Select product</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <input
                  type="number"
                  className="w-28 text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900"
                  placeholder="Qty"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                />
                {form.items.length > 1 && (
                  <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 px-2">×</button>
                )}
              </div>
            ))}
            <button onClick={addItem} className="mt-2 text-sm text-amber-600 hover:text-amber-700 font-medium">+ Add item</button>
          </div>

          <div>
            <Label htmlFor="notes" value="Notes (optional)" />
            <textarea
              id="notes"
              rows={3}
              className="mt-1 block w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:ring-amber-300 focus:border-amber-400"
              value={form.notes}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            className="bg-amber-500 hover:bg-amber-600 text-white"
            onClick={handleCreate}
            disabled={creating || !form.from_warehouse_id || !form.to_warehouse_id}
          >
            {creating ? <Spinner size="sm" className="mr-2" /> : null}
            Create Transfer
          </Button>
          <Button color="light" onClick={() => setCreateModal(false)}>Cancel</Button>
        </ModalFooter>
      </Modal>

      <ConfirmModal
        show={confirm.open}
        title={confirm.title}
        message={confirm.message}
        onConfirm={confirm.onConfirm}
        onClose={() => setConfirm(c => ({ ...c, open: false }))}
        confirmColor="success"
        confirmLabel="Confirm"
      />

      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
