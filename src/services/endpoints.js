export const AUTH = {
  LOGIN:           '/auth/login',
  LOGOUT:          '/auth/logout',
  REFRESH:         '/auth/refresh',
  ME:              '/auth/me',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD:  '/auth/reset-password',
};

export const USERS = {
  LIST:   '/users',
  CREATE: '/users',
  BY_ID:  (id) => `/users/${id}`,
  UPDATE: (id) => `/users/${id}`,
  DELETE: (id) => `/users/${id}`,
};

export const PARTNERS = {
  LIST:            '/partners',
  CREATE:          '/partners',
  BY_ID:           (id) => `/partners/${id}`,
  UPDATE:          (id) => `/partners/${id}`,
  UPDATE_DISCOUNT: (id) => `/partners/${id}/discount`,
};

export const PRODUCTS = {
  LIST:   '/products',
  CREATE: '/products',
  BY_ID:  (id) => `/products/${id}`,
  UPDATE: (id) => `/products/${id}`,
  DELETE: (id) => `/products/${id}`,
};

export const INVENTORY = {
  LIST:   '/inventory',
  CREATE: '/inventory',
  BY_ID:  (id) => `/inventory/${id}`,
  UPDATE: (id) => `/inventory/${id}`,
};

export const STOCK_MOVEMENTS = {
  LIST: '/stock-movements',
};

export const STOCK_ADJUSTMENTS = {
  LIST:    '/stock-adjustments',
  CREATE:  '/stock-adjustments',
  APPROVE: (id) => `/stock-adjustments/${id}/approve`,
};

export const WAREHOUSES = {
  LIST:   '/warehouses',
  CREATE: '/warehouses',
  BY_ID:  (id) => `/warehouses/${id}`,
  UPDATE: (id) => `/warehouses/${id}`,
};

export const ORDERS = {
  LIST:          '/orders',
  CREATE:        '/orders',
  PUBLIC:        '/orders/public',
  BY_ID:         (id) => `/orders/${id}`,
  APPROVE:       (id) => `/orders/${id}/approve`,
  REJECT:        (id) => `/orders/${id}/reject`,
  CANCEL:        (id) => `/orders/${id}/cancel`,
  PAYMENT_PROOF: (id) => `/orders/${id}/payment-proof`,
  VERIFY_PAYMENT:(id) => `/orders/${id}/verify-payment`,
};

export const CART = {
  LIST:     '/cart',
  ADD:      '/cart',
  UPDATE:   (id) => `/cart/${id}`,
  REMOVE:   (id) => `/cart/${id}`,
  CLEAR:    '/cart',
};

export const STOCK_TRANSFERS = {
  LIST:     '/stock-transfers',
  CREATE:   '/stock-transfers',
  BY_ID:    (id) => `/stock-transfers/${id}`,
  COMPLETE: (id) => `/stock-transfers/${id}/complete`,
};

export const PURCHASE_ORDERS = {
  LIST:    '/purchase-orders',
  CREATE:  '/purchase-orders',
  BY_ID:   (id) => `/purchase-orders/${id}`,
  APPROVE: (id) => `/purchase-orders/${id}/approve`,
};

export const GRN = {
  LIST:     '/grn',
  CREATE:   '/grn',
  BY_ID:    (id) => `/grn/${id}`,
  COMPLETE: (id) => `/grn/${id}/complete`,
};

export const BANK_ACCOUNTS = {
  LIST:      '/bank-accounts',
  CREATE:    '/bank-accounts',
  BY_ID:     (id) => `/bank-accounts/${id}`,
  UPDATE:    (id) => `/bank-accounts/${id}`,
  DELETE:    (id) => `/bank-accounts/${id}`,
  FOR_ORDER: (orderId) => `/bank-accounts/for-order/${orderId}`,
};

export const COURIERS = {
  LIST:   '/couriers',
  CREATE: '/couriers',
  UPDATE: (id) => `/couriers/${id}`,
  DELETE: (id) => `/couriers/${id}`,
};

export const DELIVERY_TOKENS = {
  GENERATE:  '/delivery-tokens',
  BY_ORDER:  (orderId) => `/delivery-tokens/by-order/${orderId}`,
  INFO:      (token) => `/delivery-tokens/deliver/${token}`,
  COMPLETE:  (token) => `/delivery-tokens/deliver/${token}/complete`,
};

export const MOBILE_STOCKISTS = {
  LIST:   '/mobile-stockists',
  CREATE: '/mobile-stockists',
  UPDATE: (id) => `/mobile-stockists/${id}`,
};

export const APPLICATIONS = {
  LIST:    '/applications',
  BY_ID:   (id) => `/applications/${id}`,
  SUBMIT:  '/applications/dta',
  APPROVE: (id) => `/applications/${id}/approve`,
  REJECT:  (id) => `/applications/${id}/reject`,
};

export const REPORTS = {
  REVENUE:   '/reports/revenue',
  PURCHASES: '/reports/purchases',
  PRODUCTS:  '/reports/products',
  MOVEMENTS: '/reports/movements',
};

export const DASHBOARD = {
  KPIS:         '/dashboard/kpis',
  RECENT_ORDERS:'/dashboard/recent-orders',
};

export const NOTIFICATIONS = {
  LIST:         '/notifications',
  COUNT:        '/notifications/count',
  MARK_READ:    (id) => `/notifications/${id}/read`,
  MARK_ALL_READ:'/notifications/read-all',
};

export const TRACKING = {
  BY_ORDER:    (orderId) => `/tracking/${orderId}`,
  PUBLIC:      (orderNumber) => `/tracking/public/${orderNumber}`,
  ACTIVE:      '/tracking/active',
  PING:        (token) => `/tracking/ping/${token}`,
};
