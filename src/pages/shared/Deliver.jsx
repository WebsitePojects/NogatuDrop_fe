import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  HiLocationMarker, HiPhone, HiCheckCircle, HiCamera, HiExclamationCircle, HiPencilAlt, HiX,
} from 'react-icons/hi';
import { FiPackage } from 'react-icons/fi';
import { Spinner } from 'flowbite-react';
import DeliveryMap from '@/components/delivery/DeliveryMap';
import api from '@/services/api';
import { DELIVERY_TOKENS, TRACKING } from '@/services/endpoints';

const BRAND_LOGO = '/assets/dropshipping_nogatu_logo.png';

// How often the rider's phone reports its position. The server keeps at most one point per 10 s.
const PING_EVERY_MS = 15000;
// The road route and arrival window are refreshed from the server this often while delivering.
const ROUTE_REFRESH_MS = 60000;

export default function Deliver() {
  const { token } = useParams();
  const canvasRef = useRef(null);
  const signatureWrapperRef = useRef(null);
  const drawingRef = useRef(false);

  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [recipientName, setRecipientName] = useState('');
  const [gpsCoords, setGpsCoords] = useState(null);
  const [gpsError, setGpsError] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [signatureDirty, setSignatureDirty] = useState(false);

  const postPing = async (coords) => {
    try {
      await api.post(TRACKING.PING(token), {
        lat: coords.latitude,
        lng: coords.longitude,
        speed_kmh: coords.speed || null,
        accuracy_meters: coords.accuracy || null,
      });
    } catch {
      // Keep delivery flow uninterrupted if ping fails.
    }
  };

  const resizeSignatureCanvas = () => {
    const canvas = canvasRef.current;
    const wrapper = signatureWrapperRef.current;
    if (!canvas || !wrapper) return;

    const context = canvas.getContext('2d');
    const ratio = window.devicePixelRatio || 1;
    const width = wrapper.clientWidth;
    const height = 160;
    const existing = signatureDirty ? canvas.toDataURL('image/png') : null;

    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.lineWidth = 2;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = '#111827';
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);

    if (existing) {
      const image = new Image();
      image.onload = () => context.drawImage(image, 0, 0, width, height);
      image.src = existing;
    }
  };

  useEffect(() => {
    let active = true;
    let timer;
    const load = (first) => api.get(DELIVERY_TOKENS.INFO(token))
      .then((res) => { if (active) setInfo(res.data.data); })
      .catch((err) => { if (active && first) setError(err?.response?.data?.message || 'This Rider Link is invalid or has expired.'); })
      .finally(() => {
        if (!active) return;
        if (first) setLoading(false);
        timer = setTimeout(() => load(false), ROUTE_REFRESH_MS);
      });
    load(true);
    return () => { active = false; clearTimeout(timer); };
  }, [token]);

  useEffect(() => {
    if (success || !navigator.geolocation) return undefined;

    const sendPing = () => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGpsError('');
          await postPing(pos.coords);
        },
        (err) => setGpsError(err?.code === 1 ? 'Location is off — allow it so the customer can see you' : 'GPS signal weak'),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
      );
    };

    sendPing();
    const id = setInterval(sendPing, PING_EVERY_MS);
    return () => clearInterval(id);
  }, [success, token]);

  useEffect(() => {
    if (loading || error || success) return undefined;
    resizeSignatureCanvas();
    const onResize = () => resizeSignatureCanvas();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [loading, error, success, signatureDirty]);

  // The phone's own fix is fresher than the server's last ping, so the rider sees themselves move now.
  const riderRoute = info?.route ? {
    ...info.route,
    order_status: 'delivering',
    rider: gpsCoords || info.route.rider,
  } : null;
  const destinationPoint = info?.route?.destination || null;

  const getCanvasPoint = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const startSignature = (event) => {
    const point = getCanvasPoint(event);
    const canvas = canvasRef.current;
    if (!point || !canvas) return;

    const context = canvas.getContext('2d');
    drawingRef.current = true;
    context.beginPath();
    context.moveTo(point.x, point.y);
    event.preventDefault();
  };

  const drawSignature = (event) => {
    if (!drawingRef.current) return;
    const point = getCanvasPoint(event);
    const canvas = canvasRef.current;
    if (!point || !canvas) return;

    const context = canvas.getContext('2d');
    context.lineTo(point.x, point.y);
    context.stroke();
    setSignatureDirty(true);
    event.preventDefault();
  };

  const endSignature = () => {
    drawingRef.current = false;
  };

  const clearSignature = () => {
    setSignatureDirty(false);
    resizeSignatureCanvas();
  };

  const getSignatureData = () => {
    if (!canvasRef.current || !signatureDirty) return null;
    return canvasRef.current.toDataURL('image/png');
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleGetGPS = () => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        await postPing(pos.coords);
        setGpsLoading(false);
      },
      () => setGpsLoading(false),
      { timeout: 10000 }
    );
  };

  const handleSubmit = async () => {
    setSubmitError('');
    if (!photo) {
      setSubmitError('Please take a proof of delivery photo.');
      return;
    }
    if (!recipientName.trim()) {
      setSubmitError('Recipient name is required.');
      return;
    }
    if (!signatureDirty) {
      setSubmitError('Recipient signature is required.');
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append('photo', photo);
    formData.append('recipient_name', recipientName.trim());
    formData.append('recipient_signature', getSignatureData());
    if (gpsCoords) {
      formData.append('latitude', gpsCoords.lat);
      formData.append('longitude', gpsCoords.lng);
    }

    try {
      await api.post(DELIVERY_TOKENS.COMPLETE(token), formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess(true);
    } catch (err) {
      setSubmitError(err?.response?.data?.message || 'Failed to confirm delivery. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Spinner size="xl" color="warning" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
            <HiExclamationCircle className="h-8 w-8 text-red-400" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-900">Link Unavailable</h2>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <HiCheckCircle className="h-9 w-9 text-emerald-500" />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-gray-900">Delivery Confirmed!</h2>
          <p className="text-sm text-gray-500">
            The delivery has been recorded successfully. The stockist has been notified.
          </p>
          <p className="mt-4 text-xs text-gray-500">You may close this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-sm">
        <div className="mb-6 text-center">
          <img src={BRAND_LOGO} alt="Nogatu" className="mx-auto mb-3 h-12 w-12 rounded-2xl shadow-sm" />
          <h1 className="text-xl font-bold text-gray-900">Rider Delivery</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Order #{info?.order_number || '-'}
          </p>
        </div>

        <div className="mb-4 space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-orange-100">
              <HiLocationMarker className="h-4 w-4 text-orange-500" />
            </div>
            <div>
              <p className="mb-0.5 text-xs text-gray-500">Deliver to</p>
              <p className="text-sm font-semibold text-gray-900">{info?.customer_name}</p>
              <p className="mt-0.5 text-sm text-gray-600">{info?.customer_address}</p>
            </div>
          </div>

          {info?.customer_phone && (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50">
                <HiPhone className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="mb-0.5 text-xs text-gray-500">Contact</p>
                <a href={`tel:${info.customer_phone}`} className="text-sm font-medium text-blue-600">
                  {info.customer_phone}
                </a>
              </div>
            </div>
          )}

          {info?.items && info.items.length > 0 && (
            <div className="border-t border-gray-100 pt-4">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                <FiPackage size={13} />
                ITEMS
              </div>
              <div className="space-y-1">
                {/* Orders are paid before they ship, so the rider sees what to hand over, never prices. */}
                {info.items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-700">{item.product_name}</span>
                    <span className="font-semibold tabular-nums text-gray-900">{item.quantity} {Number(item.quantity) === 1 ? 'box' : 'boxes'}</span>
                  </div>
                ))}
                <div className="mt-2 flex justify-between border-t border-gray-100 pt-2 text-sm font-bold">
                  <span>Hand over</span>
                  <span className="tabular-nums">
                    {info.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)} boxes · Paid
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* The rider's map: road route from here to the door, their own vehicle, the arrival window,
            and one tap into Google Maps / Waze for turn-by-turn directions. */}
        {riderRoute && (riderRoute.source || riderRoute.destination) ? (
          <section className="space-y-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold text-gray-900">Route to the customer</h3>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${gpsCoords ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-900'}`}>
                {gpsCoords ? 'Sharing your location' : gpsError || 'Waiting for GPS…'}
              </span>
            </div>
            <DeliveryMap route={riderRoute} destinationKind="home" height={280} riderLabel="You" />
            {destinationPoint ? (
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${destinationPoint.lat},${destinationPoint.lng}&travelmode=driving`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-[#3d1800] px-3 text-sm font-semibold text-white active:scale-[0.97]"
                >
                  Start navigation
                </a>
                <a
                  href={`https://waze.com/ul?ll=${destinationPoint.lat},${destinationPoint.lng}&navigate=yes`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-gray-300 px-3 text-sm font-semibold text-gray-800 active:scale-[0.97]"
                >
                  Open in Waze
                </a>
              </div>
            ) : (
              <p className="px-1 text-xs text-gray-600">The customer did not drop a map pin. Use the address above.</p>
            )}
          </section>
        ) : null}

        <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900">Confirm Delivery</h3>

          <div>
            <label className={`flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 transition-colors ${
              photoPreview ? 'border-emerald-400' : 'border-gray-200 hover:border-orange-400'
            }`}>
              {photoPreview ? (
                <img src={photoPreview} alt="POD" className="h-40 w-full rounded-xl object-cover" />
              ) : (
                <>
                  <HiCamera className="mb-2 h-8 w-8 text-gray-400" />
                  <p className="text-sm font-medium text-gray-600">Take Delivery Photo</p>
                  <p className="mt-0.5 text-xs text-gray-500">Tap to capture with camera</p>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </label>
            {photoPreview && (
              <button
                onClick={() => { setPhoto(null); setPhotoPreview(null); }}
                className="mt-1 text-xs text-red-600 hover:text-red-700"
              >
                Remove photo
              </button>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700">
              Recipient Name
            </label>
            <input
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="Name of person who received the package"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-orange-400 focus:outline-none"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="block text-xs font-medium text-gray-700">Recipient Signature</label>
              <button
                type="button"
                onClick={clearSignature}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
              >
                <HiX className="h-3.5 w-3.5" />
                Clear
              </button>
            </div>
            <div
              ref={signatureWrapperRef}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white"
            >
              <canvas
                ref={canvasRef}
                className="block w-full touch-none"
                onPointerDown={startSignature}
                onPointerMove={drawSignature}
                onPointerUp={endSignature}
                onPointerLeave={endSignature}
              />
            </div>
            {!signatureDirty && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
                <HiPencilAlt className="h-3.5 w-3.5" />
                Sign with your finger or stylus.
              </div>
            )}
          </div>

          <div>
            <button
              type="button"
              onClick={handleGetGPS}
              disabled={gpsLoading || !!gpsCoords}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              {gpsLoading ? (
                <>
                  <Spinner size="xs" color="info" />
                  Getting location...
                </>
              ) : gpsCoords ? (
                <>
                  <HiCheckCircle className="h-4 w-4 text-emerald-500" />
                  <span className="text-emerald-600">
                    Location captured ({gpsCoords.lat.toFixed(4)}, {gpsCoords.lng.toFixed(4)})
                  </span>
                </>
              ) : (
                <>
                  <HiLocationMarker className="h-4 w-4" />
                  Capture GPS Location (optional)
                </>
              )}
            </button>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting || !photo || !signatureDirty}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 py-3.5 text-sm font-semibold text-white transition-all hover:bg-emerald-800 active:scale-95 disabled:bg-gray-200 disabled:text-gray-600 disabled:active:scale-100"
          >
            {submitting ? (
              <>
                <Spinner size="sm" color="white" />
                Confirming...
              </>
            ) : (
              <>
                <HiCheckCircle className="h-5 w-5" />
                Confirm Delivery
              </>
            )}
          </button>

          {submitError && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 p-2.5 text-xs text-red-600">
              <HiExclamationCircle className="h-4 w-4 flex-shrink-0" />
              {submitError}
            </div>
          )}
          {(!photo || !signatureDirty) && !submitError && (
            <p className="text-center text-xs text-amber-600">
              A delivery photo and recipient signature are required to confirm delivery.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
