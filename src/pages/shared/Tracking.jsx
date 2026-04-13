import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { HiSearch, HiTruck, HiLocationMarker, HiCalendar, HiCheckCircle } from 'react-icons/hi';
import { FiArrowLeft } from 'react-icons/fi';
import { Spinner } from 'flowbite-react';
import { GoogleMap, MarkerF, useJsApiLoader } from '@react-google-maps/api';
import StatusBadge from '@/components/StatusBadge';
import api from '@/services/api';
import { TRACKING } from '@/services/endpoints';
import { formatDate } from '@/utils/formatDate';

const STATUS_TIMELINE = [
  { key: 'pending', label: 'Order Placed' },
  { key: 'approved', label: 'Approved' },
  { key: 'delivering', label: 'Out for Delivery' },
  { key: 'delivered', label: 'Delivered' },
];

const statusIndex = (status) => {
  const idx = STATUS_TIMELINE.findIndex(s => s.key === status);
  return idx === -1 ? 0 : idx;
};

export default function Tracking() {
  const { orderNumber: urlOrderNumber } = useParams();
  const mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const { isLoaded: mapReady } = useJsApiLoader({
    id: 'nogatu-live-tracking-map',
    googleMapsApiKey: mapsApiKey,
  });

  const [query, setQuery] = useState(urlOrderNumber || '');
  const [activeOrderNumber, setActiveOrderNumber] = useState((urlOrderNumber || '').trim().toUpperCase());
  const [trackingData, setTrackingData] = useState(null);
  const [latestPing, setLatestPing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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

  // Auto-fetch if orderNumber in URL
  useEffect(() => {
    if (urlOrderNumber) fetchTracking(urlOrderNumber);
  }, [urlOrderNumber, fetchTracking]);

  // Poll latest public tracking state if delivering
  useEffect(() => {
    if (trackingData?.status === 'delivering' && activeOrderNumber) {
      const poll = async () => {
        try {
          const { data } = await api.get(TRACKING.PUBLIC(activeOrderNumber));
          const payload = data.data || {};
          setTrackingData(payload);
          setLatestPing(normalizePing(payload.gps));
        } catch { /* silent */ }
      };
      poll();
      intervalRef.current = setInterval(poll, 30000);
    }
    return () => clearInterval(intervalRef.current);
  }, [trackingData?.status, activeOrderNumber]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchTracking(query);
  };

  const currentStep = trackingData ? statusIndex(trackingData.status) : -1;
  const mapCenter = latestPing && Number.isFinite(latestPing.latitude) && Number.isFinite(latestPing.longitude)
    ? { lat: latestPing.latitude, lng: latestPing.longitude }
    : { lat: 14.5995, lng: 120.9842 };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Track Your Order</h1>
          <p className="text-sm text-gray-500">Enter your order number to check the delivery status</p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-8">
          <div className="relative flex-1">
            <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Enter order number (e.g. ORD-001234)"
              className="w-full pl-9 pr-4 py-3 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-amber-400"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-5 py-3 bg-amber-500 text-white rounded-xl font-semibold text-sm hover:bg-amber-600 transition-colors disabled:opacity-60 flex items-center gap-2 flex-shrink-0"
          >
            {loading ? <Spinner size="sm" color="white" /> : <HiSearch className="w-4 h-4" />}
            Track
          </button>
        </form>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-4 text-sm mb-6">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <Spinner size="xl" color="warning" />
          </div>
        )}

        {/* Tracking Result */}
        {trackingData && !loading && (
          <div className="space-y-4">
            {/* Status card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Order Number</p>
                  <p className="font-mono font-bold text-gray-900">#{activeOrderNumber || query.trim().toUpperCase()}</p>
                </div>
                <StatusBadge status={trackingData.status} />
              </div>

              {/* Timeline */}
              <div className="relative">
                <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-gray-100" />
                <div className="space-y-4">
                  {STATUS_TIMELINE.map((s, i) => {
                    const isDone = i <= currentStep;
                    const isCurrent = i === currentStep;
                    return (
                      <div key={s.key} className="flex items-center gap-3 pl-2">
                        <div className={`relative z-10 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                          isDone ? 'bg-emerald-500' : 'bg-gray-200'
                        }`}>
                          {isDone && <HiCheckCircle className="w-4 h-4 text-white" />}
                        </div>
                        <span className={`text-sm font-medium ${isCurrent ? 'text-amber-600' : isDone ? 'text-emerald-700' : 'text-gray-400'}`}>
                          {s.label}
                        </span>
                        {isCurrent && (
                          <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-medium">
                            Current
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Info cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                  value: trackingData.eta
                    ? formatDate(trackingData.eta)
                    : 'TBD',
                  color: 'text-amber-500 bg-amber-50',
                },
                {
                  icon: HiLocationMarker,
                  label: 'Last Update',
                  value: latestPing?.pinged_at
                    ? formatDate(latestPing.pinged_at, true)
                    : 'N/A',
                  color: 'text-emerald-500 bg-emerald-50',
                },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="text-sm font-semibold text-gray-900">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* GPS Map placeholder (shown when delivering) */}
            {trackingData.status === 'delivering' && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                  <HiLocationMarker className="text-orange-500 w-4 h-4" />
                  <span className="text-sm font-semibold text-gray-900">Live Tracking</span>
                  <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-medium ml-1">
                    Live
                  </span>
                </div>
                <div
                  className="flex items-center justify-center bg-gray-100"
                  style={{ height: '280px' }}
                >
                  {latestPing ? (
                    mapReady && mapsApiKey ? (
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
                    ) : (
                      <div className="text-center">
                        <HiLocationMarker className="w-12 h-12 text-orange-400 mx-auto mb-2" />
                        <p className="text-sm font-medium text-gray-700">Rider is on the way</p>
                        <p className="text-xs text-gray-400 mt-0.5 font-mono">
                          {Number(latestPing.latitude).toFixed(4)}, {Number(latestPing.longitude).toFixed(4)}
                        </p>
                      </div>
                    )
                  ) : (
                    <div className="text-center text-gray-400">
                      <HiTruck className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">GPS data not available yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Back link */}
        <div className="text-center mt-8">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600">
            <FiArrowLeft size={14} />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
