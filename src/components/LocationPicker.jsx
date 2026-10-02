import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { FiCrosshair, FiMapPin, FiAlertTriangle } from 'react-icons/fi';
import { hasLocationConsent } from '@/components/CookieConsent';

// Geographic centre of the Philippines — default view before a pin is set.
const PH_CENTER = { lat: 12.8797, lng: 121.774 };
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const NOMINATIM = 'https://nominatim.openstreetmap.org';
const PH_BOUNDS = { latMin: 4.2, latMax: 21.5, lngMin: 116.0, lngMax: 127.0 };
const isInPH = (lat, lng) => lat >= PH_BOUNDS.latMin && lat <= PH_BOUNDS.latMax && lng >= PH_BOUNDS.lngMin && lng <= PH_BOUNDS.lngMax;
const hasPoint = (value) => !!value && Number.isFinite(value.lat) && Number.isFinite(value.lng);

// A real map pin (brand espresso with a white dot) instead of a dot that disappears into the tiles.
const PIN_ICON = L.divIcon({
  className: 'nogatu-map-pin',
  html: `<svg width="40" height="52" viewBox="0 0 40 52" aria-hidden="true">
    <ellipse cx="20" cy="49" rx="7" ry="2.5" fill="rgba(0,0,0,0.28)"/>
    <path d="M20 2C10.6 2 3 9.6 3 19c0 12.4 15 28.2 15.7 28.9a1.8 1.8 0 0 0 2.6 0C22 47.2 37 31.4 37 19 37 9.6 29.4 2 20 2z" fill="#3d1800" stroke="#fff" stroke-width="2.5"/>
    <circle cx="20" cy="19" r="6.5" fill="#d4b483" stroke="#fff" stroke-width="2"/>
  </svg>`,
  iconSize: [40, 52],
  iconAnchor: [20, 49],
});

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
    if (hasPoint(value)) map.setView([value.lat, value.lng], Math.max(map.getZoom(), 16));
  }, [value, map]);
  return null;
}

/** First hit for the most precise query that OpenStreetMap knows, or null. */
async function geocodeFirst(queries, signal) {
  for (const query of queries) {
    const url = `${NOMINATIM}/search?format=jsonv2&countrycodes=ph&limit=1&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { signal, headers: { 'Accept-Language': 'en' } });
    const hits = res.ok ? await res.json() : [];
    if (hits[0]) return { lat: Number(hits[0].lat), lng: Number(hits[0].lon) };
  }
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
 *
 * `searchQueries` (from utils/publicCustomer geocodeQueries) moves the pin to the buyer's chosen
 * barangay; the buyer then drags it to the exact gate. It changes once per picker choice, never per
 * keystroke, which keeps OpenStreetMap Nominatim's no-autocomplete rule.
 */
export default function LocationPicker({ value, onChange, searchQueries = [] }) {
  const [locating, setLocating] = useState(false);
  const [finding, setFinding] = useState(false);
  const [error, setError] = useState('');
  const [consent, setConsent] = useState(() => hasLocationConsent());
  // 'area' while the pin sits on the barangay centre, 'exact' once the buyer placed it themselves.
  const [precision, setPrecision] = useState(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    setConsent(hasLocationConsent());
  }, []);

  const queryKey = searchQueries.join('|');
  useEffect(() => {
    if (!queryKey) return undefined;
    const controller = new AbortController();
    // Short pause so stepping through the pickers quickly sends only the last choice.
    const timer = setTimeout(() => {
      setFinding(true);
      geocodeFirst(queryKey.split('|'), controller.signal)
        .then((point) => {
          if (point) {
            onChangeRef.current(point);
            setPrecision('area');
          }
        })
        .catch(() => { /* the buyer can still tap the map */ })
        .finally(() => { if (!controller.signal.aborted) setFinding(false); });
    }, 500);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [queryKey]);

  // Reverse-geocode the pin to a readable place name (free OSM Nominatim) so the
  // buyer sees a place, not raw coordinates. Flag pins outside the Philippines.
  const [place, setPlace] = useState('');
  const outsidePH = hasPoint(value) && !isInPH(value.lat, value.lng);
  useEffect(() => {
    if (!hasPoint(value)) { setPlace(''); return undefined; }
    const controller = new AbortController();
    fetch(`${NOMINATIM}/reverse?lat=${value.lat}&lon=${value.lng}&format=json&zoom=17`, { signal: controller.signal, headers: { 'Accept-Language': 'en' } })
      .then((r) => r.json())
      .then((j) => setPlace(j.display_name || ''))
      .catch(() => { if (!controller.signal.aborted) setPlace(''); });
    return () => controller.abort();
  }, [value?.lat, value?.lng]);

  const setExact = (point) => {
    onChange(point);
    setPrecision('exact');
  };

  const useLiveLocation = () => {
    if (!navigator.geolocation) {
      setError('Your browser does not support location. Please pin it on the map or type your address.');
      return;
    }
    setLocating(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setExact({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocating(false);
        setError('We could not get your location. Tap the map to drop a pin instead.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
    );
  };

  const center = hasPoint(value) ? value : PH_CENTER;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="block text-xs font-bold uppercase tracking-wider text-gray-700">
          Pin your gate (optional)
        </span>
        <button
          type="button"
          onClick={useLiveLocation}
          disabled={locating}
          className="inline-flex min-h-[2.5rem] items-center gap-1.5 rounded-full bg-amber-50 px-3 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 disabled:opacity-60 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50"
        >
          <FiCrosshair className="h-3.5 w-3.5" />
          {locating ? 'Locating…' : 'Use my live location'}
        </button>
      </div>

      {!consent && (
        <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
          Accept location use in the privacy banner to auto-detect your spot. You can still tap the map to pin it manually.
        </p>
      )}

      <div className="relative h-64 w-full overflow-hidden rounded-xl border border-gray-200 sm:h-72 dark:border-[var(--dark-border)]">
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={hasPoint(value) ? 16 : 6}
          scrollWheelZoom={false}
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer attribution={TILE_ATTR} url={TILE_URL} />
          <ClickToSet onPick={setExact} />
          <Recenter value={value} />
          {hasPoint(value) && (
            <Marker
              position={[value.lat, value.lng]}
              icon={PIN_ICON}
              draggable
              keyboard={false}
              eventHandlers={{ dragend: (e) => { const p = e.target.getLatLng(); setExact({ lat: p.lat, lng: p.lng }); } }}
            />
          )}
        </MapContainer>
        {finding && (
          <span className="pointer-events-none absolute left-3 top-3 z-[500] rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold text-gray-800 shadow">
            Finding your barangay…
          </span>
        )}
      </div>

      <div className="mt-2 flex items-start gap-2 text-[12px] text-gray-700 dark:text-[var(--dark-muted)]">
        <FiMapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
        {hasPoint(value) ? (
          <span>
            {precision === 'area' ? 'Pin dropped on your barangay. Drag it to your exact gate. ' : ''}
            {place || `Pinned at ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`}
          </span>
        ) : (
          <span>Choose your barangay above and the pin drops there. You can also tap the map or use your live location.</span>
        )}
      </div>
      {outsidePH && (
        <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-red-600 dark:text-red-400">
          <FiAlertTriangle className="h-3.5 w-3.5" />
          We only deliver within the Philippines. Tap inside the country to adjust your pin.
        </p>
      )}
      {error && <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
