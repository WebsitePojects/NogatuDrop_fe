import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/AnimatedModal';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Button, TextInput, Label, Select } from 'flowbite-react';
import api from '@/services/api';
import { GRN } from '@/services/endpoints';
import { getCheckoutIntent, createIntentHeaders } from '@/utils/checkoutIntent';
import RequiredMark from '@/components/RequiredMark';

// Shared "Add Stock" (quick receive) modal used by the Stockist and Main Inventory pages.
// Lives in components/ so neither page imports from the other.
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
export default function QuickStockModal({ show, onClose, products, warehouses, warehouseRequired = false, onSaved }) {
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
