export const ROLE_SLUGS = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  STAFF: 'staff',
};

export const STATUS_BADGE = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
  approved: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Approved' },
  rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' },
  delivering: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Delivering' },
  delivered: { bg: 'bg-green-100', text: 'text-green-800', label: 'Delivered' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Cancelled' },
  in_transit: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'In Transit' },
  completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
  active: { bg: 'bg-green-100', text: 'text-green-800', label: 'Active' },
  inactive: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Inactive' },
  draft: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Draft' },
  ordered: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Ordered' },
  received: { bg: 'bg-green-100', text: 'text-green-800', label: 'Received' },
};

export const PAYMENT_BADGE = {
  unpaid: { bg: 'bg-red-100', text: 'text-red-800', label: 'Unpaid' },
  paid: { bg: 'bg-green-100', text: 'text-green-800', label: 'Paid' },
  partial: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Partial' },
  refunded: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Refunded' },
};

export const INVENTORY_BADGE = {
  in_stock: { bg: 'bg-green-100', text: 'text-green-800', label: 'In Stock' },
  low_stock: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Low Stock' },
  out_of_stock: { bg: 'bg-red-100', text: 'text-red-800', label: 'Out of Stock' },
  no_stock: { bg: 'bg-red-100', text: 'text-red-800', label: 'No Stock' },
  expired: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Expired' },
};

export const WAREHOUSE_TYPES = {
  manufacturer: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Manufacturer' },
  region: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Regional' },
  city: { bg: 'bg-teal-100', text: 'text-teal-800', label: 'City' },
};

export const PARTNER_TYPES = {
  distributor: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Distributor' },
  reseller: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Reseller' },
  retailer: { bg: 'bg-teal-100', text: 'text-teal-800', label: 'Retailer' },
};

export const PRODUCT_CATEGORIES = [
  'Coffee',
  'Chocolate',
  'Barley',
  'Juice',
  'Health Drink',
];

export const CHART_COLORS = [
  '#FF8C00',
  '#4A1C00',
  '#B85C00',
  '#2D8A2D',
  '#0B3D0B',
  '#6B2D0E',
  '#D4A574',
  '#8B4513',
  '#CD853F',
  '#A0522D',
];
