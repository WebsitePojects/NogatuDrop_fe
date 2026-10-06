import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { HiSearch, HiTruck, HiLocationMarker, HiCalendar } from 'react-icons/hi';
import { FiArrowLeft } from 'react-icons/fi';
import { Spinner } from 'flowbite-react';
import DeliveryMap from '@/components/delivery/DeliveryMap';
import { VEHICLES } from '@/components/delivery/deliveryIcons';
import StatusBadge from '@/components/StatusBadge';
import OrderStatusTimeline from '@/components/OrderStatusTimeline';
import TrackingPaymentPanel from '@/components/TrackingPaymentPanel';
import api from '@/services/api';
import { TRACKING } from '@/services/endpoints';
import { formatDate } from '@/utils/formatDate';

export default function Tracking() {
  const { orderNumber: urlOrderNumber } = useParams();

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
      intervalRef.current = setInterval(poll, 20000);
    }
    return () => clearInterval(intervalRef.current);
  }, [trackingData?.status, activeOrderNumber]);

  const handleSearch = (event) => {
    event.preventDefault();
    fetchTracking(query);
  };

  // Compute map points from courier GPS and source warehouse origin
  const latestPingPoint = latestPing && Number.isFinite(latestPing.latitude) && Number.isFinite(latestPing.longitude)
    ? { lat: latestPing.latitude, lng: latestPing.longitude }
    : null;
  const sourceWarehouse = trackingData?.source_warehouse || null;
  const sourcePoint = sourceWarehouse && Number.isFinite(Number(sourceWarehouse.lat)) && Number.isFinite(Number(sourceWarehouse.lng))
    ? { lat: Number(sourceWarehouse.lat), lng: Number(sourceWarehouse.lng) }
    : null;


  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="mb-1 text-2xl font-bold text-gray-900">Track Your Order</h1>
          <p className="text-sm text-gray-500">Enter your order number to check the delivery status</p>
        </div>

        <form onSubmit={handleSearch} className="mb-8">
          <label htmlFor="trackingOrderNumber" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-700">
            Order Number
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <HiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="trackingOrderNumber"
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Enter order number (e.g. ORD-001234)"
                className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-9 pr-4 text-sm text-gray-900 placeholder-gray-300 focus:border-amber-400 focus:outline-none"
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
          </div>
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

              <OrderStatusTimeline status={trackingData.status} paymentStatus={trackingData.payment_status} />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                {
                  icon: HiTruck,
                  label: 'Delivered by',
                  value: trackingData.courier
                    || (trackingData.vehicle_type ? `Nogatu rider · ${VEHICLES[trackingData.vehicle_type]?.label || ''}` : 'Not assigned yet'),
                  color: 'text-blue-500 bg-blue-50',
                },
                {
                  icon: HiCalendar,
                  label: 'Arrives',
                  value: trackingData.eta_window
                    ? `in ${trackingData.eta_window.min_minutes}–${trackingData.eta_window.max_minutes} min`
                    : trackingData.eta ? formatDate(trackingData.eta) : 'Once the rider is on the way',
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

            {trackingData.payment_due && (
              <TrackingPaymentPanel
                orderNumber={activeOrderNumber}
                proofUploadedAt={trackingData.payment_proof_uploaded_at}
                onProofUploaded={() => setTrackingData((current) => (current
                  ? { ...current, payment_proof_uploaded_at: new Date().toISOString() }
                  : current))}
              />
            )}

            {trackingData.status === 'delivering' && (sourcePoint || latestPingPoint) && (
              // Public page: the rider and the center only. The line to the buyer's door is never drawn
              // here, because anyone with the order number can open this page.
              <DeliveryMap
                route={{
                  order_number: activeOrderNumber,
                  order_status: 'delivering',
                  vehicle_type: trackingData.vehicle_type || 'motorcycle',
                  source: sourcePoint ? { ...sourcePoint, name: sourceWarehouse?.name } : null,
                  rider: latestPingPoint,
                  rider_pinged_at: latestPing?.pinged_at || null,
                  eta: trackingData.eta_window || null,
                }}
                height={300}
                riderLabel={`Your rider${trackingData.vehicle_type ? ` · ${VEHICLES[trackingData.vehicle_type]?.label || ''}` : ''}`}
              />
            )}
          </div>
        )}

        <div className="mt-8 flex items-center justify-center gap-5 text-center">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-600">
            <FiArrowLeft size={14} />
            Back to Home
          </Link>
          <Link to="/shop" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-600">
            Back to Shop
          </Link>
        </div>
      </div>
    </div>
  );
}
