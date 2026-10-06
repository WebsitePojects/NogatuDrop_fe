import L from 'leaflet';

// Map artwork for deliveries, drawn for Nogatu (no icon font): side-view vehicles in a round badge,
// and teardrop pins with a glyph. Side views stay upright; the direction of travel is shown by a
// small arrow that turns around the badge, so a motorcycle never drives upside down on screen.

const INK = '#3d1800';      // Nogatu espresso
const AMBER = '#f59e0b';
const WINDOW = '#fde7c2';

export const VEHICLES = Object.freeze({
  motorcycle: {
    label: 'Motorcycle',
    // Delivery top box, rider, two wheels.
    svg: `<rect x="3" y="9" width="8.5" height="7" rx="1.6" fill="${AMBER}" stroke="${INK}" stroke-width="1.4"/>
      <circle cx="8" cy="23" r="4.6" fill="none" stroke="${INK}" stroke-width="2.4"/>
      <circle cx="25" cy="23" r="4.6" fill="none" stroke="${INK}" stroke-width="2.4"/>
      <path d="M8 23 L12.5 16.5 H19.5 L22.5 13 H25.5 L28 17 M22.5 13 L23.6 9.6 H27" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M12.5 16.5 L25 23" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>
      <circle cx="16.5" cy="8.6" r="2.3" fill="${INK}"/>
      <path d="M15 11 L13.6 16 H19 L18.2 11.6 Z" fill="${INK}"/>`,
  },
  car: {
    label: 'Car',
    svg: `<path d="M3 21.5 V17 L6.4 15.6 L9.8 10.5 H21.5 L25.6 15.4 H28.4 A2.2 2.2 0 0 1 30.6 17.6 V21.5 Z" fill="${INK}"/>
      <path d="M11 12.4 H15.4 V15.4 H8.9 Z M17.2 12.4 H20.7 L23.2 15.4 H17.2 Z" fill="${WINDOW}"/>
      <circle cx="9.5" cy="22.5" r="3.6" fill="${INK}" stroke="#fff" stroke-width="1.4"/>
      <circle cx="24.5" cy="22.5" r="3.6" fill="${INK}" stroke="#fff" stroke-width="1.4"/>`,
  },
  van: {
    label: 'Van',
    svg: `<path d="M2 22 V9.5 A2.4 2.4 0 0 1 4.4 7.1 H21 L27.5 13.6 H28.6 A2 2 0 0 1 30.6 15.6 V22 Z" fill="${INK}"/>
      <path d="M21 9.2 L25.6 13.6 H21 Z M4.8 9.6 H10.6 V13.6 H4.8 Z M12.4 9.6 H18.8 V13.6 H12.4 Z" fill="${WINDOW}"/>
      <rect x="2" y="16.4" width="28.6" height="1.6" fill="${AMBER}"/>
      <circle cx="8.5" cy="22.8" r="3.6" fill="${INK}" stroke="#fff" stroke-width="1.4"/>
      <circle cx="24.5" cy="22.8" r="3.6" fill="${INK}" stroke="#fff" stroke-width="1.4"/>`,
  },
  truck: {
    label: 'Truck',
    svg: `<rect x="1.5" y="6.5" width="18.5" height="14.5" rx="1.4" fill="${AMBER}" stroke="${INK}" stroke-width="1.6"/>
      <path d="M21 10.5 H26.2 L30.5 15.5 V21 H21 Z" fill="${INK}"/>
      <path d="M22.6 12.2 H25.4 L28.2 15.4 H22.6 Z" fill="${WINDOW}"/>
      <circle cx="7.5" cy="22.8" r="3.5" fill="${INK}" stroke="#fff" stroke-width="1.4"/>
      <circle cx="25.2" cy="22.8" r="3.5" fill="${INK}" stroke="#fff" stroke-width="1.4"/>`,
  },
});

export const VEHICLE_ORDER = ['motorcycle', 'car', 'van', 'truck'];

/** Inline SVG markup (32x32 viewBox) for a vehicle, for buttons and legends. */
export function vehicleSvg(type, size = 32) {
  const v = VEHICLES[type] || VEHICLES.motorcycle;
  return `<svg width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true">${v.svg}</svg>`;
}

/**
 * The rider's map marker. `heading` is degrees clockwise from north (null = unknown, arrow hidden).
 * `live` adds the pulse ring; it is off when the last ping is stale.
 */
export function vehicleMarkerIcon(type, { heading = null, live = true } = {}) {
  const arrow = heading == null ? '' : `<span class="ncdms-vehicle-heading" style="transform: rotate(${Math.round(heading)}deg)"></span>`;
  return L.divIcon({
    className: 'ncdms-vehicle-marker',
    html: `<span class="ncdms-vehicle-badge${live ? ' is-live' : ''}">${arrow}${vehicleSvg(type, 30)}</span>`,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -22],
  });
}

const PIN_GLYPH = {
  // Warehouse / fulfillment center: building with a roll-up door.
  center: '<path d="M11 21 V14.5 L18 10 L25 14.5 V21 Z" fill="#fff"/><rect x="14.5" y="16.5" width="7" height="4.5" fill="#3d1800"/><path d="M14.5 18 H21.5 M14.5 19.5 H21.5" stroke="#fff" stroke-width="0.8"/>',
  // Stockist: shop with an awning.
  stockist: '<path d="M11 13.5 H25 L24 11 H12 Z" fill="#fff"/><rect x="12" y="13.5" width="12" height="7.5" fill="#fff"/><rect x="16.3" y="16" width="3.4" height="5" fill="#14532d"/>',
  // Buyer: house.
  home: '<path d="M10.5 17 L18 10.5 L25.5 17" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"/><path d="M12.5 16 V22 H23.5 V16" fill="#fff"/><rect x="16.4" y="18" width="3.2" height="4" fill="#9a3412"/>',
};
const PIN_FILL = { center: INK, stockist: '#14532d', home: '#9a3412' };

/** Teardrop pin with a glyph: 'center' (warehouse), 'stockist' (shop) or 'home' (buyer). */
export function pinIcon(kind) {
  const fill = PIN_FILL[kind] || INK;
  return L.divIcon({
    className: 'ncdms-map-pin',
    html: `<svg width="36" height="47" viewBox="0 0 36 47" aria-hidden="true">
      <ellipse cx="18" cy="44.5" rx="6.5" ry="2.2" fill="rgba(0,0,0,0.25)"/>
      <path d="M18 2C9.7 2 3 8.7 3 17c0 11 13.4 25.1 14 25.7a1.4 1.4 0 0 0 2 0C19.6 42.1 33 28 33 17 33 8.7 26.3 2 18 2z" fill="${fill}" stroke="#fff" stroke-width="2.4"/>
      ${PIN_GLYPH[kind] || PIN_GLYPH.center}
    </svg>`,
    iconSize: [36, 47],
    iconAnchor: [18, 44],
    popupAnchor: [0, -40],
  });
}

/** Compass bearing (degrees from north) from point a to b, both [lat, lng]. */
export function bearing(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const [lat1, lng1] = a.map(toRad);
  const [lat2, lng2] = b.map(toRad);
  const y = Math.sin(lng2 - lng1) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lng2 - lng1);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}
