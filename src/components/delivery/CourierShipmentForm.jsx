import { useEffect, useState } from 'react';
import { HiOutlineTruck } from 'react-icons/hi';
import api from '@/services/api';
import { COURIERS, DELIVERY_TOKENS } from '@/services/endpoints';
import useSubmitGuard from '@/hooks/useSubmitGuard';
import { FIELD_CLASSES } from '@/components/formFieldClasses';

// Same rule as the server (routes/deliveryTokens.js): the waybill goes into the courier's own link.
const WAYBILL_PATTERN = /^[A-Za-z0-9-]{4,40}$/;

/**
 * "Shipping with a courier" in the Delivery section (management, 2026-10-14): for provincial orders sent
 * through J&T, LBC or Flash, staff record the courier and waybill. The buyer's tracking page and "on its
 * way" email then show the waybill and a "Track with <courier>" button to the courier's own page.
 * Saving goes through the Rider Link endpoint, which keeps one shipment record per order.
 *
 * @param {object}   props.order       order (id)
 * @param {object}   props.initial     { courierId, waybill } already saved
 * @param {string}   [props.vehicle]   vehicle picked above, sent along when the link is created here
 * @param {Function} props.onSaved     (linkData) => void, with the Rider Link the server returns
 * @param {Function} props.notify      (message, tone) => void
 */
export default function CourierShipmentForm({ order, initial, vehicle, onSaved, notify }) {
  const [couriers, setCouriers] = useState([]);
  const [courierId, setCourierId] = useState(initial?.courierId ? String(initial.courierId) : '');
  const [waybill, setWaybill] = useState(initial?.waybill || '');
  const { submitting, run } = useSubmitGuard();

  useEffect(() => {
    let active = true;
    api.get(COURIERS.LIST, { params: { limit: 100 } })
      .then(({ data }) => { if (active) setCouriers((data.data || []).filter((c) => c.is_active !== 0)); })
      .catch(() => { if (active) setCouriers([]); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    setCourierId(initial?.courierId ? String(initial.courierId) : '');
    setWaybill(initial?.waybill || '');
  }, [initial?.courierId, initial?.waybill]);

  const trimmed = waybill.trim();
  const waybillOk = WAYBILL_PATTERN.test(trimmed);
  const unchanged = String(initial?.courierId || '') === courierId && (initial?.waybill || '') === trimmed;
  const selected = couriers.find((c) => String(c.id) === courierId);

  const save = () => run(async () => {
    try {
      const { data } = await api.post(DELIVERY_TOKENS.GENERATE, {
        order_id: order.id,
        courier_id: Number(courierId),
        courier_tracking_number: trimmed,
        ...(vehicle ? { vehicle_type: vehicle } : {}),
      });
      onSaved({ ...data.data, courier_id: Number(courierId), courier_tracking_number: trimmed });
      notify(`Saved: ${selected?.name || 'courier'} waybill ${trimmed}. The buyer can now track it.`, 'success');
    } catch (err) {
      notify(err?.response?.data?.message || 'Could not save the courier details', 'error');
    }
  });

  return (
    <div className="space-y-2 rounded-xl border border-[var(--ncdms-hairline,#e2d7c8)] p-3 dark:border-white/10">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-[var(--dark-text)]">
        <HiOutlineTruck className="h-4 w-4" aria-hidden="true" /> Shipping with a courier? (optional)
      </p>
      <p className="text-xs text-gray-600 dark:text-[var(--dark-muted)]">
        For J&amp;T, LBC or Flash: pick the courier and type the waybill number. The buyer gets a button to track it on the courier&apos;s site.
      </p>
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <select aria-label="Courier" className={FIELD_CLASSES.input} value={courierId} disabled={submitting} onChange={(e) => setCourierId(e.target.value)}>
          <option value="">Choose the courier</option>
          {couriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input
          aria-label="Waybill number"
          className={FIELD_CLASSES.input}
          value={waybill}
          disabled={submitting}
          maxLength={40}
          onChange={(e) => setWaybill(e.target.value)}
          placeholder="Waybill number"
          aria-invalid={(trimmed && !waybillOk) || undefined}
        />
        <button
          type="button"
          onClick={save}
          disabled={submitting || !courierId || !waybillOk || unchanged}
          className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#3d1800] px-5 text-sm font-semibold text-white active:scale-[0.97] disabled:opacity-50 dark:bg-amber-500 dark:text-[#1c0a00]"
        >
          {submitting ? 'Saving…' : 'Save courier'}
        </button>
      </div>
      {trimmed && !waybillOk ? (
        <p className="text-xs font-medium text-red-700 dark:text-red-300" role="alert">Waybill number: 4 to 40 letters, digits or dashes.</p>
      ) : null}
    </div>
  );
}
