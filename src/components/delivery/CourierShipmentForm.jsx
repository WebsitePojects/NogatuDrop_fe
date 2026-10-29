import { useEffect, useState } from 'react';
import { HiOutlineTruck } from 'react-icons/hi';
import api from '@/services/api';
import { COURIERS, DELIVERY_TOKENS } from '@/services/endpoints';
import useSubmitGuard from '@/hooks/useSubmitGuard';
import { FIELD_CLASSES } from '@/components/formFieldClasses';

// Same rules as the server (routes/deliveryTokens.js, utils/courierTracking.js): a waybill goes into the
// courier's own link pattern; a pasted share link (Grab, Lalamove) is sent to the buyer as it is, so https only.
const WAYBILL_PATTERN = /^[A-Za-z0-9-]{4,40}$/;
const LINK_MAX = 500;

export function isShareLink(text) {
  return /^https?:\/\//i.test(text);
}

export function isValidShareLink(text) {
  if (!text || text.length > LINK_MAX) return false;
  try {
    const url = new URL(text);
    return url.protocol === 'https:' && !url.username && !url.password && url.hostname.includes('.');
  } catch {
    return false;
  }
}

/**
 * "Shipping with a courier" in the Delivery section. J&T, LBC, Flash (management, 2026-10-14): staff type the
 * waybill. Grab, Lalamove (2026-10-29): staff paste the app's share tracking link instead. The buyer's tracking
 * page and "on its way" email then show a "Track with <courier>" button to the courier's own page.
 * Saving goes through the Rider Link endpoint, which keeps one shipment record per order.
 *
 * @param {object}   props.order       order (id)
 * @param {object}   props.initial     { courierId, waybill, link } already saved
 * @param {string}   [props.vehicle]   vehicle picked above, sent along when the link is created here
 * @param {Function} props.onSaved     (linkData) => void, with the Rider Link the server returns
 * @param {Function} props.notify      (message, tone) => void
 */
export default function CourierShipmentForm({ order, initial, vehicle, onSaved, notify }) {
  const [couriers, setCouriers] = useState([]);
  const [courierId, setCourierId] = useState(initial?.courierId ? String(initial.courierId) : '');
  const [value, setValue] = useState(initial?.waybill || initial?.link || '');
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
    setValue(initial?.waybill || initial?.link || '');
  }, [initial?.courierId, initial?.waybill, initial?.link]);

  const trimmed = value.trim();
  const asLink = isShareLink(trimmed);
  const valueOk = asLink ? isValidShareLink(trimmed) : WAYBILL_PATTERN.test(trimmed);
  const unchanged = String(initial?.courierId || '') === courierId && (initial?.waybill || initial?.link || '') === trimmed;
  const selected = couriers.find((c) => String(c.id) === courierId);

  const save = () => run(async () => {
    try {
      const { data } = await api.post(DELIVERY_TOKENS.GENERATE, {
        order_id: order.id,
        courier_id: Number(courierId),
        ...(asLink ? { courier_tracking_link: trimmed } : { courier_tracking_number: trimmed }),
        ...(vehicle ? { vehicle_type: vehicle } : {}),
      });
      onSaved({
        ...data.data,
        courier_id: Number(courierId),
        courier_name: selected?.name || null,
        courier_tracking_number: asLink ? null : trimmed,
        courier_tracking_link: asLink ? trimmed : null,
      });
      notify(`Saved: ${selected?.name || 'courier'} ${asLink ? 'tracking link' : `waybill ${trimmed}`}. The buyer can now track it.`, 'success');
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
        J&amp;T, LBC or Flash: pick the courier and type the waybill number. Grab or Lalamove: in the app, share the
        delivery&apos;s live tracking and paste the link here. The buyer gets a button to follow it on the courier&apos;s site.
      </p>
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <select aria-label="Courier" className={FIELD_CLASSES.input} value={courierId} disabled={submitting} onChange={(e) => setCourierId(e.target.value)}>
          <option value="">Choose the courier</option>
          {couriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input
          aria-label="Waybill number or tracking link"
          className={FIELD_CLASSES.input}
          value={value}
          disabled={submitting}
          maxLength={LINK_MAX}
          inputMode={asLink ? 'url' : 'text'}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Waybill no. or https:// link"
          aria-invalid={(trimmed && !valueOk) || undefined}
        />
        <button
          type="button"
          onClick={save}
          disabled={submitting || !courierId || !valueOk || unchanged}
          className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#3d1800] px-5 text-sm font-semibold text-white active:scale-[0.97] disabled:opacity-50 dark:bg-amber-500 dark:text-[#1c0a00]"
        >
          {submitting ? 'Saving…' : 'Save courier'}
        </button>
      </div>
      {trimmed && !valueOk ? (
        <p className="text-xs font-medium text-red-700 dark:text-red-300" role="alert">
          {asLink
            ? 'Paste the full tracking link from the courier app. It must start with https://.'
            : 'Waybill number: 4 to 40 letters, digits or dashes. For Grab or Lalamove, paste the tracking link instead.'}
        </p>
      ) : null}
    </div>
  );
}
