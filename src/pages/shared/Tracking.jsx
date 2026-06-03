import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { HiSearch, HiTruck, HiLocationMarker, HiCalendar, HiCheckCircle } from 'react-icons/hi';
import { FiArrowLeft } from 'react-icons/fi';
import { Spinner } from 'flowbite-react';
import { GoogleMap, LoadScriptNext, MarkerF } from '@react-google-maps/api';
import OpenDeliveryMap from '@/components/OpenDeliveryMap';
import StatusBadge from '@/components/StatusBadge';
import api from '@/services/api';
import { TRACKING } from '@/services/endpoints';
import { formatDate } from '@/utils/formatDate';
import { isGoogleMapsFeatureEnabled, shouldAttemptGoogleMaps } from '@/utils/deliveryMapRuntime';

const STATUS_TIMELINE = [
  { key: 'pending', label: 'Order Placed' },
  { key: 'approved', label: 'Approved' },
  { key: 'delivering', label: 'Out for Delivery' },
  { key: 'delivered', label: 'Delivered' },
];

const statusIndex = (status) => {
  const idx = STATUS_TIMELINE.findIndex((step) => step.key === status);
  return idx === -1 ? 0 : idx;
};

export default function Tracking() {
  const { orderNumber: urlOrderNumber } = useParams();
  const mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const mapsFeatureEnabled = isGoogleMapsFeatureEnabled(import.meta.env.VITE_ENABLE_GOOGLE_MAPS);
  const mapsConfigured = mapsFeatureEnabled && shouldAttemptGoogleMaps(mapsApiKey);

  const [query, setQuery] = useState(urlOrderNumber || '');
  const [activeOrderNumber, setActiveOrderNumber] = useState((urlOrderNumber || '').trim().toUpperCase());
  const [trackingData, setTrackingData] = useState(null);
  const [latestPing, setLatestPing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mapLoadFailed, setMapLoadFailed] = useState(false);
  const intervalRef = useRef(null);

  const normalizePing = (ping) => {
    if (!ping) return null;
    const latitude = Number(ping.latitude ?? ping.lat);
    const longitude = Number(ping.longitude ?? ping.lng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return { ...ping, latitude, longitude };
  };

  const fetchTracking = useCallback(async (num) => {
    if (!num.trim()) return;
    const normalizedOrderNumber = num.trim().toUpperCase();
    setLoading(true);
    setError('');
    setTrackingData(null);
    try {
      const { data } = await api.get(TRACKING.PUBLIC(normalizedOrderNumber));
      const payload = data.data || {};
      setTrackingData(payload);
      setLatestPing(normalizePing(payload.gps));
      setActiveOrderNumber(normalizedOrderNumber);
    } catch (err) {
      setError(err?.response?.data?.message || 'Order not found. Please check your order number.');
      setLatestPing(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (urlOrderNumber) fetchTracking(urlOrderNumber);
  }, [urlOrderNumber, fetchTracking]);

  useEffect(() => {
    if (trackingData?.status === 'delivering' && activeOrderNumber) {
      const poll = async () => {
        try {
          const { data } = await api.get(TRACKING.PUBLIC(activeOrderNumber));
          const payload = data.data || {};
          setTrackingData(payload);
          setLatestPing(normalizePing(payload.gps));
        } catch {
          // Keep the current public tracking state when polling fails.
        }
      };
      poll();
      intervalRef.current = setInterval(poll, 30000);
    }
    return () => clearInterval(intervalRef.current);
  }, [trackingData?.status, activeOrderNumber]);

  useEffect(() => {
    setMapLoadFailed(false);
  }, [mapsApiKey]);

  const handleSearch = (event) => {
    event.preventDefault();
    fetchTracking(query);
  };

  const currentStep = trackingData ? statusIndex(trackingData.status) : -1;
  const mapCenter = latestPing && Number.isFinite(latestPing.latitude) && Number.isFinite(latestPing.longitude)
    ? { lat: latestPing.latitude, lng: latestPing.longitude }
    : { lat: 14.5995, lng: 120.9842 };
  const canRenderGoogleMap = mapsConfigured && Boolean(latestPing) && !mapLoadFailed;
  const canRenderOpenMap = Boolean(latestPing) && !canRenderGoogleMap;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="mb-1 text-2xl font-bold text-gray-900">Track Your Order</h1>
          <p className="text-sm text-gray-500">Enter your order number to check the delivery status</p>
        </div>

        <form onSubmit={handleSearch} className="mb-8 flex gap-2">
          <div className="relative flex-1">
            <HiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Enter order number (e.g. ORD-001234)"
              className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-9 pr-4 text-sm focus:border-amber-400 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="flex flex-shrink-0 items-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-amber-600 disabled:opacity-60"
          >
            {loading ? <Spinner size="sm" color="white" /> : <HiSearch className="h-4 w-4" />}
            Track
          </button>
        </form>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-12">
            <Spinner size="xl" color="warning" />
          </div>
        )}

        {trackingData && !loading && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <p className="mb-0.5 text-xs text-gray-500">Order Number</p>
                  <p className="font-mono font-bold text-gray-900">#{activeOrderNumber || query.trim().toUpperCase()}</p>
                </div>
                <StatusBadge status={trackingData.status} />
              </div>

              <div className="relative">
                <div className="absolute bottom-4 left-4 top-4 w-0.5 bg-gray-100" />
                <div className="space-y-4">
                  {STATUS_TIMELINE.map((step, index) => {
                    const isDone = index <= currentStep;
                    const isCurrent = index === currentStep;
                    return (
                      <div key={step.key} className="flex items-center gap-3 pl-2">
                        <div className={`relative z-10 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full transition-colors ${
                          isDone ? 'bg-emerald-500' : 'bg-gray-200'
                        }`}>
                          {isDone && <HiCheckCircle className="h-4 w-4 text-white" />}
                        </div>
                        <span className={`text-sm font-medium ${isCurrent ? 'text-amber-600' : isDone ? 'text-emerald-700' : 'text-gray-400'}`}>
                          {step.label}
                        </span>
                        {isCurrent && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-600">
                            Current
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                {
                  icon: HiTruck,
                  label: 'Courier',
                  value: trackingData.courier || 'Not assigned',
                  color: 'text-blue-500 bg-blue-50',
                },
                {
                  icon: HiCalendar,
                  label: 'Est. Delivery',
                  value: trackingData.eta ? formatDate(trackingData.eta) : 'TBD',
                  color: 'text-amber-500 bg-amber-50',
                },
                {
                  icon: HiLocationMarker,
                  label: 'Last Update',
                  value: latestPing?.pinged_at ? formatDate(latestPing.pinged_at, true) : 'N/A',
                  color: 'text-emerald-500 bg-emerald-50',
                },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl ${color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="text-sm font-semibold text-gray-900">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {trackingData.status === 'delivering' && (
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="flex items-center gap-2 border-b border-gray-100 p-4">
                  <HiLocationMarker className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-semibold text-gray-900">Live Tracking</span>
                  <span className="ml-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-600">
                    Live
                  </span>
                </div>
                <div className="flex items-center justify-center bg-gray-100" style={{ height: '280px' }}>
                  {latestPing ? (
                    canRenderGoogleMap ? (
                      <LoadScriptNext googleMapsApiKey={mapsApiKey} onError={() => setMapLoadFailed(true)}>
                        <GoogleMap
                          mapContainerStyle={{ width: '100%', height: '100%' }}
                          zoom={13}
                          center={mapCenter}
                          options={{
                            streetViewControl: false,
                            fullscreenControl: false,
                            mapTypeControl: false,
                          }}
                        >
                          <MarkerF position={mapCenter} />
                        </GoogleMap>
                      </LoadScriptNext>
                    ) : canRenderOpenMap ? (
                      <OpenDeliveryMap
                        center={mapCenter}
                        zoom={13}
                        markers={[
                          {
                            key: 'current',
                            position: mapCenter,
                            label: activeOrderNumber || 'Current location',
                            description: trackingData.courier || 'Courier location',
                            color: '#f97316',
                          },
                        ]}
                      />
                    ) : (
                      <div className="text-center">
                        <HiLocationMarker className="mx-auto mb-2 h-12 w-12 text-orange-400" />
                        <p className="text-sm font-medium text-gray-700">Rider is on the way</p>
                        <p className="mt-0.5 text-xs text-gray-400">
                          {mapsConfigured && !mapLoadFailed
                            ? 'Live map unavailable for this route.'
                            : mapsFeatureEnabled
                              ? 'Map key unavailable or invalid. Showing coordinates instead.'
                              : 'Google Maps is disabled here. Showing coordinates instead.'}
                        </p>
                        <p className="mt-1 font-mono text-xs text-gray-500">
                          {Number(latestPing.latitude).toFixed(4)}, {Number(latestPing.longitude).toFixed(4)}
                        </p>
                      </div>
                    )
                  ) : (
                    <div className="text-center text-gray-400">
                      <HiTruck className="mx-auto mb-2 h-12 w-12 opacity-30" />
                      <p className="text-sm">GPS data not available yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 text-center">
          <Link to="/shop" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600">
            <FiArrowLeft size={14} />
            Back to Shop
          </Link>
        </div>
      </div>
    </div>
  );
}
