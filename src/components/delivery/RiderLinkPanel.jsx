import { useEffect, useState } from 'react';
import { HiOutlineClipboardCopy, HiOutlineCheck, HiOutlineShare } from 'react-icons/hi';
import api from '@/services/api';
import { DELIVERY_TOKENS } from '@/services/endpoints';
import useSubmitGuard from '@/hooks/useSubmitGuard';
import useOrderRoute from '@/hooks/useOrderRoute';
import DeliveryMap from '@/components/delivery/DeliveryMap';
import { VEHICLES, VEHICLE_ORDER, vehicleSvg } from '@/components/delivery/deliveryIcons';
import { formatDateTime } from '@/utils/formatDate';

const isPaid = (order) => ['paid', 'verified'].includes(String(order?.payment_status || '').toLowerCase());
const isClosed = (order) => ['delivered', 'cancelled', 'rejected'].includes(String(order?.status || '').toLowerCase());

/** Motorcycle / Car / Van / Truck as one radio group with the same icons the map uses. */
export function VehiclePicker({ value, onChange, disabled }) {
  return (
    <div role="radiogroup" aria-label="Vehicle" className="grid grid-cols-4 gap-2">
      {VEHICLE_ORDER.map((type) => {
        const selected = value === type;
        return (
          <button
            key={type}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(type)}
            className={`flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2 text-xs font-semibold transition active:scale-[0.97] disabled:opacity-60 ${
              selected
                ? 'border-[#3d1800] bg-amber-50 text-[#3d1800] ring-2 ring-amber-400 dark:border-amber-300 dark:bg-amber-500/10 dark:text-amber-100'
                : 'border-[var(--ncdms-hairline,#e2d7c8)] bg-white text-gray-700 dark:border-white/15 dark:bg-transparent dark:text-[var(--dark-text)]'
            }`}
          >
            {/* Static artwork from deliveryIcons.js, never user input. */}
            <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: vehicleSvg(type, 30) }} />
            {VEHICLES[type].label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Delivery section of Order Details: create and share the Rider Link (who may manage it is decided by
 * the page and enforced by the server), pick the vehicle, and watch the delivery on the map.
 *
 * @param {object}   props.order      order detail (id, status, payment_status, is_public)
 * @param {boolean}  props.canManage  may create/share the Rider Link for this order
 * @param {Function} [props.notify]   (message, tone) => void, e.g. the page's toast
 */
export default function RiderLinkPanel({ order, canManage = false, notify = () => {} }) {
  const paid = isPaid(order);
  const closed = isClosed(order);
  const onTheRoad = ['delivering', 'delivered'].includes(String(order?.status || '').toLowerCase());
  const { route } = useOrderRoute(onTheRoad || (paid && !closed) ? order?.id : null);
  const [link, setLink] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [copied, setCopied] = useState(false);
  const { submitting, run } = useSubmitGuard();

  useEffect(() => {
    setLink(null);
    setCopied(false);
    if (!canManage || !paid || closed || !order?.id) return undefined;
    let active = true;
    api.get(DELIVERY_TOKENS.BY_ORDER(order.id))
      .then(({ data }) => {
        if (active && data?.data?.magic_link) setLink({ url: data.data.magic_link, expiresAt: data.data.expires_at });
      })
      .catch(() => { /* no link yet, or not allowed: the create button covers both */ });
    return () => { active = false; };
  }, [order?.id, canManage, paid, closed]);

  useEffect(() => {
    if (route?.vehicle_type && vehicle == null) setVehicle(route.vehicle_type);
  }, [route?.vehicle_type, vehicle]);

  const createOrUpdate = (vehicleType) => run(async () => {
    try {
      const { data } = await api.post(DELIVERY_TOKENS.GENERATE, { order_id: order.id, vehicle_type: vehicleType });
      setLink({ url: data.data.magic_link, expiresAt: data.data.expires_at });
      setVehicle(vehicleType);
      notify(link ? `Vehicle set to ${VEHICLES[vehicleType].label}.` : 'Rider Link ready. Send it to the rider.', 'success');
    } catch (err) {
      notify(err?.response?.data?.message || 'Could not create the Rider Link', 'error');
    }
  });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      notify('Copy failed — press and hold the link to copy it.', 'warning');
    }
  };

  const share = async () => {
    const text = `Nogatu delivery ${order.order_number}: open this on your phone, keep it open while driving, and take a photo at the door. ${link.url}`;
    if (navigator.share) {
      try { await navigator.share({ title: `Rider Link ${order.order_number}`, text }); } catch { /* user closed the sheet */ }
    } else {
      window.location.href = `sms:?body=${encodeURIComponent(text)}`;
    }
  };

  if (!order) return null;
  const showManage = canManage && paid && !closed;
  if (!showManage && !onTheRoad) {
    return canManage && !paid && !closed ? (
      <p className="rounded-xl border border-dashed border-[var(--ncdms-hairline,#e2d7c8)] px-4 py-3 text-sm text-gray-600 dark:border-white/15 dark:text-[var(--dark-muted)]">
        The Rider Link becomes available once payment is confirmed.
      </p>
    ) : null;
  }

  return (
    <section aria-labelledby={`rider-link-${order.id}`} className="space-y-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">Delivery</p>
        <h3 id={`rider-link-${order.id}`} className="text-base font-bold text-gray-900 dark:text-[var(--dark-text)]">
          {showManage ? 'Rider Link' : 'On the way'}
        </h3>
      </div>

      {showManage ? (
        <>
          <VehiclePicker
            value={vehicle}
            disabled={submitting}
            onChange={(type) => (link ? createOrUpdate(type) : setVehicle(type))}
          />
          {link ? (
            <div className="space-y-2 rounded-xl border border-[var(--ncdms-hairline,#e2d7c8)] p-3 dark:border-white/10">
              <p className="text-sm text-gray-700 dark:text-[var(--dark-muted)]">
                Send this to the rider. They open it on their phone, keep it open while driving (their location shows on the map), and take a photo at the door to mark the order delivered. No login needed.
              </p>
              <input
                readOnly
                value={link.url}
                aria-label="Rider Link"
                onFocus={(e) => e.target.select()}
                className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 font-mono text-[13px] text-gray-800 dark:border-white/15 dark:bg-white/5 dark:text-[var(--dark-text)]"
              />
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={copy} className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#3d1800] px-4 text-sm font-semibold text-white active:scale-[0.97] dark:bg-amber-500 dark:text-[#1c0a00]">
                  {copied ? <HiOutlineCheck className="h-4 w-4" /> : <HiOutlineClipboardCopy className="h-4 w-4" />}
                  {copied ? 'Copied' : 'Copy link'}
                </button>
                <button type="button" onClick={share} className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[var(--ncdms-hairline,#e2d7c8)] px-4 text-sm font-semibold text-gray-800 active:scale-[0.97] dark:border-white/15 dark:text-[var(--dark-text)]">
                  <HiOutlineShare className="h-4 w-4" /> Send to rider
                </button>
                {link.expiresAt ? (
                  <span className="text-xs text-gray-600 dark:text-[var(--dark-muted)]">Works until {formatDateTime(link.expiresAt)} or until delivered</span>
                ) : null}
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={!vehicle || submitting}
              onClick={() => createOrUpdate(vehicle)}
              className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-[#3d1800] px-5 text-sm font-semibold text-white active:scale-[0.97] disabled:opacity-50 sm:w-auto dark:bg-amber-500 dark:text-[#1c0a00]"
            >
              {submitting ? 'Creating…' : vehicle ? `Create Rider Link (${VEHICLES[vehicle].label})` : 'Pick the vehicle first'}
            </button>
          )}
        </>
      ) : null}

      {route && (route.source || route.destination) ? (
        <DeliveryMap route={route} destinationKind={order.is_public ? 'home' : 'stockist'} height={300} />
      ) : null}
    </section>
  );
}
