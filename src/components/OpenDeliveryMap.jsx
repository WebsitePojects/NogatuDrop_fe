import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip } from 'react-leaflet';

const DEFAULT_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const DEFAULT_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function normalizeTileAttribution(rawAttribution) {
  return String(rawAttribution || '').trim() || DEFAULT_ATTRIBUTION;
}

function normalizeTileUrl(rawTileUrl) {
  return String(rawTileUrl || '').trim() || DEFAULT_TILE_URL;
}

export default function OpenDeliveryMap({
  center,
  zoom = 13,
  markers = [],
  polyline = [],
  className = '',
}) {
  const tileUrl = normalizeTileUrl(import.meta.env.VITE_TILE_URL);
  const attribution = normalizeTileAttribution(import.meta.env.VITE_TILE_ATTRIBUTION);

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      scrollWheelZoom
      className={className}
      style={{ width: '100%', height: '100%' }}
    >
      <TileLayer
        attribution={attribution}
        url={tileUrl}
      />

      {polyline.length >= 2 && (
        <Polyline
          positions={polyline.map((point) => [point.lat, point.lng])}
          pathOptions={{ color: '#f97316', weight: 4, opacity: 0.85 }}
        />
      )}

      {markers.map((marker) => (
        <CircleMarker
          key={marker.key}
          center={[marker.position.lat, marker.position.lng]}
          radius={10}
          pathOptions={{
            color: marker.strokeColor || '#ffffff',
            weight: 2,
            fillColor: marker.color || '#f97316',
            fillOpacity: 0.92,
          }}
        >
          <Tooltip direction="top" offset={[0, -8]} opacity={1}>
            <div className="text-xs font-semibold">
              {marker.label}
            </div>
            {marker.description && (
              <div className="text-[11px] text-gray-600">
                {marker.description}
              </div>
            )}
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
