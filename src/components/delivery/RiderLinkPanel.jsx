import { useEffect, useState } from 'react';
import { HiOutlineClipboardCopy, HiOutlineCheck, HiOutlineShare } from 'react-icons/hi';
import api from '@/services/api';
import { DELIVERY_TOKENS } from '@/services/endpoints';
import useSubmitGuard from '@/hooks/useSubmitGuard';
import useOrderRoute from '@/hooks/useOrderRoute';
import DeliveryMap from '@/components/delivery/DeliveryMap';
import CourierShipmentForm from '@/components/delivery/CourierShipmentForm';
import ConfirmModal from '@/components/ConfirmModal';
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
 * Courier parcels (J&T, LBC, Flash): their rider never opens our Rider Link, so staff close the order once the
 * courier's own page shows it delivered (management, 2026-10-27). The server allows it once, for orders on the way.
 */
function CourierDeliveredAction({ order, courierName, notify, onDelivered }) {
  const [confirming, setConfirming] = useState(false);
  const { submitting, run } = useSubmitGuard();

  const markDelivered = () => run(async () => {
    try {
      const { data } = await api.post(DELIVERY_TOKENS.COURIER_DELIVERED(order.id));
      notify(data?.message || 'Marked delivered.', 'success');
      onDelivered();
    } catch (err) {
      notify(err?.response?.data?.message || 'Could not mark the order delivered', 'error');
      // Someone else closed it first: show the current state instead of a stale button.
      if (err?.response?.status === 409) onDelivered();
    } finally {
      setConfirming(false);
    }
  });

  return (
    <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-500/25 dark:bg-emerald-500/10">
      <p className="text-sm text-gray-800 dark:text-[var(--dark-text)]">
        When {courierName}&apos;s tracking page shows <strong>Delivered</strong>, close the order here. The buyer gets the
        &quot;Delivered&quot; email and the boxes leave the stock.
      </p>
      <button
        type="button"
        disabled={submitting}
        onClick={() => setConfirming(true)}
        className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-emerald-700 px-5 text-sm font-semibold text-white active:scale-[0.97] disabled:opacity-50 sm:w-auto"
      >
        Mark delivered
      </button>
      <ConfirmModal
        show={confirming}
        title="Mark delivered?"
        message={`Only if ${courierName}'s page shows order ${order.order_number} as delivered. This closes the order, emails the buyer and takes the boxes out of stock. It cannot be undone.`}
        confirmLabel="Mark delivered"
        confirmColor="success"
        loading={submitting}
        onConfirm={markDelivered}
        onClose={() => { if (!submitting) setConfirming(false); }}
      />
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
 * @param {Function} [props.onDelivered] reload the order after a courier parcel is marked delivered
 */
export default function RiderLinkPanel({ order, canManage = false, notify = () => {}, onDelivered = () => {} }) {
  const paid = isPaid(order);
  const closed = isClosed(order);
  const onTheRoad = ['delivering', 'delivered'].includes(String(order?.status || '').toLowerCase());
  const { route } = useOrderRoute(onTheRoad || (paid && !closed) ? order?.id : null);
  const [link, setLink] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [copied, setCopied] = useState(false);
  const [shipment, setShipment] = useState(null); // { courierId, waybill } saved for this order
  const { submitting, run } = useSubmitGuard();

  useEffect(() => {
    setLink(null);
    setCopied(false);
    setShipment(null);
    if (!canManage || !paid || closed || !order?.id) return undefined;
    let active = true;
    api.get(DELIVERY_TOKENS.BY_ORDER(order.id))
      .then(({ data }) => {
        if (active && data?.data?.magic_link) {
          setLink({ url: data.data.magic_link, expiresAt: data.data.expires_at });
          setShipment({ courierId: data.data.courier_id, waybill: data.data.courier_tracking_number });
        }
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
  // A courier parcel is followed on the courier's own page: no Rider Link, no live map.
  const courier = route?.courier || (shipment?.waybill ? { name: null, waybill: shipment.waybill } : null);
  const courierName = courier?.name || 'the courier';
  const delivering = String(order.status || '').toLowerCase() === 'delivering';
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
          {courier ? `Shipped by ${courier.name || 'courier'}` : showManage ? 'Rider Link' : 'On the way'}
        </h3>
        {courier ? (
          <p className="text-sm text-gray-600 dark:text-[var(--dark-muted)]">
            Waybill <span className="font-mono">{courier.waybill}</span>
            {closed ? ' · Delivered' : ''}
          </p>
        ) : null}
      </div>

      {showManage && courier && delivering ? (
        <CourierDeliveredAction order={order} courierName={courierName} notify={notify} onDelivered={onDelivered} />
      ) : null}

      {showManage ? (
        <>
          {courier ? null : (
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
          )}
          <CourierShipmentForm
            order={order}
            initial={shipment}
            vehicle={vehicle}
            notify={notify}
            onSaved={(data) => {
              setLink({ url: data.magic_link, expiresAt: data.expires_at });
              setShipment({ courierId: data.courier_id, waybill: data.courier_tracking_number });
            }}
          />
        </>
      ) : null}

      {!courier && route && (route.source || route.destination) ? (
        <DeliveryMap route={route} destinationKind={order.is_public ? 'home' : 'stockist'} height={300} />
      ) : null}
    </section>
  );
}
