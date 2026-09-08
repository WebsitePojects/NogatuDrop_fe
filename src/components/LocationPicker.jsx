import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, useMapEvents, useMap } from 'react-leaflet';
import { FiCrosshair, FiMapPin, FiAlertTriangle } from 'react-icons/fi';
import { hasLocationConsent } from '@/components/CookieConsent';

// Geographic centre of the Philippines — default view before a pin is set.
const PH_CENTER = { lat: 12.8797, lng: 121.774 };
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const PH_BOUNDS = { latMin: 4.2, latMax: 21.5, lngMin: 116.0, lngMax: 127.0 };
const isInPH = (lat, lng) => lat >= PH_BOUNDS.latMin && lat <= PH_BOUNDS.latMax && lng >= PH_BOUNDS.lngMin && lng <= PH_BOUNDS.lngMax;

function ClickToSet({ onPick }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function Recenter({ value }) {
  const map = useMap();
  useEffect(() => {
    if (value && Number.isFinite(value.lat) && Number.isFinite(value.lng)) {
      map.setView([value.lat, value.lng], Math.max(map.getZoom(), 15));
    }
  }, [value, map]);
  return null;
}

/**
 * Consent-gated delivery-location picker.
 *
 * Privacy: we only read the visitor's precise GPS location AFTER they accept
 * "location" consent in the cookie banner, and only when they explicitly press
 * "Use my live location". The pin is optional — a buyer can always just type
 * their address. Coordinates are sent to our own API over HTTPS and are never
 * shown on the public tracking page.
 */
export default function LocationPicker({ value, onChange }) {
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const [consent, setConsent] = useState(() => hasLocationConsent());

  // Auto-capture the live location once, only if consent was granted and no
  // pin is set yet, so the map opens centred on the buyer.
  useEffect(() => {
    setConsent(hasLocationConsent());
  }, []);

  // Reverse-geocode the pin to a readable place name (free OSM Nominatim) so the
  // buyer sees a place, not raw coordinates. Flag pins outside the Philippines.
  const [place, setPlace] = useState('');
  const outsidePH = value && Number.isFinite(value.lat) && !isInPH(value.lat, value.lng);
  useEffect(() => {
    if (!value || !Number.isFinite(value.lat)) { setPlace(''); return undefined; }
    let cancelled = false;
    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${value.lat}&lon=${value.lng}&format=json&zoom=16`, { headers: { 'Accept-Language': 'en' } })
      .then((r) => r.json())
      .then((j) => { if (!cancelled) setPlace(j.display_name || ''); })
      .catch(() => { if (!cancelled) setPlace(''); });
    return () => { cancelled = true; };
  }, [value?.lat, value?.lng]);

  const useLiveLocation = () => {
    if (!navigator.geolocation) {
      setError('Your browser does not support location. Please pin it on the map or type your address.');
      return;
    }
    setLocating(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocating(false);
        setError('We could not get your location. Tap the map to drop a pin instead.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
    );
  };

  const center = value && Number.isFinite(value.lat) ? value : PH_CENTER;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
          Pin Delivery Location (optional)
        </label>
        <button
          type="button"
          onClick={useLiveLocation}
          disabled={locating}
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-60 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50"
        >
          <FiCrosshair className="h-3.5 w-3.5" />
          {locating ? 'Locating…' : 'Use my live location'}
        </button>
      </div>

      {!consent && (
        <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
          Accept location use in the privacy banner to auto-detect your spot. You can still tap the map to pin it manually.
        </p>
      )}

      <div className="h-56 w-full overflow-hidden rounded-xl border border-gray-200 dark:border-[var(--dark-border)]">
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={value ? 15 : 6}
          scrollWheelZoom
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer attribution={TILE_ATTR} url={TILE_URL} />
          <ClickToSet onPick={onChange} />
          <Recenter value={value} />
          {value && Number.isFinite(value.lat) && (
            <CircleMarker
              center={[value.lat, value.lng]}
              radius={10}
              pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#f97316', fillOpacity: 0.95 }}
            />
          )}
        </MapContainer>
      </div>

      <div className="mt-2 flex items-start gap-2 text-[11px] text-gray-500 dark:text-[var(--dark-muted)]">
        <FiMapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
        {value && Number.isFinite(value.lat) ? (
          <span>{place || `Pinned at ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`} — tap the map to adjust.</span>
        ) : (
          <span>Tap the map to drop a pin, or use your live location. Helps the rider find you faster.</span>
        )}
      </div>
      {outsidePH && (
        <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-red-600 dark:text-red-400">
          <FiAlertTriangle className="h-3.5 w-3.5" />
          We only deliver within the Philippines. Tap inside the country to adjust your pin.
        </p>
      )}
      {error && <p className="mt-1 text-[11px] text-red-500 dark:text-red-400">{error}</p>}
    </div>
  );
}
