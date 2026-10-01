import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/AnimatedModal';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Button, TextInput, Textarea, Label, Spinner, Select } from 'flowbite-react';
import { HiSearch, HiAdjustments, HiPlus } from 'react-icons/hi';
import { FiPackage } from 'react-icons/fi';
import StatusBadge from '@/components/StatusBadge';
import ConfirmModal from '@/components/ConfirmModal';
import { ToastContainer, useToast } from '@/components/Toast';
import api from '@/services/api';
import { INVENTORY, STOCK_ADJUSTMENTS, GRN, WAREHOUSES, PRODUCTS } from '@/services/endpoints';
import { getCheckoutIntent, createIntentHeaders } from '@/utils/checkoutIntent';
import RequiredMark from '@/components/RequiredMark';
import { INVENTORY_BADGE } from '@/utils/constants';
import { formatDate } from '@/utils/formatDate';

const stockStatusColor = (status) => {
  if (status === 'out_of_stock') return 'text-red-600 font-bold';
  if (status === 'low_stock') return 'text-amber-600 font-semibold';
  return 'text-emerald-600 font-semibold';
};

// ─── Quick stock entry ───────────────────────────────────────────────────────
// Shared by this page and the Super Admin page (src/pages/main/Inventory.jsx).
// Lives here only because this change may touch just these two files; it belongs
// in src/components/.
//
// Validation/hint text below is rendered in <div>, never <p>/<span>:
// `.dark .ng-modal-force-light p|span|label { color: ... !important }` (index.css)
// repaints every p/span inside a modal to the neutral dark-mode text colour, which
// would erase the red error colour.

const EMPTY_ENTRY = {
  product: null, productQuery: '', warehouse_id: '', quantity: '',
  batch_number: '', expiry_date: '', supplier: '', notes: '',
};
const MAX_PRODUCT_SUGGESTIONS = 50;
const isActive = (row) => Boolean(row.is_active ?? 1);
const productLabel = (p) => (p.sku ? `${p.name} (${p.sku})` : p.name);

/** yyyy-mm-dd in the user's local calendar, `offsetDays` from today. */
function localIsoDate(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function validateEntry(entry, warehouseRequired) {
  const errors = {};
  if (!entry.product) errors.product = 'Choose a product from the list.';
  if (warehouseRequired && !entry.warehouse_id) errors.warehouse_id = 'Choose a warehouse.';
  if (!/^\d+$/.test(entry.quantity) || Number(entry.quantity) <= 0) {
    errors.quantity = 'Enter a whole number greater than 0.';
  }
  if (!entry.batch_number.trim()) errors.batch_number = 'Enter the batch number.';
  if (!entry.expiry_date) errors.expiry_date = 'Enter the expiry date.';
  else if (entry.expiry_date <= localIsoDate(0)) errors.expiry_date = 'Expiry date must be in the future.';
  return errors;
}

function Field({ id, label, required, error, children }) {
  return (
    <div>
      <Label htmlFor={id} className="mb-1.5 block">
        {label}{required && <RequiredMark />}
      </Label>
      {children}
      {error && (
        <div id={`${id}-error`} role="alert" className="mt-1 text-xs font-medium text-red-700 dark:text-red-300">{error}</div>
      )}
    </div>
  );
}

function ProductPicker({ id, products, query, onQueryChange, selected, onSelect, error, inputRef }) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const suggestions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = needle
      ? products.filter((p) => `${p.name} ${p.sku || ''}`.toLowerCase().includes(needle))
      : products;
    return matches.slice(0, MAX_PRODUCT_SUGGESTIONS);
  }, [products, query]);

  const choose = (product) => {
    onSelect(product);
    setOpen(false);
  };

  const highlighted = suggestions[highlight];

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' && open && highlighted && !selected) {
      // Enter picks the highlighted product; it must not also submit the form.
      e.preventDefault();
      choose(highlighted);
    } else if (e.key === 'Tab' && !e.shiftKey && open && highlighted && !selected && query.trim()) {
      // Tab accepts what the user typed toward; with an empty query it just moves on.
      choose(highlighted);
    } else if (e.key === 'Escape' && open) {
      e.stopPropagation();
      setOpen(false);
    }
  };

  const listboxId = `${id}-listbox`;
  return (
    <div className="relative">
      <TextInput
        id={id}
        ref={inputRef}
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={open && highlighted ? `${id}-opt-${highlighted.id}` : undefined}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        autoComplete="off"
        placeholder="Type a product name or SKU"
        color={error ? 'failure' : 'gray'}
        value={query}
        onChange={(e) => { onQueryChange(e.target.value); setHighlight(0); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
      />
      {open && (
        <ul
          id={listboxId}
          role="listbox"
          className="surface border-soft absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border shadow-lg"
        >
          {suggestions.length === 0 ? (
            <li role="presentation" className="px-3 py-2 text-sm text-muted">No matching product</li>
          ) : suggestions.map((p, i) => (
            <li
              key={p.id}
              id={`${id}-opt-${p.id}`}
              role="option"
              aria-selected={selected?.id === p.id}
              // mousedown (not click) so the input keeps focus and onBlur does not close the list first
              onMouseDown={(e) => { e.preventDefault(); choose(p); }}
              onMouseEnter={() => setHighlight(i)}
              className={`cursor-pointer px-3 py-2 text-sm ${
                i === highlight
                  ? 'bg-amber-100 text-amber-950 dark:bg-amber-900/40 dark:text-amber-50'
                  : 'text-strong'
              }`}
            >
              <div className="font-medium">{p.name}</div>
              {p.sku && <div className="font-mono text-xs opacity-80">{p.sku}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Fast on-hand stock entry (POST /grn/quick-receive).
 *
 * - warehouseRequired: Super Admin must choose a warehouse. Otherwise a picker only
 *   appears when the user owns several; with one, the server forces it and we send none.
 * - onSaved(message): called after each successful save so the page can toast + refresh.
 *
 * Idempotency: the key lives in `intentRef`, bound to the exact payload
 * (getCheckoutIntent). A retry after a timeout or lost response replays the same key;
 * an edited entry gets a fresh one. It is cleared only after a successful save, and
 * deliberately NOT on close/reopen, so re-entering an entry whose response was lost
 * still replays instead of receiving the stock twice.
 */
export function QuickStockModal({ show, onClose, products, warehouses, warehouseRequired = false, onSaved }) {
  const activeProducts = useMemo(() => products.filter(isActive), [products]);
  const activeWarehouses = useMemo(() => warehouses.filter(isActive), [warehouses]);
  const needsWarehouse = warehouseRequired || activeWarehouses.length > 1;

  const [entry, setEntry] = useState(EMPTY_ENTRY);
  const [showErrors, setShowErrors] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [pending, setPending] = useState(false);
  const inFlightRef = useRef(false);
  const intentRef = useRef(null);
  // A saved intent stays "spent" until the user edits the form. Keeping its key until then means a
  // press that lands after success but before the form changes (stale closure, modal still
  // closing) replays the same key instead of minting a new one — the server returns the original
  // receipt and stock is not added twice. Measured in a real browser: clearing the key on success
  // produced two 201s and double stock.
  const spentRef = useRef(false);
  const productInputRef = useRef(null);

  const errors = validateEntry(entry, needsWarehouse);

  const startNewIntentIfSpent = () => {
    if (!spentRef.current) return;
    intentRef.current = null;
    spentRef.current = false;
  };
  // Every USER edit goes through here; programmatic resets after a save deliberately do not.
  const editEntry = (updater) => {
    startNewIntentIfSpent();
    setEntry(updater);
  };

  // Each opening starts blank, keeping the last warehouse (or the only one).
  useEffect(() => {
    if (!show) return;
    startNewIntentIfSpent();
    inFlightRef.current = false; // a successful Save keeps the guard locked until the modal is gone
    setPending(false);
    setEntry((prev) => ({
      ...EMPTY_ENTRY,
      warehouse_id: needsWarehouse
        ? (prev.warehouse_id || (activeWarehouses.length === 1 ? String(activeWarehouses[0].id) : ''))
        : '',
    }));
    setShowErrors(false);
    setSubmitError('');
  }, [show]); // eslint-disable-line react-hooks/exhaustive-deps -- reset on open only, not on every list refresh

  const setField = (key) => (e) => editEntry((prev) => ({ ...prev, [key]: e.target.value }));
  const fieldError = (key) => (showErrors ? errors[key] : undefined);
  const inputColor = (key) => (fieldError(key) ? 'failure' : 'gray');
  const errorProps = (id, key) => ({
    'aria-invalid': Boolean(fieldError(key)),
    'aria-describedby': fieldError(key) ? `${id}-error` : undefined,
  });

  const handleClose = () => {
    if (inFlightRef.current) return; // closing mid-request would invite a second submit
    onClose();
  };

  const save = async ({ addAnother }) => {
    if (inFlightRef.current) return;
    if (Object.keys(errors).length > 0) {
      setShowErrors(true);
      return;
    }
    inFlightRef.current = true;
    setPending(true);
    setSubmitError('');

    const payload = {
      product_id: entry.product.id,
      quantity: Number(entry.quantity),
      batch_number: entry.batch_number.trim(),
      expiry_date: entry.expiry_date,
      ...(needsWarehouse && { warehouse_id: Number(entry.warehouse_id) }),
      ...(entry.supplier.trim() && { supplier: entry.supplier.trim() }),
      ...(entry.notes.trim() && { notes: entry.notes.trim() }),
    };
    intentRef.current = getCheckoutIntent(intentRef.current, payload);

    let saved = false;
    try {
      const { data } = await api.post(GRN.QUICK_RECEIVE, payload, {
        headers: createIntentHeaders(intentRef.current),
      });
      spentRef.current = true; // keep the key; the next user edit starts a new intent
      saved = true;
      const result = data.data;
      const warehouseName = activeWarehouses.find((w) => String(w.id) === String(result.warehouse_id))?.name
        || 'your warehouse';
      onSaved(`Added ${payload.quantity.toLocaleString()} ${entry.product.name} to ${warehouseName} — now ${Number(result.new_stock).toLocaleString()} on hand`);
      if (addAnother) {
        setEntry((prev) => ({ ...prev, product: null, productQuery: '', quantity: '', notes: '' }));
        setShowErrors(false);
        productInputRef.current?.focus();
      }
    } catch (err) {
      setSubmitError(err.response?.data?.message || err.message || 'Could not save this stock entry.');
    } finally {
      // After a plain Save the modal is closing: stay locked so no press can slip in before it is
      // gone (the open effect unlocks it). "Save & add another" unlocks so the user can continue.
      if (!(saved && !addAnother)) {
        inFlightRef.current = false;
        setPending(false);
      }
    }
    if (saved && !addAnother) onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    save({ addAnother: false });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      save({ addAnother: true });
    }
  };

  return (
    <Modal show={show} onClose={handleClose} size="lg" initialFocus={productInputRef} backdropClasses="bg-black/50 backdrop-blur-sm">
      <ModalHeader>Add Stock</ModalHeader>
      <ModalBody>
        <form id="quick-stock-form" onSubmit={handleSubmit} onKeyDown={handleKeyDown} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field id="qs-product" label="Product" required error={fieldError('product')}>
              <ProductPicker
                id="qs-product"
                products={activeProducts}
                query={entry.productQuery}
                onQueryChange={(productQuery) => editEntry((prev) => ({ ...prev, productQuery, product: null }))}
                selected={entry.product}
                onSelect={(product) => editEntry((prev) => ({ ...prev, product, productQuery: productLabel(product) }))}
                error={fieldError('product')}
                inputRef={productInputRef}
              />
            </Field>
          </div>

          {needsWarehouse && (
            <div className="sm:col-span-2">
              <Field id="qs-warehouse" label="Warehouse" required error={fieldError('warehouse_id')}>
                <Select id="qs-warehouse" value={entry.warehouse_id} onChange={setField('warehouse_id')} color={inputColor('warehouse_id')} {...errorProps('qs-warehouse', 'warehouse_id')}>
                  <option value="">Select warehouse…</option>
                  {activeWarehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </Select>
              </Field>
            </div>
          )}

          <Field id="qs-quantity" label="Quantity" required error={fieldError('quantity')}>
            <TextInput id="qs-quantity" type="number" inputMode="numeric" min={1} step={1} placeholder="0" value={entry.quantity} onChange={setField('quantity')} color={inputColor('quantity')} {...errorProps('qs-quantity', 'quantity')} />
          </Field>
          <Field id="qs-batch" label="Batch number" required error={fieldError('batch_number')}>
            <TextInput id="qs-batch" className="font-mono" placeholder="e.g. B01" value={entry.batch_number} onChange={setField('batch_number')} color={inputColor('batch_number')} {...errorProps('qs-batch', 'batch_number')} />
          </Field>
          <Field id="qs-expiry" label="Expiry date" required error={fieldError('expiry_date')}>
            <TextInput id="qs-expiry" type="date" min={localIsoDate(1)} value={entry.expiry_date} onChange={setField('expiry_date')} color={inputColor('expiry_date')} {...errorProps('qs-expiry', 'expiry_date')} />
          </Field>
          <Field id="qs-supplier" label="Supplier (optional)">
            <TextInput id="qs-supplier" placeholder="Who delivered this stock" value={entry.supplier} onChange={setField('supplier')} />
          </Field>
          <div className="sm:col-span-2">
            <Field id="qs-notes" label="Notes (optional)">
              <TextInput id="qs-notes" value={entry.notes} onChange={setField('notes')} />
            </Field>
          </div>

          {submitError && (
            <div role="alert" className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-800 dark:border-red-500/50 dark:bg-red-950/40 dark:text-red-200 sm:col-span-2">
              {submitError}
            </div>
          )}
          <div className="text-xs text-muted sm:col-span-2">
            Enter saves and closes. Ctrl+Enter saves and starts the next product with the same batch details.
          </div>
        </form>
      </ModalBody>
      <ModalFooter className="flex flex-wrap justify-end gap-2">
        <Button color="gray" onClick={handleClose} disabled={pending}>Cancel</Button>
        <Button color="light" onClick={() => save({ addAnother: true })} disabled={pending}>
          {pending ? 'Saving…' : 'Save & add another'}
        </Button>
        <Button type="submit" form="quick-stock-form" color="warning" disabled={pending}>
          {pending ? 'Saving…' : 'Save'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default function StockistInventory() {
  const { toasts, showToast, dismiss } = useToast();

  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  const [adjustModal, setAdjustModal] = useState(null); // the inventory item
  const [adjustForm, setAdjustForm] = useState({ requested_qty: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);
  const [confirmAdj, setConfirmAdj] = useState(false);
  const [showQuickStock, setShowQuickStock] = useState(false);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(INVENTORY.LIST, {
        params: { page, limit: pageSize, search },
      });
      const items = data.data?.items || data.data || [];
      setInventory(items);
      const pagination = data.pagination || data.data?.pagination;
      setTotalPages(pagination?.pages || 1);
      setTotalItems(pagination?.total ?? items.length);
    } catch {
      showToast('Failed to load inventory', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, pageSize]);

  useEffect(() => { fetchInventory(); }, [fetchInventory]);

  useEffect(() => {
    Promise.allSettled([
      api.get(PRODUCTS.LIST, { params: { limit: 200 } }),
      api.get(WAREHOUSES.LIST, { params: { limit: 50 } }),
    ]).then(([productsRes, warehousesRes]) => {
      if (productsRes.status === 'fulfilled') setProducts(productsRes.value.data.data || []);
      if (warehousesRes.status === 'fulfilled') setWarehouses(warehousesRes.value.data.data || []);
    });
  }, []);

  const handleStockSaved = (message) => {
    showToast(message, 'success');
    fetchInventory();
  };

  const openAdjust = (item) => {
    setAdjustModal(item);
    setAdjustForm({ requested_qty: '', reason: '' });
  };

  const handleAdjustSubmit = async () => {
    if (!adjustModal) return;
    if (!adjustForm.requested_qty || !adjustForm.reason.trim()) {
      showToast('Please fill in all fields', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(STOCK_ADJUSTMENTS.CREATE, {
        inventory_id: adjustModal.id,
        warehouse_id: adjustModal.warehouse_id,
        requested_qty: parseInt(adjustForm.requested_qty),
        reason: adjustForm.reason,
      });
      showToast('Adjustment request submitted. Awaiting admin approval.', 'success');
      setAdjustModal(null);
      setConfirmAdj(false);
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to submit request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const available = (item) => (item.current_stock || 0) - (item.reserved_stock || 0);

  const exportExcel = async () => {
    const XLSX = await import('xlsx');
    const rows = inventory.map((item) => ({
      'Product': item.product?.name || item.product_name || `Item #${item.id}`,
      'SKU': item.product?.sku || item.sku || '-',
      'Warehouse': item.warehouse_name || '-',
      'Current Stock': item.current_stock ?? 0,
      'Reserved': item.reserved_stock ?? 0,
      'Available': available(item),
      'Status': item.status || '-',
      'Warning Threshold': item.warning_threshold ?? '-',
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
      body: inventory.map((item) => [
        item.product?.name || item.product_name || `Item #${item.id}`,
        item.product?.sku || item.sku || '-',
        item.warehouse_name || '-',
        item.current_stock ?? 0,
        item.reserved_stock ?? 0,
        available(item),
        item.status || '-',
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [61, 24, 0] },
    });
    doc.save(`inventory_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="p-4 md:p-6 min-h-screen page-enter">
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-[var(--dark-text)]">My Inventory</h1>
          <p className="text-sm text-gray-500 dark:text-[var(--dark-muted)] mt-0.5">Current stock levels at your warehouse</p>
        </div>
        <Button color="warning" onClick={() => setShowQuickStock(true)}>
          <HiPlus className="mr-1.5 h-4 w-4" />
          Add Stock
        </Button>
      </div>

      {/* Search + Export */}
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <div className="flex-1 min-w-48">
          <TextInput
            icon={HiSearch}
            placeholder="Search products…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            sizing="md"
          />
        </div>
        <Button size="sm" color="success" onClick={exportExcel} disabled={inventory.length === 0}>
          Export Excel
        </Button>
        <Button size="sm" color="failure" onClick={exportPDF} disabled={inventory.length === 0}>
          Export PDF
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[var(--dark-card)] rounded-2xl border border-gray-100 dark:border-[var(--dark-border)] shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-11 rounded-xl bg-gray-100 dark:bg-gray-700 animate-pulse" />
            ))}
          </div>
        ) : inventory.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-muted">
            <FiPackage size={40} className="mb-3 opacity-30" />
            <p className="text-sm">No inventory found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-[var(--dark-card)] border-b border-gray-100 dark:border-[var(--dark-border)]">
                  <tr>
                    {['Product', 'Batch', 'Expiry', 'On Hand', 'Reserved', 'Available', 'Status', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-[var(--dark-muted)] uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inventory.map(item => {
                    const avail = available(item);
                    const badgeKey = item.status?.toLowerCase();
                    const badge = INVENTORY_BADGE[badgeKey] || INVENTORY_BADGE['in_stock'];
                    return (
                      <tr key={item.id} className="border-b border-gray-50 dark:border-[var(--dark-border)] hover:bg-amber-50/30 dark:hover:bg-[var(--dark-card2)] transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-800 dark:text-[var(--dark-text)] text-sm">
                            {item.product?.name || item.product_name || `Item #${item.id}`}
                          </p>
                          {item.product?.sku && (
                            <p className="text-xs text-gray-400 dark:text-[var(--dark-muted)] font-mono">{item.product.sku}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-[var(--dark-muted)] font-mono">
                          {item.batch_number || '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-[var(--dark-muted)]">
                          {item.expiry_date ? formatDate(item.expiry_date) : '—'}
                        </td>
                        <td className={`px-4 py-3 text-sm ${stockStatusColor(item.status)}`}>
                          {item.current_stock ?? 0}
                        </td>
                        <td className="px-4 py-3 text-sm text-amber-600 font-medium">
                          {item.reserved_stock || 0}
                        </td>
                        <td className={`px-4 py-3 text-sm font-semibold ${avail <= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {avail}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${badge.bg} ${badge.text}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => openAdjust(item)}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                          >
                            <HiAdjustments className="w-3.5 h-3.5" />
                            Request Adjustment
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 dark:border-[var(--dark-border)]">
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
                <span>{totalItems} item{totalItems === 1 ? '' : 's'} · Page {page} of {totalPages}</span>
              </div>
              <div className="flex gap-2">
                <Button size="xs" color="gray" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  Previous
                </Button>
                <Button size="xs" color="gray" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      <QuickStockModal
        show={showQuickStock}
        onClose={() => setShowQuickStock(false)}
        products={products}
        warehouses={warehouses}
        onSaved={handleStockSaved}
      />

      {/* Adjustment Request Modal */}
      <Modal show={!!adjustModal} onClose={() => setAdjustModal(null)} size="md" backdropClasses="bg-black/50 backdrop-blur-sm">
        <ModalHeader>Request Stock Adjustment</ModalHeader>
        <ModalBody className="space-y-4">
          {adjustModal && (
            <div className="bg-amber-50 dark:bg-[var(--dark-card2)] rounded-xl p-3 text-sm">
              <p className="font-semibold text-gray-800 dark:text-[var(--dark-text)]">
                {adjustModal.product?.name || adjustModal.product_name}
              </p>
              <p className="text-gray-500 dark:text-[var(--dark-muted)] text-xs mt-0.5">
                Current stock: <span className="font-medium">{adjustModal.current_stock ?? 0}</span>
              </p>
            </div>
          )}
          <div>
            <Label htmlFor="req-qty" className="mb-1.5">Requested Quantity</Label>
            <TextInput
              id="req-qty"
              type="number"
              min={1}
              placeholder="Enter quantity to add/adjust"
              value={adjustForm.requested_qty}
              onChange={e => setAdjustForm(f => ({ ...f, requested_qty: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="adj-reason" className="mb-1.5">Reason</Label>
            <Textarea
              id="adj-reason"
              rows={3}
              placeholder="Explain why this adjustment is needed…"
              value={adjustForm.reason}
              onChange={e => setAdjustForm(f => ({ ...f, reason: e.target.value }))}
            />
          </div>
          <p className="text-xs text-muted">
            This request will be sent to the Super Admin for approval. Stock will only update after approval.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button
            color="warning"
            onClick={() => setConfirmAdj(true)}
            disabled={!adjustForm.requested_qty || !adjustForm.reason.trim()}
          >
            Submit Request
          </Button>
          <Button color="gray" onClick={() => setAdjustModal(null)}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>

      <ConfirmModal
        show={confirmAdj}
        title="Submit Adjustment Request"
        message="This will send an adjustment request to the admin for approval. Continue?"
        confirmLabel="Submit"
        confirmColor="warning"
        loading={submitting}
        onConfirm={handleAdjustSubmit}
        onClose={() => setConfirmAdj(false)}
      />
    </div>
  );
}
