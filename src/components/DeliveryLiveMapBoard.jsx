import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Spinner } from 'flowbite-react';
import { GoogleMap, LoadScriptNext, MarkerF, Polyline } from '@react-google-maps/api';
import OpenDeliveryMap from '@/components/OpenDeliveryMap';
import {
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineLocationMarker,
  HiOutlineRefresh,
  HiOutlineTruck,
  HiOutlineExclamationCircle,
} from 'react-icons/hi';
import api from '@/services/api';
import { TRACKING } from '@/services/endpoints';
import StatusBadge from '@/components/StatusBadge';
import { formatDate, formatRelative } from '@/utils/formatDate';
import { buildRoutePolyline, isGoogleMapsFeatureEnabled, shouldAttemptGoogleMaps } from '@/utils/deliveryMapRuntime';

const FALLBACK_CENTER = { lat: 14.5995, lng: 120.9842 };

function toPoint(point) {
  if (!point) return null;
  const lat = Number(point.latitude);
  const lng = Number(point.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function freshnessMinutes(isoDate) {
  if (!isoDate) return null;
  return Math.round((Date.now() - new Date(isoDate).getTime()) / 60000);
}

function freshnessLabel(isoDate) {
  const mins = freshnessMinutes(isoDate);
  if (mins === null) return { label: 'No Ping', tone: 'gray' };
  if (mins <= 15) return { label: 'Live', tone: 'green' };
  if (mins <= 60) return { label: 'Delayed', tone: 'amber' };
  return { label: 'Stale', tone: 'red' };
}

function midpoint(a, b) {
  if (!a && !b) return FALLBACK_CENTER;
  if (!a) return b;
  if (!b) return a;
  return {
    lat: (a.lat + b.lat) / 2,
    lng: (a.lng + b.lng) / 2,
  };
}

function svgMarker(label, fill) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 52 52">
      <circle cx="26" cy="26" r="22" fill="${fill}" />
      <circle cx="26" cy="26" r="20" fill="white" fill-opacity="0.12" />
      <text x="26" y="30" font-size="7" font-weight="700" text-anchor="middle" fill="white">${label}</text>
    </svg>`
  )}`;
}

function markerIcon(url) {
  if (typeof window === 'undefined' || !window.google?.maps?.Size) {
    return undefined;
  }

  return {
    url,
    scaledSize: new window.google.maps.Size(42, 42),
  };
}

export default function DeliveryLiveMapBoard({
  title,
  summary,
  badgeLabel,
  accent = 'orange',
  orderLinkBuilder,
}) {
  const mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const mapsFeatureEnabled = isGoogleMapsFeatureEnabled(import.meta.env.VITE_ENABLE_GOOGLE_MAPS);
  const mapsConfigured = mapsFeatureEnabled && shouldAttemptGoogleMaps(mapsApiKey);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mapLoadFailed, setMapLoadFailed] = useState(false);
  const [routes, setRoutes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastSyncAt, setLastSyncAt] = useState(null);

  const refreshData = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    setError('');

    try {
      const { data } = await api.get(TRACKING.ACTIVE);
      const nextRoutes = Array.isArray(data?.data) ? data.data : [];
      setRoutes(nextRoutes);
      setSelectedId((prev) => {
        if (prev && nextRoutes.some((item) => item.tracking_id === prev)) {
          return prev;
        }
        return nextRoutes[0]?.tracking_id || null;
      });
      setLastSyncAt(new Date().toISOString());
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load live deliveries');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData(false);
  }, [refreshData]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const interval = setInterval(() => refreshData(true), 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshData]);

  useEffect(() => {
    setMapLoadFailed(false);
  }, [mapsApiKey]);

  const selectedRoute = useMemo(
    () => routes.find((item) => item.tracking_id === selectedId) || routes[0] || null,
    [routes, selectedId]
  );

  const selectedSnapshot = selectedRoute?.map_snapshot || null;
  const sourcePoint = toPoint(selectedSnapshot?.source);
  const currentPoint = toPoint(selectedSnapshot?.current);
  const destinationPoint = toPoint(selectedSnapshot?.destination);
  const mapCenter = currentPoint || midpoint(sourcePoint, destinationPoint);

  const mapPoints = [sourcePoint, currentPoint, destinationPoint].filter(Boolean);
  const routePolyline = buildRoutePolyline({ sourcePoint, currentPoint, destinationPoint });
  const canRenderGoogleMap = mapsConfigured && mapPoints.length > 0 && !mapLoadFailed;
  const canRenderOpenMap = !canRenderGoogleMap && mapPoints.length > 0;
  const openMapMarkers = [
    sourcePoint
      ? {
          key: 'source',
          position: sourcePoint,
          label: selectedSnapshot?.source?.label || 'Source Warehouse',
          description: 'Source',
          color: '#2563eb',
        }
      : null,
    destinationPoint
      ? {
          key: 'destination',
          position: destinationPoint,
          label: selectedSnapshot?.destination?.label || 'Destination',
          description: 'Destination',
          color: '#16a34a',
        }
      : null,
    currentPoint
      ? {
          key: 'current',
          position: currentPoint,
          label: 'Current Delivery Position',
          description: selectedRoute?.courier_name || selectedRoute?.rider_name || 'Current',
          color: '#f97316',
        }
      : null,
  ].filter(Boolean);

  const liveCount = routes.filter((item) => freshnessLabel(item.latest_ping?.pinged_at).label === 'Live').length;
  const staleCount = routes.filter((item) => freshnessLabel(item.latest_ping?.pinged_at).label === 'Stale').length;

  const accentClasses = {
    orange: {
      border: 'border-orange-200',
      bg: 'bg-orange-50',
      badge: 'warning',
      button: 'bg-orange-100 text-orange-700 hover:bg-orange-200',
    },
    green: {
      border: 'border-green-200',
      bg: 'bg-green-50',
      badge: 'success',
      button: 'bg-green-100 text-green-700 hover:bg-green-200',
    },
    blue: {
      border: 'border-blue-200',
      bg: 'bg-blue-50',
      badge: 'info',
      button: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
    },
  }[accent];

  const fallbackReason = mapLoadFailed
    ? 'Google Maps failed to load here, so route telemetry is shown as structured coordinates.'
    : !mapsFeatureEnabled
      ? 'Google Maps is disabled by environment switch, so route telemetry is shown as structured coordinates.'
    : !mapsConfigured
      ? 'Google Maps is not configured for this environment, so route telemetry is shown as structured coordinates.'
      : 'This route does not have enough coordinate data to render a live map, so route telemetry is shown as structured coordinates.';

  return (
    <div className="space-y-5 page-enter">
      <div className={`rounded-2xl border ${accentClasses.border} ${accentClasses.bg} p-5`}>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge color={accentClasses.badge}>{badgeLabel}</Badge>
              <Badge color="success">Live GPS</Badge>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            <p className="text-sm text-gray-600">{summary}</p>
            <p className="text-xs text-gray-500">Last sync: {lastSyncAt ? formatRelative(lastSyncAt) : 'Not synced yet'}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAutoRefresh((prev) => !prev)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold ${autoRefresh ? accentClasses.button : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {autoRefresh ? 'Auto: ON' : 'Auto: OFF'}
            </button>
            <button
              type="button"
              onClick={() => refreshData(true)}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${accentClasses.button}`}
            >
              <HiOutlineRefresh className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <HiOutlineTruck className="h-5 w-5" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{routes.length}</p>
          <p className="text-xs text-gray-500">Active Routes</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600">
            <HiOutlineCheckCircle className="h-5 w-5" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{liveCount}</p>
          <p className="text-xs text-gray-500">Live Signals</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <HiOutlineExclamationCircle className="h-5 w-5" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{staleCount}</p>
          <p className="text-xs text-gray-500">Stale Routes</p>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[360px,1fr]">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Route Queue</h2>
            {loading && <Spinner size="sm" color="warning" />}
          </div>

          {!loading && routes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
              No active deliveries are broadcasting GPS right now.
            </div>
          ) : (
            <div className="space-y-3">
              {routes.map((route) => {
                const freshness = freshnessLabel(route.latest_ping?.pinged_at);
                const isSelected = route.tracking_id === selectedRoute?.tracking_id;

                return (
                  <button
                    type="button"
                    key={route.tracking_id}
                    onClick={() => setSelectedId(route.tracking_id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${isSelected ? `${accentClasses.border} ${accentClasses.bg}` : 'border-gray-100 bg-white hover:border-gray-200'}`}
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-sm font-bold text-gray-900">#{route.order_number}</p>
                        <p className="text-xs text-gray-500">{route.courier_name || route.rider_name || 'Courier pending'}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <StatusBadge status={route.tracking_status || route.order_status} />
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          freshness.tone === 'green'
                            ? 'bg-green-100 text-green-700'
                            : freshness.tone === 'amber'
                              ? 'bg-amber-100 text-amber-700'
                              : freshness.tone === 'red'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-600'
                        }`}>
                          {freshness.label}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 text-xs text-gray-600">
                      <div>
                        <p className="text-gray-400">Source</p>
                        <p className="font-medium text-gray-700">{route.source_warehouse?.label || 'Warehouse unavailable'}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Destination</p>
                        <p className="font-medium text-gray-700">
                          {route.target_warehouse?.label || route.customer?.name || 'Destination unavailable'}
                        </p>
                        <p className="text-gray-500">
                          {route.target_warehouse?.address || route.customer?.address || 'No mapped destination'}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>{route.latest_ping?.pinged_at ? formatRelative(route.latest_ping.pinged_at) : 'No live ping yet'}</span>
                        {route.est_delivery_at && (
                          <span className="text-gray-500">ETA {formatDate(route.est_delivery_at, true)}</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Live Map</h2>
              <p className="text-xs text-gray-500">
                {selectedRoute
                  ? `Showing route for #${selectedRoute.order_number}`
                  : 'Select a route to inspect movement'}
              </p>
            </div>
            {selectedRoute && orderLinkBuilder && (
              <Link
                to={orderLinkBuilder(selectedRoute.order_id)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold ${accentClasses.button}`}
              >
                Open Order
              </Link>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-gray-50" style={{ height: 420 }}>
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <Spinner size="xl" color="warning" />
              </div>
            ) : !selectedRoute ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-gray-400">
                <HiOutlineLocationMarker className="h-12 w-12 opacity-40" />
                <p className="text-sm">No active route selected</p>
              </div>
            ) : canRenderGoogleMap ? (
              <LoadScriptNext googleMapsApiKey={mapsApiKey} onError={() => setMapLoadFailed(true)}>
                <GoogleMap
                  mapContainerStyle={{ width: '100%', height: '100%' }}
                  zoom={mapPoints.length >= 2 ? 7 : 11}
                  center={mapCenter}
                  options={{
                    streetViewControl: false,
                    fullscreenControl: false,
                    mapTypeControl: false,
                  }}
                >
                  {sourcePoint && (
                    <MarkerF
                      position={sourcePoint}
                      title={selectedSnapshot?.source?.label || 'Source Warehouse'}
                      icon={markerIcon(svgMarker('WH', '#2563eb'))}
                    />
                  )}
                  {destinationPoint && (
                    <MarkerF
                      position={destinationPoint}
                      title={selectedSnapshot?.destination?.label || 'Destination'}
                      icon={markerIcon(svgMarker('DST', '#16a34a'))}
                    />
                  )}
                  {currentPoint && (
                    <MarkerF
                      position={currentPoint}
                      title="Current Delivery Position"
                      icon={markerIcon(svgMarker('TRK', '#f97316'))}
                    />
                  )}
                  {routePolyline.length >= 2 && (
                    <Polyline
                      path={routePolyline}
                      options={{
                        strokeColor: '#f97316',
                        strokeOpacity: 0.85,
                        strokeWeight: 4,
                      }}
                    />
                  )}
                </GoogleMap>
              </LoadScriptNext>
            ) : canRenderOpenMap ? (
              <OpenDeliveryMap
                center={mapCenter}
                zoom={mapPoints.length >= 2 ? 7 : 11}
                markers={openMapMarkers}
                polyline={routePolyline}
              />
            ) : (
              <div className="flex h-full flex-col justify-between p-5">
                <div>
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                    <HiOutlineClock className="h-4 w-4" />
                    Map fallback
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {selectedSnapshot?.route_kind === 'warehouse_transfer' ? 'Warehouse route' : 'Customer delivery'}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {fallbackReason}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {[
                    { title: 'Source', point: selectedSnapshot?.source, color: 'text-blue-700 bg-blue-50' },
                    { title: 'Current', point: selectedSnapshot?.current, color: 'text-orange-700 bg-orange-50' },
                    { title: 'Destination', point: selectedSnapshot?.destination, color: 'text-green-700 bg-green-50' },
                  ].map((item) => (
                    <div key={item.title} className="rounded-2xl border border-gray-100 bg-white p-4">
                      <div className={`mb-2 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${item.color}`}>
                        {item.title}
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{item.point?.label || 'Unavailable'}</p>
                      <p className="mt-1 text-xs text-gray-500">{item.point?.address || 'No address data'}</p>
                      <p className="mt-2 font-mono text-xs text-gray-600">
                        {Number.isFinite(Number(item.point?.latitude)) && Number.isFinite(Number(item.point?.longitude))
                          ? `${Number(item.point.latitude).toFixed(5)}, ${Number(item.point.longitude).toFixed(5)}`
                          : 'No coordinates'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {selectedRoute && (
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                <p className="text-xs text-gray-400">Courier</p>
                <p className="text-sm font-semibold text-gray-900">{selectedRoute.courier_name || selectedRoute.rider_name || 'Pending assignment'}</p>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                <p className="text-xs text-gray-400">Last Ping</p>
                <p className="text-sm font-semibold text-gray-900">
                  {selectedRoute.latest_ping?.pinged_at ? formatDate(selectedRoute.latest_ping.pinged_at, true) : 'No ping yet'}
                </p>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                <p className="text-xs text-gray-400">ETA</p>
                <p className="text-sm font-semibold text-gray-900">{selectedRoute.est_delivery_at ? formatDate(selectedRoute.est_delivery_at, true) : 'TBD'}</p>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                <p className="text-xs text-gray-400">Tracking</p>
                <div className="mt-1">
                  <StatusBadge status={selectedRoute.tracking_status || selectedRoute.order_status} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
