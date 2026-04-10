import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/AnimatedModal';
/**
 * Stockist: Purchase Orders page
 * Scoped to this stockist's partner context
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Card, Button, Label, Spinner } from 'flowbite-react';
import {
  HiOutlinePlus, HiOutlineSearch, HiOutlineEye, HiOutlineRefresh,
  HiOutlineDocumentText,
} from 'react-icons/hi';
import api from '@/services/api';
import { PURCHASE_ORDERS, WAREHOUSES, PRODUCTS } from '@/services/endpoints';
import { formatDate } from '@/utils/formatDate';
import { formatCurrency } from '@/utils/formatCurrency';
import StatusBadge from '@/components/StatusBadge';
import ConfirmModal from '@/components/ConfirmModal';
import { ToastContainer, useToast } from '@/components/Toast';
import PageHeader from '@/components/PageHeader';

export default function StockistPurchaseOrders() {
  const { toasts, showToast, dismiss } = useToast();
  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [viewModal, setViewModal] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  const fetchPOs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(PURCHASE_ORDERS.LIST);
      setPos(data.data || []);
    } catch {
      showToast('Failed to load purchase orders', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPOs();
    api.get(PRODUCTS.LIST).then(r => setProducts(r.data.data || [])).catch(() => {});
    api.get(WAREHOUSES.LIST).then(r => setWarehouses(r.data.data || [])).catch(() => {});
  }, [fetchPOs]);

  const filtered = pos.filter(p => {
    const matchTab = activeTab === 'all' || p.status === activeTab;
    const matchSearch = !search || p.po_number?.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  // Create form
  const [form, setForm] = useState({ supplier: '', warehouse_id: '', notes: '', items: [{ product_id: '', quantity: 1, unit_price: '' }] });
  const [creating, setCreating] = useState(false);

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { product_id: '', quantity: 1, unit_price: '' }] }));
  const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const updateItem = (i, field, val) => setForm(f => ({
    ...f,
    items: f.items.map((item, idx) => idx === i ? { ...item, [field]: val } : item),
  }));

  const totalAmount = form.items.reduce((sum, i) => sum + (Number(i.quantity) * Number(i.unit_price) || 0), 0);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await api.post(PURCHASE_ORDERS.CREATE, { ...form, total_amount: totalAmount });
      showToast('Purchase order created', 'success');
      setCreateModal(false);
      setForm({ supplier: '', warehouse_id: '', notes: '', items: [{ product_id: '', quantity: 1, unit_price: '' }] });
      fetchPOs();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create PO', 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="page-enter">
      <PageHeader
        title="Purchase Orders"
        subtitle="Request stock from Goldenstar / main supplier"
        actions={[
          {
            label: 'Create PO',
            icon: <HiOutlinePlus className="w-4 h-4" />,
            onClick: () => setCreateModal(true),
          },
        ]}
      />

      <Card>
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              className="pl-9 pr-4 py-2 w-full text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border-amber-400 outline-none bg-white text-gray-900"
              placeholder="Search PO number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {['all', 'pending', 'approved', 'rejected', 'completed'].map((s) => (
            <button
              key={s}
              onClick={() => setActiveTab(s)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === s ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
          <button onClick={fetchPOs} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600">
            <HiOutlineRefresh className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-700">
            <thead className="text-xs text-coffee-700 bg-coffee-50 uppercase">
              <tr>
                <th className="px-4 py-3">PO #</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Auto</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">View</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="skeleton h-4 w-20 rounded" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No purchase orders found</td></tr>
              ) : (
                filtered.map((po) => (
                  <tr key={po.id} className="border-b border-gray-100 hover:bg-coffee-50/50 cursor-pointer" onClick={() => { setSelected(po); setViewModal(true); }}>
                    <td className="px-4 py-3 font-medium text-coffee-700">{po.po_number}</td>
                    <td className="px-4 py-3">{po.supplier}</td>
                    <td className="px-4 py-3"><StatusBadge status={po.status} /></td>
                    <td className="px-4 py-3">
                      {po.auto_generated ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Auto</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 font-medium">{formatCurrency(po.total_amount)}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(po.created_at)}</td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button className="p-1.5 rounded hover:bg-gray-100 text-gray-500" onClick={() => { setSelected(po); setViewModal(true); }}>
                        <HiOutlineEye className="w-4 h-4" />
                      </button>
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
        <ModalHeader>PO: {selected?.po_number}</ModalHeader>
        <ModalBody>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-xs text-gray-500 uppercase">Supplier</p><p className="font-medium">{selected.supplier}</p></div>
                <div><p className="text-xs text-gray-500 uppercase">Status</p><StatusBadge status={selected.status} /></div>
                <div><p className="text-xs text-gray-500 uppercase">Total</p><p className="font-bold text-coffee-700">{formatCurrency(selected.total_amount)}</p></div>
                <div><p className="text-xs text-gray-500 uppercase">Date</p><p className="font-medium">{formatDate(selected.created_at)}</p></div>
              </div>
              {selected.notes && <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600"><b>Notes:</b> {selected.notes}</div>}
              {selected.items?.length > 0 && (
                <>
                  <hr className="border-gray-100" />
                  <p className="text-sm font-semibold text-gray-700">Items</p>
                  <table className="w-full text-sm">
                    <thead><tr className="text-xs text-gray-400 uppercase"><th className="text-left py-2">Product</th><th className="text-right py-2">Qty</th><th className="text-right py-2">Unit Price</th><th className="text-right py-2">Subtotal</th></tr></thead>
                    <tbody>
                      {selected.items.map((item, i) => (
                        <tr key={i} className="border-t border-gray-100">
                          <td className="py-2">{item.product?.name || `Product #${item.product_id}`}</td>
                          <td className="py-2 text-right">{item.quantity}</td>
                          <td className="py-2 text-right">{formatCurrency(item.unit_price)}</td>
                          <td className="py-2 text-right font-medium">{formatCurrency(item.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr className="border-t-2 border-gray-200"><td colSpan={3} className="py-2 text-right font-semibold">Total</td><td className="py-2 text-right font-bold text-coffee-700">{formatCurrency(selected.total_amount)}</td></tr></tfoot>
                  </table>
                </>
              )}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={() => setViewModal(false)}>Close</Button>
        </ModalFooter>
      </Modal>

      {/* Create Modal */}
      <Modal show={createModal} onClose={() => setCreateModal(false)} size="xl">
        <ModalHeader>Create Purchase Order</ModalHeader>
        <ModalBody className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="supplier" value="Supplier" />
              <input id="supplier" className="mt-1 block w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900" value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} placeholder="Nogatu Manufacturing" />
            </div>
            <div>
              <Label htmlFor="warehouse" value="Destination Warehouse" />
              <select id="warehouse" className="mt-1 block w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900" value={form.warehouse_id} onChange={e => setForm(f => ({ ...f, warehouse_id: e.target.value }))}>
                <option value="">Select warehouse</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <Label value="Items" />
            {form.items.map((item, i) => (
              <div key={i} className="flex gap-2 mt-2">
                <select className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900" value={item.product_id} onChange={e => updateItem(i, 'product_id', e.target.value)}>
                  <option value="">Select product</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <input type="number" className="w-20 text-sm border border-gray-300 rounded-lg px-2 py-2 bg-white text-gray-900" placeholder="Qty" min="1" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} />
                <input type="number" className="w-28 text-sm border border-gray-300 rounded-lg px-2 py-2 bg-white text-gray-900" placeholder="Unit price" min="0" step="0.01" value={item.unit_price} onChange={e => updateItem(i, 'unit_price', e.target.value)} />
                {form.items.length > 1 && <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 px-1">×</button>}
              </div>
            ))}
            <button onClick={addItem} className="mt-2 text-sm text-amber-600 hover:text-amber-700 font-medium">+ Add item</button>
          </div>

          <div className="flex justify-between items-center bg-amber-50 rounded-lg p-3">
            <span className="text-sm font-semibold text-gray-700">Total Amount:</span>
            <span className="text-lg font-bold text-coffee-800">{formatCurrency(totalAmount)}</span>
          </div>

          <div>
            <Label htmlFor="notes" value="Notes (optional)" />
            <textarea rows={2} className="mt-1 block w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button className="bg-amber-500 hover:bg-amber-600 text-white" onClick={handleCreate} disabled={creating || !form.supplier}>
            {creating ? <Spinner size="sm" className="mr-2" /> : null}Submit PO
          </Button>
          <Button color="light" onClick={() => setCreateModal(false)}>Cancel</Button>
        </ModalFooter>
      </Modal>

      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
