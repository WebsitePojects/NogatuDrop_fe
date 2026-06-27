import { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, useMapEvents, useMap } from 'react-leaflet';
import { FiMapPin, FiAlertTriangle } from 'react-icons/fi';

// Geographic centre + bounding box of the Philippines. Anything outside is flagged.
const PH_CENTER = { lat: 12.8797, lng: 121.774 };
const PH_BOUNDS = { latMin: 4.2, latMax: 21.5, lngMin: 116.0, lngMax: 127.0 };
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function isInPH(lat, lng) {
  return lat >= PH_BOUNDS.latMin && lat <= PH_BOUNDS.latMax && lng >= PH_BOUNDS.lngMin && lng <= PH_BOUNDS.lngMax;
}

function ClickToSet({ onPick }) {
  useMapEvents({ click(e) { onPick(e.latlng.lat, e.latlng.lng); } });
  return null;
}

function Recenter({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      map.setView([lat, lng], Math.max(map.getZoom(), 14));
    }
  }, [lat, lng, map]);
  return null;
}

/**
 * Generic map location picker (admin/internal use — not consent-gated).
 * Scroll/zoom the map and tap to drop a pin. Instead of just showing raw
 * coordinates, it reverse-geocodes (free OpenStreetMap Nominatim) and shows the
 * place name. Flags any pin outside the Philippines so warehouse/public
 * locations stay in-country.
 *
 * Props: lat, lng (current values, strings or numbers) and onChange({lat,lng}).
 */
export default function MapLocationPicker({ lat, lng, onChange, label = 'Pin Location on Map' }) {
  const numLat = Number(lat);
  const numLng = Number(lng);
  const hasPin = Number.isFinite(numLat) && Number.isFinite(numLng) && (numLat !== 0 || numLng !== 0);
  const outside = hasPin && !isInPH(numLat, numLng);

  const [place, setPlace] = useState('');
  const [loadingPlace, setLoadingPlace] = useState(false);

  const reverseGeocode = useCallback(async (la, ln) => {
    setLoadingPlace(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${la}&lon=${ln}&format=json&zoom=16&addressdetails=0`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const j = await res.json();
      setPlace(j.display_name || '');
    } catch {
      setPlace('');
    } finally {
      setLoadingPlace(false);
    }
  }, []);

  useEffect(() => {
    if (hasPin) reverseGeocode(numLat, numLng);
    else setPlace('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numLat, numLng]);

  const center = hasPin ? { lat: numLat, lng: numLng } : PH_CENTER;

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-[var(--dark-text)]">{label}</label>
      <div className="h-56 w-full overflow-hidden rounded-xl border border-gray-200 dark:border-[var(--dark-border)]">
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={hasPin ? 14 : 6}
          scrollWheelZoom
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer attribution={TILE_ATTR} url={TILE_URL} />
          <ClickToSet onPick={(la, ln) => onChange({ lat: la, lng: ln })} />
          <Recenter lat={numLat} lng={numLng} />
          {hasPin && (
            <CircleMarker
              center={[numLat, numLng]}
              radius={10}
              pathOptions={{ color: '#ffffff', weight: 2, fillColor: outside ? '#ef4444' : '#2563eb', fillOpacity: 0.95 }}
            />
          )}
        </MapContainer>
      </div>

      <div className="mt-2 flex items-start gap-1.5 text-xs text-gray-500 dark:text-[var(--dark-muted)]">
        <FiMapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
        {!hasPin && <span>Scroll/zoom the map and tap to set the location (Philippines only).</span>}
        {hasPin && loadingPlace && <span>Finding place name…</span>}
        {hasPin && !loadingPlace && (place ? <span>{place}</span> : <span>Pinned at {numLat.toFixed(5)}, {numLng.toFixed(5)} — tap to adjust.</span>)}
      </div>

      {outside && (
        <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-red-600">
          <FiAlertTriangle className="h-3.5 w-3.5" />
          This location is outside the Philippines. Tap inside the country to adjust it.
        </p>
      )}
    </div>
  );
}
