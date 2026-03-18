export const AUTH = {
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  REFRESH: '/auth/refresh',
  ME: '/auth/me',
};

export const USERS = {
  LIST: '/users',
  CREATE: '/users',
  BY_ID: (id) => `/users/${id}`,
  UPDATE: (id) => `/users/${id}`,
  DELETE: (id) => `/users/${id}`,
};

export const PARTNERS = {
  LIST: '/partners',
  CREATE: '/partners',
  BY_ID: (id) => `/partners/${id}`,
  UPDATE: (id) => `/partners/${id}`,
  DELETE: (id) => `/partners/${id}`,
};

export const PRODUCTS = {
  LIST: '/products',
  CREATE: '/products',
  BY_ID: (id) => `/products/${id}`,
  UPDATE: (id) => `/products/${id}`,
  DELETE: (id) => `/products/${id}`,
};

export const INVENTORY = {
  LIST: '/inventory',
  CREATE: '/inventory',
  BY_ID: (id) => `/inventory/${id}`,
  UPDATE: (id) => `/inventory/${id}`,
  DELETE: (id) => `/inventory/${id}`,
};

export const WAREHOUSES = {
  LIST: '/warehouses',
  CREATE: '/warehouses',
  BY_ID: (id) => `/warehouses/${id}`,
  UPDATE: (id) => `/warehouses/${id}`,
  DELETE: (id) => `/warehouses/${id}`,
};

export const ORDERS = {
  LIST: '/orders',
  CREATE: '/orders',
  BY_ID: (id) => `/orders/${id}`,
  APPROVE: (id) => `/orders/${id}/approve`,
  REJECT: (id) => `/orders/${id}/reject`,
  PAY: (id) => `/orders/${id}/pay`,
  DELIVER: (id) => `/orders/${id}/deliver`,
};

export const CART = {
  LIST: '/cart',
  ADD: '/cart',
  UPDATE: (id) => `/cart/${id}`,
  REMOVE: (id) => `/cart/${id}`,
  CLEAR: '/cart',
  CHECKOUT: '/orders',
};

export const STOCK_TRANSFERS = {
  LIST: '/stock-transfers',
  CREATE: '/stock-transfers',
  BY_ID: (id) => `/stock-transfers/${id}`,
  COMPLETE: (id) => `/stock-transfers/${id}/complete`,
};

export const PURCHASE_ORDERS = {
  LIST: '/purchase-orders',
  CREATE: '/purchase-orders',
  BY_ID: (id) => `/purchase-orders/${id}`,
  APPROVE: (id) => `/purchase-orders/${id}/approve`,
};

export const REPORTS = {
  REVENUE: '/reports/revenue',
  PURCHASES: '/reports/purchases',
  PRODUCTS: '/reports/products',
};

export const DASHBOARD = {
  KPIS: '/dashboard/kpis',
  RECENT_ORDERS: '/dashboard/recent-orders',
};

export const NOTIFICATIONS = {
  LIST: '/notifications',
  COUNT: '/notifications/count',
  MARK_READ: (id) => `/notifications/${id}/read`,
  MARK_ALL_READ: '/notifications/read-all',
};

export const TRACKING = {
  BY_ORDER: (orderId) => `/tracking/${orderId}`,
  PING: '/tracking/ping',
  STATUS: (trackingId) => `/tracking/${trackingId}/status`,
};
