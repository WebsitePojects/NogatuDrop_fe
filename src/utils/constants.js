export const ROLE_SLUGS = {
  SUPER_ADMIN:          'super_admin',
  PROVINCIAL_STOCKIST:  'provincial_stockist',
  CITY_STOCKIST:        'city_stockist',
  MOBILE_STOCKIST:      'mobile_stockist',
  STAFF:                'staff',
  // Legacy DB slugs — treated same as city_stockist in the frontend
  ADMIN:                'admin',
};

// Roles that access /stockist/* portal (including legacy 'admin')
export const STOCKIST_ROLES = [
  'provincial_stockist',
  'city_stockist',
  'staff',
  'admin', // legacy — users in DB still may have this until migrated
];

export const ALL_STOCKIST_ROLES = [
  'provincial_stockist',
  'city_stockist',
  'mobile_stockist',
  'staff',
];

export const STATUS_BADGE = {
  pending:        { bg: 'bg-amber-100',   text: 'text-amber-700',   label: 'Pending' },
  approved:       { bg: 'bg-blue-100',    text: 'text-blue-700',    label: 'Approved' },
  rejected:       { bg: 'bg-red-100',     text: 'text-red-700',     label: 'Rejected' },
  delivering:     { bg: 'bg-purple-100',  text: 'text-purple-700',  label: 'Delivering' },
  delivered:      { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Delivered' },
  cancelled:      { bg: 'bg-red-50',      text: 'text-red-600',     label: 'Cancelled' },
  in_transit:     { bg: 'bg-indigo-100',  text: 'text-indigo-700',  label: 'In Transit' },
  completed:      { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Completed' },
  active:         { bg: 'bg-green-100',   text: 'text-green-700',   label: 'Active' },
  inactive:       { bg: 'bg-gray-100',    text: 'text-gray-600',    label: 'Inactive' },
  draft:          { bg: 'bg-gray-100',    text: 'text-gray-500',    label: 'Draft' },
  ordered:        { bg: 'bg-blue-100',    text: 'text-blue-700',    label: 'Ordered' },
  received:       { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Received' },
  pending_review: { bg: 'bg-amber-100',   text: 'text-amber-700',   label: 'Under Review' },
};

export const PAYMENT_BADGE = {
  unpaid:   { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Unpaid' },
  paid:     { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Paid' },
  partial:  { bg: 'bg-amber-100',  text: 'text-amber-700',  label: 'Partial' },
  refunded: { bg: 'bg-gray-100',   text: 'text-gray-600',   label: 'Refunded' },
};

export const INVENTORY_BADGE = {
  in_stock:     { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'In Stock' },
  low_stock:    { bg: 'bg-amber-100',   text: 'text-amber-700',   label: 'Low Stock' },
  out_of_stock: { bg: 'bg-red-100',     text: 'text-red-700',     label: 'Out of Stock' },
  no_stock:     { bg: 'bg-red-100',     text: 'text-red-700',     label: 'No Stock' },
  expired:      { bg: 'bg-gray-100',    text: 'text-gray-600',    label: 'Expired' },
};

export const STOCKIST_LEVEL_BADGE = {
  provincial_stockist: { bg: 'bg-amber-100',   text: 'text-amber-700',   label: 'Provincial Stockist' },
  city_stockist:       { bg: 'bg-blue-100',     text: 'text-blue-700',    label: 'City Stockist' },
  mobile_stockist:     { bg: 'bg-orange-100',   text: 'text-orange-700',  label: 'Mobile Stockist' },
};

export const WAREHOUSE_TYPES = {
  manufacturer: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'Manufacturer' },
  region:       { bg: 'bg-amber-100',  text: 'text-amber-700',  label: 'Regional' },
  city:         { bg: 'bg-blue-100',   text: 'text-blue-700',   label: 'City' },
};

export const PARTNER_TYPES = {
  distributor: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Distributor' },
  reseller:    { bg: 'bg-blue-100',  text: 'text-blue-700',  label: 'Reseller' },
  retailer:    { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Retailer' },
};

export const PRODUCT_CATEGORIES = [
  'Coffee', 'Chocolate', 'Barley', 'Juice', 'Health Drink', 'Other',
];

export const CHART_COLORS = [
  '#FF8C00', '#B85C00', '#3D1800', '#2D8A2D', '#0B3D0B',
  '#6B2D0E', '#D4A574', '#8B4513', '#CD853F', '#A0522D',
];
