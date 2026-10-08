import { useState } from 'react';
import { Button } from 'flowbite-react';
import { HiOutlinePencilAlt, HiOutlineExclamation } from 'react-icons/hi';
import api from '@/services/api';
import { ORDERS } from '@/services/endpoints';
import formatCurrency from '@/utils/formatCurrency';
import { formatDate } from '@/utils/formatDate';
import useSubmitGuard from '@/hooks/useSubmitGuard';
import { FIELD_CLASSES } from '@/components/formFieldClasses';

const KIND_LABEL = { payment: 'Payment receipt', additional: 'Extra payment for the new delivery fee' };

/**
 * Store-order money after checkout (management, 2026-10-08): staff change the delivery fee before payment is
 * verified (a bulk order, a far address) instead of cancelling, and the buyer sends an extra receipt for the
 * difference on the tracking page. Shows the change form (when the server allows it), what is still owed or
 * overpaid, every fee change and every receipt. The server recomputes the total; this screen only previews it.
 */
export default function OrderFeeAndReceipts({ order, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [fee, setFee] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const saving = useSubmitGuard();

  if (!order || order.placed_by_type !== 'public') return null;
  const owed = Number(order.amount_still_owed || 0);
  const overpaid = Number(order.amount_overpaid || 0);
  const changes = order.fee_adjustments || [];
  const receipts = order.payment_proofs || [];
  const currentFee = Number(order.shipping_fee || 0);
  const newFee = fee === '' ? null : Number(fee);
  const previewTotal = newFee == null || Number.isNaN(newFee) ? null : Number(order.total_amount) - currentFee + newFee;

  const open = () => { setFee(String(currentFee)); setReason(''); setError(''); setEditing(true); };

  const save = (e) => {
    e.preventDefault();
    if (newFee == null || Number.isNaN(newFee) || newFee < 0) { setError('Enter the new delivery fee in pesos.'); return; }
    if (reason.trim().length < 3) { setError('Say why, for example "10 boxes need a van" or "Davao address".'); return; }
    saving.run(async () => {
      setError('');
      try {
        await api.patch(ORDERS.SHIPPING_FEE(order.id), { shipping_fee: newFee, reason: reason.trim() });
        setEditing(false);
        await onChanged?.();
      } catch (err) {
        setError(err?.response?.data?.message || 'Could not change the delivery fee. Please try again.');
      }
    });
  };

  if (!order.can_change_shipping_fee && !owed && !overpaid && changes.length === 0 && receipts.length < 2) return null;

  return (
    <section className="space-y-3 rounded-2xl border border-[var(--ncdms-hairline,#ece3d6)] bg-white p-4 dark:border-white/10 dark:bg-[var(--dark-card)]">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">Delivery fee and receipts</h3>
        {order.can_change_shipping_fee && !editing ? (
          <Button size="xs" color="light" onClick={open}>
            <HiOutlinePencilAlt className="mr-1 h-4 w-4" /> Change delivery fee
          </Button>
        ) : null}
      </div>

      {editing ? (
        <form onSubmit={save} className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-500/20 dark:bg-amber-500/5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="newShippingFee" className={FIELD_CLASSES.label}>New delivery fee (₱)</label>
              <input id="newShippingFee" type="number" inputMode="decimal" min="0" step="0.01" value={fee}
                onChange={(e) => setFee(e.target.value)} className={FIELD_CLASSES.input} disabled={saving.submitting} />
            </div>
            <div className="text-sm">
              <p className="mb-1 font-medium text-gray-900 dark:text-[var(--dark-text)]">New total</p>
              <p className="tabular-nums text-lg font-extrabold text-gray-900 dark:text-white">
                {previewTotal == null ? '—' : formatCurrency(previewTotal)}
              </p>
              <p className="text-xs text-gray-600 dark:text-[var(--dark-muted)]">Now {formatCurrency(order.total_amount)}. VAT stays the same.</p>
            </div>
          </div>
          <div>
            <label htmlFor="feeReason" className={FIELD_CLASSES.label}>Reason (the buyer may ask)</label>
            <input id="feeReason" type="text" maxLength={255} value={reason} placeholder="10 boxes need a van"
              onChange={(e) => setReason(e.target.value)} className={FIELD_CLASSES.input} disabled={saving.submitting} />
          </div>
          {receipts.length > 0 && newFee != null && newFee > currentFee ? (
            <p className="text-xs text-amber-900 dark:text-amber-200">
              The buyer already sent a receipt. After saving, call or message them: they send the extra amount and upload a
              second receipt on their tracking page.
            </p>
          ) : null}
          {error ? <p className="text-sm font-medium text-red-700 dark:text-red-300" role="alert">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" color="warning" size="sm" disabled={saving.submitting}>
              {saving.submitting ? 'Saving…' : 'Save new fee'}
            </Button>
            <Button type="button" color="light" size="sm" disabled={saving.submitting} onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </form>
      ) : null}

      {owed > 0 ? (
        <p className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100" role="status">
          <HiOutlineExclamation className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>The buyer still owes <strong className="tabular-nums">{formatCurrency(owed)}</strong> after the fee change. Payment can be verified once their extra receipt arrives.</span>
        </p>
      ) : null}
      {overpaid > 0 ? (
        <p className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800 dark:border-white/10 dark:bg-white/5 dark:text-[var(--dark-text)]">
          The buyer paid <strong className="tabular-nums">{formatCurrency(overpaid)}</strong> more than the new total. Refund it outside the system.
        </p>
      ) : null}

      {changes.length > 0 ? (
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-[var(--dark-muted)]">Fee changes</p>
          <ul className="divide-y divide-[var(--ncdms-hairline,#ece3d6)] dark:divide-white/10">
            {changes.map((c) => (
              <li key={c.id} className="py-2 text-sm text-gray-800 dark:text-[var(--dark-text)]">
                <span className="font-semibold tabular-nums">{formatCurrency(c.old_shipping_fee)} → {formatCurrency(c.new_shipping_fee)}</span>
                <span className="text-gray-600 dark:text-[var(--dark-muted)]"> · {c.reason}</span>
                <span className="block text-xs text-gray-600 dark:text-[var(--dark-muted)]">{c.adjusted_by_name || 'Staff'} · {formatDate(c.created_at, true)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {receipts.length > 1 ? (
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-[var(--dark-muted)]">All receipts</p>
          <ul className="divide-y divide-[var(--ncdms-hairline,#ece3d6)] dark:divide-white/10">
            {receipts.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="block font-semibold text-gray-900 dark:text-white">{KIND_LABEL[r.kind] || 'Receipt'}</span>
                  <span className="block text-xs text-gray-600 dark:text-[var(--dark-muted)]">For a total of {formatCurrency(r.covers_total)} · {formatDate(r.uploaded_at, true)}</span>
                </span>
                <a href={r.proof_url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-sm font-semibold text-amber-800 underline dark:text-amber-300">Open</a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
