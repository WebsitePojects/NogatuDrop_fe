import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  HiLocationMarker, HiPhone, HiCheckCircle, HiCamera, HiExclamationCircle,
} from 'react-icons/hi';
import { FiPackage } from 'react-icons/fi';
import { Spinner } from 'flowbite-react';
import api from '@/services/api';
import { DELIVERY_TOKENS } from '@/services/endpoints';
import { formatCurrency } from '@/utils/formatCurrency';

const BRAND_LOGO = '/assets/dropshipping_nogatu_logo.png';

export default function Deliver() {
  const { token } = useParams();

  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [recipientName, setRecipientName] = useState('');
  const [gpsCoords, setGpsCoords] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    api.get(DELIVERY_TOKENS.INFO(token))
      .then(res => setInfo(res.data.data))
      .catch(err => setError(err?.response?.data?.message || 'This delivery link is invalid or has expired.'))
      .finally(() => setLoading(false));
  }, [token]);

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
      (pos) => {
        setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
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
    setSubmitting(true);
    const formData = new FormData();
    formData.append('photo', photo);
    if (recipientName.trim()) formData.append('recipient_name', recipientName.trim());
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spinner size="xl" color="warning" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-sm w-full text-center">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <HiExclamationCircle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Link Unavailable</h2>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <HiCheckCircle className="w-9 h-9 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Delivery Confirmed!</h2>
          <p className="text-gray-500 text-sm">
            The delivery has been recorded successfully. The stockist has been notified.
          </p>
          <p className="text-xs text-gray-400 mt-4">You may close this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-sm mx-auto">
        {/* Logo */}
        <div className="text-center mb-6">
          <img src={BRAND_LOGO} alt="Nogatu" className="w-12 h-12 rounded-2xl mx-auto mb-3 shadow-sm" />
          <h1 className="text-xl font-bold text-gray-900">Delivery Confirmation</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Order #{info?.order_number || '—'}
          </p>
        </div>

        {/* Delivery Info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4 space-y-4">
          {/* Deliver to */}
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <HiLocationMarker className="w-4 h-4 text-orange-500" />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Deliver to</p>
              <p className="font-semibold text-gray-900 text-sm">{info?.customer_name}</p>
              <p className="text-sm text-gray-600 mt-0.5">{info?.customer_address}</p>
            </div>
          </div>

          {info?.customer_phone && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <HiPhone className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Contact</p>
                <a
                  href={`tel:${info.customer_phone}`}
                  className="text-sm font-medium text-blue-600"
                >
                  {info.customer_phone}
                </a>
              </div>
            </div>
          )}

          {/* Items */}
          {info?.items && info.items.length > 0 && (
            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium mb-2">
                <FiPackage size={13} />
                ITEMS
              </div>
              <div className="space-y-1">
                {info.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-700">{item.product_name} × {item.quantity}</span>
                    <span className="text-gray-500">
                      {formatCurrency((item.unit_price || 0) * (item.quantity || 1))}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between font-bold text-sm mt-2 pt-2 border-t border-gray-100">
                  <span>Total</span>
                  <span className="text-orange-500">{formatCurrency(info.total_amount)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Confirm Delivery */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="font-semibold text-gray-900 text-sm">Confirm Delivery</h3>

          {/* Photo upload */}
          <div>
            <label className={`flex flex-col items-center justify-center w-full border-2 border-dashed rounded-xl cursor-pointer transition-colors p-4 ${
              photoPreview ? 'border-emerald-400' : 'border-gray-200 hover:border-orange-400'
            }`}>
              {photoPreview ? (
                <img src={photoPreview} alt="POD" className="w-full h-40 object-cover rounded-xl" />
              ) : (
                <>
                  <HiCamera className="w-8 h-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 font-medium">Take Delivery Photo</p>
                  <p className="text-xs text-gray-400 mt-0.5">Tap to capture with camera</p>
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
                className="text-xs text-red-400 hover:text-red-600 mt-1"
              >
                Remove photo
              </button>
            )}
          </div>

          {/* Recipient name */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Recipient Name (optional)
            </label>
            <input
              type="text"
              value={recipientName}
              onChange={e => setRecipientName(e.target.value)}
              placeholder="Name of person who received the package"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-orange-400"
            />
          </div>

          {/* GPS */}
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
                  Getting location…
                </>
              ) : gpsCoords ? (
                <>
                  <HiCheckCircle className="w-4 h-4 text-emerald-500" />
                  <span className="text-emerald-600">
                    Location captured ({gpsCoords.lat.toFixed(4)}, {gpsCoords.lng.toFixed(4)})
                  </span>
                </>
              ) : (
                <>
                  <HiLocationMarker className="w-4 h-4" />
                  Capture GPS Location (optional)
                </>
              )}
            </button>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting || !photo}
            className="w-full py-3.5 bg-emerald-500 text-white rounded-xl font-semibold text-sm hover:bg-emerald-600 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Spinner size="sm" color="white" />
                Confirming…
              </>
            ) : (
              <>
                <HiCheckCircle className="w-5 h-5" />
                Confirm Delivery
              </>
            )}
          </button>

          {submitError && (
            <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 rounded-xl p-2.5">
              <HiExclamationCircle className="w-4 h-4 flex-shrink-0" />
              {submitError}
            </div>
          )}
          {!photo && !submitError && (
            <p className="text-xs text-center text-amber-600">
              A delivery photo is required to confirm delivery.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
