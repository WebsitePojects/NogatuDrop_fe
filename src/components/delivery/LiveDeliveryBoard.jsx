import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { HiOutlineRefresh } from 'react-icons/hi';
import api from '@/services/api';
import { TRACKING } from '@/services/endpoints';
import useOrderRoute from '@/hooks/useOrderRoute';
import DeliveryMap, { deliveryStatusLine } from '@/components/delivery/DeliveryMap';
import { VEHICLES, vehicleSvg } from '@/components/delivery/deliveryIcons';
import { formatRelative } from '@/utils/formatDate';

const LIST_REFRESH_MS = 20000;

// null must stay "no position": Number(null) is 0, which would put the rider in the sea off Africa.
const riderPoint = (item) => {
  const { latitude, longitude } = item?.latest_ping || {};
  if (latitude == null || longitude == null) return null;
  const lat = Number(latitude);
  const lng = Number(longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;
};

/**
 * Every delivery on the road right now (scoped by the server: national for Super Admin, own scope
 * for centers and Stockists). The selected one shows its road route and arrival window; the other
 * riders show as vehicle icons that can be tapped.
 */
export default function LiveDeliveryBoard({ title, summary, orderLinkBuilder }) {
  const [items, setItems] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastSyncAt, setLastSyncAt] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get(TRACKING.ACTIVE);
      const list = Array.isArray(data?.data) ? data.data : [];
      setItems(list);
      setSelectedOrderId((prev) => (prev && list.some((i) => i.order_id === prev) ? prev : list[0]?.order_id || null));
      setLastSyncAt(new Date().toISOString());
      setError('');
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not load the deliveries on the road');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, LIST_REFRESH_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const { route } = useOrderRoute(selectedOrderId);
  const selected = items.find((i) => i.order_id === selectedOrderId) || null;
  const others = useMemo(() => items
    .filter((i) => i.order_id !== selectedOrderId && riderPoint(i))
    .map((i) => ({
      key: i.order_id,
      point: riderPoint(i),
      vehicle_type: i.vehicle_type,
      label: `${i.order_number} · ${VEHICLES[i.vehicle_type]?.label || 'Rider'}`,
      onSelect: () => setSelectedOrderId(i.order_id),
    })), [items, selectedOrderId]);

  return (
    <div className="space-y-5 p-4 md:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-700 dark:text-amber-300">Deliveries</p>
          <h1 className="font-heading text-3xl text-[#3d1800] dark:text-[var(--dark-text)]">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-600 dark:text-[var(--dark-muted)]">{summary}</p>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[var(--ncdms-hairline,#e2d7c8)] px-4 text-sm font-semibold text-gray-800 active:scale-[0.97] dark:border-white/15 dark:text-[var(--dark-text)]"
        >
          <HiOutlineRefresh className="h-4 w-4" />
          {lastSyncAt ? `Updated ${formatRelative(lastSyncAt)}` : 'Refresh'}
        </button>
      </header>

      {error ? <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(280px,360px)_1fr]">
        <div className="order-2 lg:order-1">
          <p className="mb-2 text-sm font-semibold text-gray-900 dark:text-[var(--dark-text)]">
            On the road <span className="tabular-nums text-gray-500">({items.length})</span>
          </p>
          {loading ? (
            <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-100 dark:bg-white/5" />)}</div>
          ) : items.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[var(--ncdms-hairline,#e2d7c8)] px-4 py-8 text-center text-sm text-gray-600 dark:border-white/15 dark:text-[var(--dark-muted)]">
              No deliveries on the road right now. They appear here as soon as a rider opens their Rider Link.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--ncdms-hairline,#ece3d6)] dark:divide-white/10">
              {items.map((item) => {
                const active = item.order_id === selectedOrderId;
                return (
                  <li key={item.order_id}>
                    <button
                      type="button"
                      onClick={() => setSelectedOrderId(item.order_id)}
                      aria-pressed={active}
                      className={`flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left transition ${active ? 'bg-amber-50 dark:bg-amber-500/10' : 'active:bg-black/[0.03]'}`}
                    >
                      <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white ring-2 ring-amber-400 dark:bg-[#1b1511]" dangerouslySetInnerHTML={{ __html: vehicleSvg(item.vehicle_type, 28) }} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-mono text-[13px] font-semibold text-gray-900 dark:text-[var(--dark-text)]">{item.order_number}</span>
                        <span className="block truncate text-[13px] text-gray-600 dark:text-[var(--dark-muted)]">
                          {item.customer?.name || item.target_warehouse?.label || 'Delivery'}
                          {item.latest_ping?.pinged_at ? ` · seen ${formatRelative(item.latest_ping.pinged_at)}` : ' · not started'}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="order-1 space-y-2 lg:order-2">
          {selected ? (
            <>
              <DeliveryMap route={route} others={others} height={420} destinationKind={selected.customer ? 'home' : 'stockist'} />
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-gray-700 dark:text-[var(--dark-muted)]">
                  <span className="font-mono font-semibold text-gray-900 dark:text-[var(--dark-text)]">{selected.order_number}</span>
                  {route ? ` · ${deliveryStatusLine(route)}` : ''}
                </span>
                {orderLinkBuilder ? (
                  <Link to={orderLinkBuilder(selected.order_id)} className="font-semibold text-amber-800 underline-offset-4 hover:underline dark:text-amber-300">
                    Open order
                  </Link>
                ) : null}
              </div>
            </>
          ) : !loading ? (
            <DeliveryMap route={null} height={320} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
