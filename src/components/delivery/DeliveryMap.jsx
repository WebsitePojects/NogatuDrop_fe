import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, ZoomControl, useMap } from 'react-leaflet';
import { HiOutlineViewfinderCircle } from 'react-icons/hi2';
import { bearing, pinIcon, vehicleMarkerIcon, VEHICLES } from '@/components/delivery/deliveryIcons';
import { PH_CENTER } from '@/utils/phBounds';

const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const GLIDE_MS = 1500;
// A ping older than this means the rider's phone stopped reporting; the pulse turns off.
const STALE_PING_MS = 3 * 60 * 1000;

const asLatLng = (p) => (p && p.lat != null && p.lng != null && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng))
  ? [Number(p.lat), Number(p.lng)]
  : null);
const prefersReducedMotion = () => typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function formatKm(meters) {
  if (!Number.isFinite(meters)) return '';
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}

/** One line of what the map means right now, shown in the chip over the map. */
export function deliveryStatusLine(route) {
  if (!route) return '';
  if (route.order_status === 'delivered') return 'Delivered';
  if (route.eta) {
    const left = route.remaining ? ` · ${formatKm(route.remaining.distance_m)} to go` : '';
    return `Arrives in ${route.eta.min_minutes}–${route.eta.max_minutes} min${left}`;
  }
  if (route.planned) return `Not on the road yet · ${formatKm(route.planned.distance_m)} route`;
  return 'Waiting for the rider to start';
}

/** Moves the vehicle marker smoothly from where it was to the new position instead of jumping. */
function GlidingVehicle({ position, vehicleType, heading, live, label }) {
  const markerRef = useRef(null);
  const shownRef = useRef(position);
  const icon = useMemo(() => vehicleMarkerIcon(vehicleType, { heading, live }), [vehicleType, heading, live]);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker || !position) return undefined;
    const from = shownRef.current || position;
    if (prefersReducedMotion() || (from[0] === position[0] && from[1] === position[1])) {
      marker.setLatLng(position);
      shownRef.current = position;
      return undefined;
    }
    let frame;
    const started = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - started) / GLIDE_MS);
      const eased = 1 - (1 - t) ** 3;
      const next = [from[0] + (position[0] - from[0]) * eased, from[1] + (position[1] - from[1]) * eased];
      marker.setLatLng(next);
      shownRef.current = next;
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [position]);

  if (!position) return null;
  return (
    <Marker ref={markerRef} position={shownRef.current || position} icon={icon} zIndexOffset={1000}>
      <Tooltip direction="top" offset={[0, -20]}>{label}</Tooltip>
    </Marker>
  );
}

/** Fits the map to the delivery once, and again whenever `recenterKey` changes. */
function FitToDelivery({ points, recenterKey }) {
  const map = useMap();
  const fittedFor = useRef(null);
  useEffect(() => {
    if (!points.length || fittedFor.current === recenterKey) return;
    fittedFor.current = recenterKey;
    if (points.length === 1) map.setView(points[0], 15);
    else map.fitBounds(points, { padding: [48, 48], maxZoom: 16 });
  }, [map, points, recenterKey]);
  return null;
}

/**
 * The delivery map used everywhere a delivery is shown (Super Admin live map, order details,
 * the rider's page, public tracking). Feed it GET /tracking/:orderId/route, or a reduced object
 * with only `source`, `rider`, `vehicle_type` (public tracking, which must not draw the line to the buyer).
 *
 * @param {object}  props.route        route payload
 * @param {'home'|'stockist'} [props.destinationKind] pin for the destination
 * @param {number}  [props.height]     px
 * @param {string}  [props.riderLabel] tooltip on the vehicle
 * @param {Array}   [props.others]     other active riders [{ key, point:[lat,lng], vehicle_type, label, onSelect }]
 */
export default function DeliveryMap({ route, destinationKind = 'home', height = 320, riderLabel, others = [] }) {
  const [recenterKey, setRecenterKey] = useState(0);
  const source = asLatLng(route?.source);
  const destination = asLatLng(route?.destination);
  const rider = asLatLng(route?.rider);
  const travelled = route?.travelled || [];
  const vehicleType = route?.vehicle_type || 'motorcycle';

  const heading = travelled.length >= 2 ? bearing(travelled.at(-2), travelled.at(-1)) : null;
  const lastPingAt = route?.rider_pinged_at ? new Date(route.rider_pinged_at).getTime() : null;
  const live = route?.order_status === 'delivering' && (!lastPingAt || Date.now() - lastPingAt < STALE_PING_MS);

  // Frame the delivery being looked at; other riders show when they are inside that view.
  const points = useMemo(
    () => [source, destination, rider].filter(Boolean),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [route?.order_number, Boolean(source), Boolean(destination), Boolean(rider)],
  );
  const center = rider || source || destination || [PH_CENTER.lat, PH_CENTER.lng];
  const remaining = route?.remaining;
  const showPlanned = route?.planned && !rider && route?.order_status !== 'delivered';
  const approximate = (remaining || route?.planned)?.source === 'approximate';

  return (
    <div className="ncdms-delivery-map relative overflow-hidden rounded-2xl border border-[var(--ncdms-hairline,#e2d7c8)] dark:border-white/10" style={{ height }}>
      <MapContainer center={center} zoom={13} scrollWheelZoom={false} zoomControl={false} className="h-full w-full" attributionControl>
        <ZoomControl position="bottomright" />
        <TileLayer url={TILE_URL} attribution={TILE_ATTR} />
        <FitToDelivery points={points} recenterKey={`${route?.order_number || ''}:${recenterKey}`} />

        {showPlanned && (
          <Polyline positions={route.planned.coordinates} pathOptions={{ color: '#3d1800', weight: 4, opacity: 0.45, dashArray: '8 8' }} />
        )}
        {travelled.length >= 2 && (
          <Polyline positions={travelled} pathOptions={{ color: '#3d1800', weight: 5, opacity: 0.75 }} />
        )}
        {remaining && rider && (
          <>
            <Polyline positions={remaining.coordinates} pathOptions={{ color: '#ffffff', weight: 9, opacity: 0.9 }} />
            <Polyline
              positions={remaining.coordinates}
              pathOptions={{ color: '#d97706', weight: 5, opacity: 1, dashArray: remaining.source === 'approximate' ? '10 8' : null }}
            />
          </>
        )}

        {source && (
          <Marker position={source} icon={pinIcon('center')}>
            <Tooltip direction="top" offset={[0, -38]}>{route.source.name || 'Ships from here'}</Tooltip>
          </Marker>
        )}
        {destination && (
          <Marker position={destination} icon={pinIcon(destinationKind)}>
            <Tooltip direction="top" offset={[0, -38]}>{destinationKind === 'stockist' ? 'Stockist warehouse' : 'Delivery address'}</Tooltip>
          </Marker>
        )}
        <GlidingVehicle
          position={rider}
          vehicleType={vehicleType}
          heading={heading}
          live={live}
          label={riderLabel || `${VEHICLES[vehicleType]?.label || 'Rider'}${route?.rider_name ? ` · ${route.rider_name}` : ''}`}
        />
        {others.map((o) => (
          <Marker key={o.key} position={o.point} icon={vehicleMarkerIcon(o.vehicle_type, { live: true })} eventHandlers={{ click: o.onSelect }}>
            <Tooltip direction="top" offset={[0, -20]}>{o.label}</Tooltip>
          </Marker>
        ))}
      </MapContainer>

      {route ? (
        <div className="pointer-events-none absolute left-3 top-3 z-[500] max-w-[calc(100%-5rem)] rounded-full bg-white/95 px-3.5 py-1.5 text-[13px] font-semibold text-[#3d1800] shadow-md ring-1 ring-black/5 dark:bg-[#1b1511]/95 dark:text-[#f5efe6]">
          {deliveryStatusLine(route)}
        </div>
      ) : null}
      {approximate ? (
        <div className="pointer-events-none absolute bottom-7 left-3 z-[500] rounded-md bg-amber-50/95 px-2 py-1 text-[11px] font-medium text-amber-900 ring-1 ring-amber-200">
          Approximate line — road routing is unavailable right now
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setRecenterKey((k) => k + 1)}
        aria-label="Re-center the map on this delivery"
        className="absolute right-3 top-3 z-[500] grid h-11 w-11 place-items-center rounded-full bg-white text-[#3d1800] shadow-md ring-1 ring-black/10 active:scale-95 dark:bg-[#1b1511] dark:text-[#f5efe6]"
      >
        <HiOutlineViewfinderCircle className="h-5 w-5" />
      </button>
    </div>
  );
}
