import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { FiArrowLeft, FiTruck, FiUser, FiCalendar, FiMapPin } from 'react-icons/fi';
import api from '@/services/api';
import { TRACKING } from '@/services/endpoints';
import { formatDate } from '@/utils/formatDate';
import Badge from '@/components/Badge';
import { STATUS_BADGE } from '@/utils/constants';

const mapContainerStyle = {
  width: '100%',
  height: '400px',
};

const defaultCenter = { lat: 14.5995, lng: 120.9842 };

const Tracking = () => {
  const { orderId } = useParams();
  const [trackingData, setTrackingData] = useState(null);
  const [gpsPings, setGpsPings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  });

  const fetchTracking = useCallback(async () => {
    try {
      const { data } = await api.get(TRACKING.BY_ORDER(orderId));
      setTrackingData(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load tracking data');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  const fetchGps = useCallback(async () => {
    try {
      // GPS pings via tracking endpoint
      const { data } = await api.get(`/tracking/${orderId}/pings`);
      setGpsPings(data.data || []);
    } catch {
      // silently fail
    }
  }, [orderId]);

  useEffect(() => {
    fetchTracking();
    fetchGps();
    intervalRef.current = setInterval(fetchGps, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchTracking, fetchGps]);

  const latestPing = gpsPings.length > 0 ? gpsPings[gpsPings.length - 1] : null;
  const center = latestPing
    ? { lat: Number(latestPing.latitude), lng: Number(latestPing.longitude) }
    : defaultCenter;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: '#F0FFF0' }}>
        <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6" style={{ background: '#F0FFF0' }}>
        <p className="text-red-500 mb-4">{error}</p>
        <Link to="/" className="text-green-700 hover:underline">
          Go back
        </Link>
      </div>
    );
  }

  const statusBadge = STATUS_BADGE[trackingData?.status] || STATUS_BADGE.pending;

  return (
    <div className="min-h-screen" style={{ background: '#F0FFF0' }}>
      <div className="max-w-4xl mx-auto p-6">
        <Link
          to="/"
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <FiArrowLeft /> Back
        </Link>

        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Tracking</h1>
          <p className="text-sm text-gray-500 mt-1">Track Monitoring</p>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <FiTruck className="text-2xl text-green-700" />
            <div>
              <p className="text-xs text-gray-500">Status</p>
              <Badge {...statusBadge} />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <FiUser className="text-2xl text-green-700" />
            <div>
              <p className="text-xs text-gray-500">Rider</p>
              <p className="text-sm font-semibold text-gray-800">
                {trackingData?.rider_name || 'Not assigned'}
              </p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <FiCalendar className="text-2xl text-green-700" />
            <div>
              <p className="text-xs text-gray-500">Est. Delivery</p>
              <p className="text-sm font-semibold text-gray-800">
                {formatDate(trackingData?.estimated_delivery)}
              </p>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {isLoaded && import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={center}
              zoom={11}
            >
              {latestPing && (
                <Marker position={center} title="Rider Location" />
              )}
              {/* Default pin at Metro Manila if no GPS data */}
              {!latestPing && (
                <Marker position={defaultCenter} title="Metro Manila" />
              )}
            </GoogleMap>
          ) : (
            /* Fallback map placeholder matching the reference screenshot style */
            <div
              className="relative flex items-center justify-center"
              style={{ height: '400px', background: '#e8ecf0' }}
            >
              {/* Simulated map grid */}
              <div className="absolute inset-0 opacity-30">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={`h${i}`}
                    className="absolute w-full border-t border-gray-400"
                    style={{ top: `${i * 10}%` }}
                  />
                ))}
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={`v${i}`}
                    className="absolute h-full border-l border-gray-400"
                    style={{ left: `${i * 10}%` }}
                  />
                ))}
              </div>

              {/* Location labels */}
              <div className="absolute inset-0 pointer-events-none">
                {[
                  { label: 'Quezon City', top: '28%', left: '40%' },
                  { label: 'Manila', top: '52%', left: '32%' },
                  { label: 'Makati', top: '60%', left: '42%' },
                  { label: 'Pasig', top: '55%', left: '58%' },
                  { label: 'Antipolo', top: '44%', left: '65%' },
                  { label: 'Valenzuela', top: '22%', left: '28%' },
                  { label: 'Caloocan', top: '32%', left: '30%' },
                  { label: 'Taguig', top: '68%', left: '48%' },
                  { label: 'Taytay', top: '58%', left: '72%' },
                  { label: 'San Jose del\nMonte City', top: '12%', left: '45%' },
                  { label: 'Bulacan', top: '5%', left: '25%' },
                  { label: 'Rodriguez', top: '28%', left: '70%' },
                  { label: 'Pandi', top: '4%', left: '12%' },
                  { label: 'Norzagaray', top: '4%', left: '65%' },
                  { label: 'Santa Maria', top: '10%', left: '35%' },
                ].map(({ label, top, left }) => (
                  <span
                    key={label}
                    className="absolute text-[10px] text-gray-600 font-medium whitespace-pre-line"
                    style={{ top, left }}
                  >
                    {label}
                  </span>
                ))}
              </div>

              {/* Center pin */}
              <div className="relative z-10 flex flex-col items-center">
                <div
                  className="w-8 h-8 rounded-full border-4 border-white flex items-center justify-center shadow-lg"
                  style={{ background: '#FF8C00' }}
                >
                  <span className="text-white text-xs font-bold">1</span>
                </div>
              </div>

              {/* Google Maps watermark style */}
              <div className="absolute bottom-2 right-2 text-[9px] text-gray-500">
                Map data ©2025
              </div>
              <div className="absolute bottom-2 left-2">
                <div className="px-2 py-0.5 bg-white rounded shadow text-[10px] font-medium text-gray-600">
                  Google
                </div>
              </div>
            </div>
          )}
        </div>

        {/* GPS History */}
        {gpsPings.length > 0 && (
          <div className="mt-5 bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">GPS History</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {[...gpsPings].reverse().map((ping, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg text-sm"
                >
                  <FiMapPin className="text-green-700 flex-shrink-0" />
                  <span className="text-gray-600">
                    {Number(ping.latitude).toFixed(6)}, {Number(ping.longitude).toFixed(6)}
                  </span>
                  <span className="text-xs text-gray-400 ml-auto">
                    {formatDate(ping.pinged_at, true)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tracking;
