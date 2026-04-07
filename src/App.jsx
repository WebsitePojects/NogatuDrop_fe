import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ROLE_SLUGS } from '@/utils/constants';

import MainLayout from '@/layouts/MainLayout';
import StockistLayout from '@/layouts/StockistLayout';
import MobileLayout from '@/layouts/MobileLayout';

// Shared pages
import Login from '@/pages/shared/Login';
import LandingPage from '@/pages/shared/LandingPage';
import NotFound from '@/pages/shared/NotFound';
import Tracking from '@/pages/shared/Tracking';
import Apply from '@/pages/shared/Apply';
import Deliver from '@/pages/shared/Deliver';
import Shop from '@/pages/shared/Shop';

// Main portal pages
import MainDashboard from '@/pages/main/Dashboard';
import MainInventory from '@/pages/main/Inventory';
import MainWarehouses from '@/pages/main/Warehouses';
import MainOrders from '@/pages/main/Orders';
import MainPartners from '@/pages/main/Partners';
import MainProducts from '@/pages/main/Products';
import MainStockTransfers from '@/pages/main/StockTransfers';
import MainPurchaseOrders from '@/pages/main/PurchaseOrders';
import MainReports from '@/pages/main/Reports';
import MainUsers from '@/pages/main/Users';
import MainApplications from '@/pages/main/Applications';
import MainBankAccounts from '@/pages/main/BankAccounts';
import MainCouriers from '@/pages/main/Couriers';
import MainStockMovements from '@/pages/main/StockMovements';
import MainStockAdjustments from '@/pages/main/StockAdjustments';

// Stockist portal pages
import StockistDashboard from '@/pages/stockist/Dashboard';
import StockistCatalog from '@/pages/stockist/Catalog';
import StockistCatalogDetail from '@/pages/stockist/CatalogDetail';
import StockistCart from '@/pages/stockist/Cart';
import StockistOrders from '@/pages/stockist/Orders';
import StockistReports from '@/pages/stockist/Reports';
import StockistUsers from '@/pages/stockist/Users';
import StockistInventory from '@/pages/stockist/Inventory';
import StockistGRN from '@/pages/stockist/GRN';
import StockistMobileStockists from '@/pages/stockist/MobileStockists';
import StockistStockTransfers from '@/pages/stockist/StockTransfers';
import StockistPurchaseOrders from '@/pages/stockist/PurchaseOrders';
import StockistWarehouses from '@/pages/stockist/Warehouses';

// Mobile Stockist portal
import MobileDashboard from '@/pages/mobile/Dashboard';
import MobileCatalog from '@/pages/mobile/Catalog';
import MobileOrders from '@/pages/mobile/Orders';
import MobileProfile from '@/pages/mobile/Profile';

// ─── Loading screen ─────────────────────────────────────────────────────────
const LoadingScreen = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-3 border-t-transparent border-orange-500 rounded-full animate-spin" />
      <p className="text-sm text-gray-500">Loading…</p>
    </div>
  </div>
);

const normalizeRoleSlug = (roleSlug) => {
  if (roleSlug === 'admin') return ROLE_SLUGS.PROVINCIAL_STOCKIST;
  return roleSlug;
};

// ─── Protected route ─────────────────────────────────────────────────────────
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  if (!user) return <Navigate to="/login" replace />;

  const normalizedRole = normalizeRoleSlug(user.role_slug);

  if (allowedRoles && !allowedRoles.includes(normalizedRole)) {
    // Redirect to correct portal
    if (normalizedRole === ROLE_SLUGS.SUPER_ADMIN) return <Navigate to="/main/dashboard" replace />;
    if (normalizedRole === ROLE_SLUGS.MOBILE_STOCKIST) return <Navigate to="/mobile/dashboard" replace />;
    return <Navigate to="/stockist/dashboard" replace />;
  }

  return children;
};

// ─── Routes ──────────────────────────────────────────────────────────────────
const AppRoutes = () => {
  const { user } = useAuth();
  const normalizedRole = normalizeRoleSlug(user?.role_slug);

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/apply" element={<Apply />} />
      <Route path="/shop" element={<Shop />} />
      <Route path="/track/:orderNumber" element={<Tracking />} />
      <Route path="/deliver/:token" element={<Deliver />} />

      {/* ── Super Admin (Main portal) ─────────────────────────── */}
      <Route
        path="/main/*"
        element={
          <ProtectedRoute allowedRoles={[ROLE_SLUGS.SUPER_ADMIN]}>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"         element={<MainDashboard />} />
        <Route path="orders"            element={<MainOrders />} />
        <Route path="inventory"         element={<MainInventory />} />
        <Route path="stock-movements"   element={<MainStockMovements />} />
        <Route path="stock-adjustments" element={<MainStockAdjustments />} />
        <Route path="warehouses"        element={<MainWarehouses />} />
        <Route path="products"          element={<MainProducts />} />
        <Route path="stock-transfers"   element={<MainStockTransfers />} />
        <Route path="purchase-orders"   element={<MainPurchaseOrders />} />
        <Route path="partners"          element={<MainPartners />} />
        <Route path="applications"      element={<MainApplications />} />
        <Route path="bank-accounts"     element={<MainBankAccounts />} />
        <Route path="couriers"          element={<MainCouriers />} />
        <Route path="reports"           element={<MainReports />} />
        <Route path="users"             element={<MainUsers />} />
      </Route>

      {/* ── Stockist portal (Provincial, City, Staff) ────────── */}
      <Route
        path="/stockist/*"
        element={
          <ProtectedRoute allowedRoles={[
            ROLE_SLUGS.PROVINCIAL_STOCKIST,
            ROLE_SLUGS.CITY_STOCKIST,
            ROLE_SLUGS.STAFF,
            ROLE_SLUGS.ADMIN, // legacy slug until DB migration applied
          ]}>
            <CartProvider>
              <StockistLayout />
            </CartProvider>
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"        element={<StockistDashboard />} />
        <Route path="catalog"          element={<StockistCatalog />} />
        <Route path="catalog/:id"      element={<StockistCatalogDetail />} />
        <Route path="cart"             element={<StockistCart />} />
        <Route path="orders"           element={<StockistOrders />} />
        <Route path="orders/:id"       element={<StockistOrders />} />
        <Route path="inventory"        element={<StockistInventory />} />
        <Route path="grn"              element={<StockistGRN />} />
        <Route path="mobile-stockists" element={<StockistMobileStockists />} />
        <Route path="stock-transfers"  element={<StockistStockTransfers />} />
        <Route path="purchase-orders"  element={<StockistPurchaseOrders />} />
        <Route path="warehouses"       element={<StockistWarehouses />} />
        <Route path="reports"          element={<StockistReports />} />
        <Route
          path="users"
          element={
            <ProtectedRoute allowedRoles={[ROLE_SLUGS.PROVINCIAL_STOCKIST, ROLE_SLUGS.CITY_STOCKIST]}>
              <StockistUsers />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* ── Mobile Stockist portal ───────────────────────────── */}
      <Route
        path="/mobile/*"
        element={
          <ProtectedRoute allowedRoles={[ROLE_SLUGS.MOBILE_STOCKIST]}>
            <CartProvider>
              <MobileLayout />
            </CartProvider>
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<MobileDashboard />} />
        <Route path="catalog"   element={<MobileCatalog />} />
        <Route path="orders"    element={<MobileOrders />} />
        <Route path="profile"   element={<MobileProfile />} />
      </Route>

      {/* Redirect root based on role */}
      <Route path="/dashboard" element={
        normalizedRole === ROLE_SLUGS.SUPER_ADMIN
          ? <Navigate to="/main/dashboard" replace />
          : normalizedRole === ROLE_SLUGS.MOBILE_STOCKIST
          ? <Navigate to="/mobile/dashboard" replace />
          : <Navigate to="/stockist/dashboard" replace />
      } />

      {/* Legacy /partner/* redirect to /stockist/* */}
      <Route path="/partner/*" element={<Navigate to="/stockist/dashboard" replace />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <ThemeProvider>
    <AuthProvider>
      <NotificationProvider>
        <AppRoutes />
      </NotificationProvider>
    </AuthProvider>
  </ThemeProvider>
);

export default App;
