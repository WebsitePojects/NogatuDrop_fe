import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Modal, ModalBody, ModalFooter, ModalHeader, Spinner } from 'flowbite-react';
import { HiOutlineMinus, HiOutlinePlus, HiOutlineRefresh, HiOutlineCube } from 'react-icons/hi';
import { ToastContainer, useToast } from '@/components/Toast';
import api from '@/services/api';
import { MOBILE_INVENTORY } from '@/services/endpoints';

export default function MobileInventory() {
  const { toasts, showToast, dismiss } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [direction, setDirection] = useState('decrease');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const loadInventory = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(MOBILE_INVENTORY.LIST);
      setItems(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (error) {
      showToast(error?.response?.data?.message || 'Failed to load personal inventory', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadInventory(); }, [loadInventory]);

  const totalUnits = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.current_stock || 0), 0),
    [items]
  );

  const openAdjustment = (item, nextDirection) => {
    setSelected(item);
    setDirection(nextDirection);
    setQuantity(1);
    setReason(nextDirection === 'decrease' ? 'Direct sale outside the system' : 'Manual stock record');
  };

  const submitAdjustment = async () => {
    if (!selected || !Number.isInteger(Number(quantity)) || Number(quantity) < 1) return;
    setSaving(true);
    try {
      await api.post(MOBILE_INVENTORY.ADJUST(selected.product_id), {
        direction,
        quantity: Number(quantity),
        reason: reason.trim(),
      });
      showToast(direction === 'decrease' ? 'Direct sale recorded' : 'Personal stock increased', 'success');
      setSelected(null);
      await loadInventory();
    } catch (error) {
      showToast(error?.response?.data?.message || 'Inventory adjustment failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-24">
      <ToastContainer toasts={toasts} dismiss={dismiss} />
      <header className="relative overflow-hidden rounded-3xl bg-[#0e1829] p-6 text-white shadow-xl shadow-slate-900/10">
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-orange-400/20 blur-2xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-orange-300">Mobile Stockist</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">Personal Inventory</h1>
            <p className="mt-2 max-w-xl text-sm text-slate-300">
              Record stock you hold and reduce it when you sell directly outside the system. These entries never alter your City Stockist warehouse.
            </p>
          </div>
          <button
            type="button"
            onClick={loadInventory}
            className="rounded-2xl border border-white/15 bg-white/10 p-3 text-white transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-orange-300"
            aria-label="Refresh inventory"
          >
            <HiOutlineRefresh className="h-5 w-5" />
          </button>
        </div>
        <div className="relative mt-6 inline-flex items-baseline gap-2 rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/10">
          <span className="text-3xl font-black tabular-nums">{totalUnits}</span>
          <span className="text-sm font-semibold text-slate-300">units recorded</span>
        </div>
      </header>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-3xl border border-slate-200 bg-white p-5 animate-pulse dark:border-[var(--dark-border)] dark:bg-[var(--dark-card)]">
              <div className="h-3.5 w-2/3 rounded bg-slate-100" />
              <div className="mt-3 h-6 w-1/3 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <article key={item.product_id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-[var(--dark-border)] dark:bg-[var(--dark-card)]">
              <div className="flex items-start justify-between gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300">
                  <HiOutlineCube className="h-6 w-6" />
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">{item.sku}</span>
              </div>
              <h2 className="mt-4 min-h-12 text-base font-extrabold text-slate-950 dark:text-white">{item.product_name}</h2>
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">On hand</p>
                  <p className="text-3xl font-black tabular-nums text-slate-950 dark:text-white">{Number(item.current_stock || 0)}</p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => openAdjustment(item, 'increase')} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-extrabold text-emerald-800 transition hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                  <HiOutlinePlus className="h-4 w-4" /> Increase stock
                </button>
                <button type="button" onClick={() => openAdjustment(item, 'decrease')} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-orange-600 px-3 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2">
                  <HiOutlineMinus className="h-4 w-4" /> Record direct sale
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal show={Boolean(selected)} onClose={() => !saving && setSelected(null)} size="md">
        <ModalHeader>{direction === 'decrease' ? 'Record direct sale' : 'Increase personal stock'}</ModalHeader>
        <ModalBody className="space-y-4">
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-[var(--dark-card2)]">
            <p className="font-extrabold text-slate-950 dark:text-white">{selected?.product_name}</p>
            <p className="text-sm text-slate-500 dark:text-[var(--dark-muted)]">Current stock: {selected?.current_stock || 0}</p>
          </div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
            Quantity
            <input type="number" min="1" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-950 focus:border-orange-500 focus:ring-orange-500 dark:border-[var(--dark-border)] dark:bg-[var(--dark-card2)] dark:text-white" />
          </label>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
            Record note
            <input type="text" maxLength="255" value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-950 focus:border-orange-500 focus:ring-orange-500 dark:border-[var(--dark-border)] dark:bg-[var(--dark-card2)] dark:text-white" />
          </label>
        </ModalBody>
        <ModalFooter>
          <Button color={direction === 'decrease' ? 'warning' : 'success'} onClick={submitAdjustment} isProcessing={saving} disabled={saving}>
            {direction === 'decrease' ? 'Record direct sale' : 'Increase stock'}
          </Button>
          <Button color="gray" onClick={() => setSelected(null)} disabled={saving}>Cancel</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
