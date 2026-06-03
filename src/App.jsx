import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ROLE_SLUGS } from '@/utils/constants';
import { PERMISSIONS, can, normalizeRoleSlug } from '@/utils/permissions';

const MainLayout = lazy(() => import('./layouts/MainLayout.jsx'));
const StockistLayout = lazy(() => import('./layouts/StockistLayout.jsx'));
const MobileLayout = lazy(() => import('./layouts/MobileLayout.jsx'));

const Login = lazy(() => import('./pages/shared/Login.jsx'));
const NotFound = lazy(() => import('./pages/shared/NotFound.jsx'));
const Tracking = lazy(() => import('./pages/shared/Tracking.jsx'));
const Deliver = lazy(() => import('./pages/shared/Deliver.jsx'));
const Shop = lazy(() => import('./pages/shared/Shop.jsx'));
const LandingPage = lazy(() => import('./pages/shared/LandingPage.jsx'));

const MainDashboard = lazy(() => import('./pages/main/Dashboard.jsx'));
const MainInventory = lazy(() => import('./pages/main/Inventory.jsx'));
const MainWarehouses = lazy(() => import('./pages/main/Warehouses.jsx'));
const MainOrders = lazy(() => import('./pages/main/Orders.jsx'));
const MainPartners = lazy(() => import('./pages/main/Partners.jsx'));
const MainProducts = lazy(() => import('./pages/main/Products.jsx'));
const MainStockTransfers = lazy(() => import('./pages/main/StockTransfers.jsx'));
const MainPurchaseOrders = lazy(() => import('./pages/main/PurchaseOrders.jsx'));
const MainReports = lazy(() => import('./pages/main/Reports.jsx'));
const MainUsers = lazy(() => import('./pages/main/Users.jsx'));
const MainBankAccounts = lazy(() => import('./pages/main/BankAccounts.jsx'));
const MainCouriers = lazy(() => import('./pages/main/Couriers.jsx'));
const MainStockMovements = lazy(() => import('./pages/main/StockMovements.jsx'));
const MainStockAdjustments = lazy(() => import('./pages/main/StockAdjustments.jsx'));
const MainCycleCounts = lazy(() => import('./pages/main/CycleCounts.jsx'));
const MainSettlements = lazy(() => import('./pages/main/Settlements.jsx'));
const MainDeliveryLive = lazy(() => import('./pages/main/DeliveryLive.jsx'));

const StockistDashboard = lazy(() => import('./pages/stockist/Dashboard.jsx'));
const StockistCatalog = lazy(() => import('./pages/stockist/Catalog.jsx'));
const StockistCatalogDetail = lazy(() => import('./pages/stockist/CatalogDetail.jsx'));
const StockistCart = lazy(() => import('./pages/stockist/Cart.jsx'));
const StockistOrders = lazy(() => import('./pages/stockist/Orders.jsx'));
const StockistReports = lazy(() => import('./pages/stockist/Reports.jsx'));
const StockistUsers = lazy(() => import('./pages/stockist/Users.jsx'));
const StockistInventory = lazy(() => import('./pages/stockist/Inventory.jsx'));
const StockistGRN = lazy(() => import('./pages/stockist/GRN.jsx'));
const StockistMobileStockists = lazy(() => import('./pages/stockist/MobileStockists.jsx'));
const StockistStockTransfers = lazy(() => import('./pages/stockist/StockTransfers.jsx'));
const StockistPurchaseOrders = lazy(() => import('./pages/stockist/PurchaseOrders.jsx'));
const StockistWarehouses = lazy(() => import('./pages/stockist/Warehouses.jsx'));
const StockistCycleCounts = lazy(() => import('./pages/stockist/CycleCounts.jsx'));
const StockistSettlements = lazy(() => import('./pages/stockist/Settlements.jsx'));
const StockistDeliveryLive = lazy(() => import('./pages/stockist/DeliveryLive.jsx'));

const MobileDashboard = lazy(() => import('./pages/mobile/Dashboard.jsx'));
const MobileCatalog = lazy(() => import('./pages/mobile/Catalog.jsx'));
const MobileCart = lazy(() => import('./pages/mobile/Cart.jsx'));
const MobileOrders = lazy(() => import('./pages/mobile/Orders.jsx'));
const MobileProfile = lazy(() => import('./pages/mobile/Profile.jsx'));
const MobileDeliveryLive = lazy(() => import('./pages/mobile/DeliveryLive.jsx'));

const LoadingScreen = () => (
  <div className="flex min-h-screen items-center justify-center bg-gray-50">
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-3 border-orange-500 border-t-transparent" />
      <p className="text-sm text-gray-500">Loading...</p>
    </div>
  </div>
);

const ProtectedRoute = ({ children, allowedRoles, requiredPermission }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;

  const normalizedRole = normalizeRoleSlug(user.role_slug);

  if (allowedRoles && !allowedRoles.includes(normalizedRole)) {
    if (normalizedRole === ROLE_SLUGS.SUPER_ADMIN) return <Navigate to="/main/dashboard" replace />;
    if (normalizedRole === ROLE_SLUGS.MOBILE_STOCKIST) return <Navigate to="/mobile/dashboard" replace />;
    return <Navigate to="/stockist/dashboard" replace />;
  }

  if (requiredPermission && !can(normalizedRole, requiredPermission)) {
    if (normalizedRole === ROLE_SLUGS.SUPER_ADMIN) return <Navigate to="/main/dashboard" replace />;
    if (normalizedRole === ROLE_SLUGS.MOBILE_STOCKIST) return <Navigate to="/mobile/dashboard" replace />;
    return <Navigate to="/stockist/dashboard" replace />;
  }

  return children;
};

const AppRoutes = () => {
  const { user } = useAuth();
  const normalizedRole = normalizeRoleSlug(user?.role_slug);

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/track" element={<Tracking />} />
        <Route path="/track/:orderNumber" element={<Tracking />} />
        <Route path="/deliver/:token" element={<Deliver />} />

        <Route
          path="/main/*"
          element={
            <ProtectedRoute allowedRoles={[ROLE_SLUGS.SUPER_ADMIN]}>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<MainDashboard />} />
          <Route path="orders" element={<MainOrders />} />
          <Route path="operations/control-tower" element={<Navigate to="/main/orders" replace />} />
          <Route path="operations/dispatch-board" element={<Navigate to="/main/stock-transfers" replace />} />
          <Route path="operations/exceptions" element={<Navigate to="/main/orders" replace />} />
          <Route path="delivery/live" element={<MainDeliveryLive />} />
          <Route path="payments/queue" element={<Navigate to="/main/orders" replace />} />
          <Route path="payments/routing" element={<Navigate to="/main/bank-accounts" replace />} />
          <Route path="payments/settlements" element={<MainSettlements />} />
          <Route path="stock/replenishment" element={<Navigate to="/main/inventory" replace />} />
          <Route path="stock/expiry-risk" element={<Navigate to="/main/inventory" replace />} />
          <Route path="stock/capacity" element={<Navigate to="/main/warehouses" replace />} />
          <Route path="cycle-counts" element={<MainCycleCounts />} />
          <Route path="inventory" element={<MainInventory />} />
          <Route path="stock-movements" element={<MainStockMovements />} />
          <Route path="stock-adjustments" element={<MainStockAdjustments />} />
          <Route path="warehouses" element={<MainWarehouses />} />
          <Route path="products" element={<MainProducts />} />
          <Route path="stock-transfers" element={<MainStockTransfers />} />
          <Route path="purchase-orders" element={<MainPurchaseOrders />} />
          <Route path="partners" element={<MainPartners />} />
          <Route path="bank-accounts" element={<MainBankAccounts />} />
          <Route path="couriers" element={<MainCouriers />} />
          <Route path="reports" element={<MainReports />} />
          <Route path="users" element={<MainUsers />} />
        </Route>

        <Route
          path="/stockist/*"
          element={
            <ProtectedRoute allowedRoles={[
              ROLE_SLUGS.PROVINCIAL_STOCKIST,
              ROLE_SLUGS.CITY_STOCKIST,
              ROLE_SLUGS.STAFF,
              ROLE_SLUGS.ADMIN,
            ]}>
              <CartProvider>
                <StockistLayout />
              </CartProvider>
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<StockistDashboard />} />
          <Route path="catalog" element={<StockistCatalog />} />
          <Route path="catalog/:id" element={<StockistCatalogDetail />} />
          <Route
            path="cart"
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.CART_USE}>
                <StockistCart />
              </ProtectedRoute>
            }
          />
          <Route path="orders" element={<StockistOrders />} />
          <Route path="orders/board" element={<Navigate to="/stockist/orders" replace />} />
          <Route path="orders/payments" element={<Navigate to="/stockist/orders" replace />} />
          <Route path="orders/dispatch" element={<Navigate to="/stockist/orders" replace />} />
          <Route path="orders/:id" element={<StockistOrders />} />
          <Route path="delivery/live" element={<StockistDeliveryLive />} />
          <Route path="delivery/couriers" element={<Navigate to="/stockist/delivery/live" replace />} />
          <Route path="delivery/pod" element={<Navigate to="/stockist/orders" replace />} />
          <Route path="inventory" element={<StockistInventory />} />
          <Route
            path="cycle-counts"
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.CYCLE_COUNTS_CREATE}>
                <StockistCycleCounts />
              </ProtectedRoute>
            }
          />
          <Route
            path="settlements"
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.SETTLEMENTS_VIEW}>
                <StockistSettlements />
              </ProtectedRoute>
            }
          />
          <Route path="grn" element={<StockistGRN />} />
          <Route
            path="mobile-stockists"
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.MOBILE_STOCKISTS_MANAGE}>
                <StockistMobileStockists />
              </ProtectedRoute>
            }
          />
          <Route
            path="mobile-stockists/segments"
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.MOBILE_STOCKISTS_MANAGE}>
                <Navigate to="/stockist/mobile-stockists" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="mobile-stockists/activity"
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.MOBILE_STOCKISTS_MANAGE}>
                <Navigate to="/stockist/mobile-stockists" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="mobile-stockists/risk-signals"
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.MOBILE_STOCKISTS_MANAGE}>
                <Navigate to="/stockist/mobile-stockists" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="stock-transfers"
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.STOCK_TRANSFERS_CREATE}>
                <StockistStockTransfers />
              </ProtectedRoute>
            }
          />
          <Route
            path="purchase-orders"
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.PURCHASE_ORDERS_CREATE}>
                <StockistPurchaseOrders />
              </ProtectedRoute>
            }
          />
          <Route
            path="warehouses"
            element={
              <ProtectedRoute allowedRoles={[ROLE_SLUGS.PROVINCIAL_STOCKIST, ROLE_SLUGS.CITY_STOCKIST]}>
                <StockistWarehouses />
              </ProtectedRoute>
            }
          />
          <Route
            path="reports"
            element={
              <ProtectedRoute requiredPermission={PERMISSIONS.REPORTS_VIEW}>
                <StockistReports />
              </ProtectedRoute>
            }
          />
          <Route
            path="users"
            element={
              <ProtectedRoute allowedRoles={[ROLE_SLUGS.PROVINCIAL_STOCKIST, ROLE_SLUGS.CITY_STOCKIST]}>
                <StockistUsers />
              </ProtectedRoute>
            }
          />
        </Route>

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
          <Route path="catalog" element={<MobileCatalog />} />
          <Route path="cart" element={<MobileCart />} />
          <Route path="orders" element={<MobileOrders />} />
          <Route path="reorder" element={<Navigate to="/mobile/catalog" replace />} />
          <Route path="delivery" element={<MobileDeliveryLive />} />
          <Route path="account" element={<Navigate to="/mobile/profile" replace />} />
          <Route path="profile" element={<MobileProfile />} />
        </Route>

        <Route
          path="/dashboard"
          element={
            normalizedRole === ROLE_SLUGS.SUPER_ADMIN
              ? <Navigate to="/main/dashboard" replace />
              : normalizedRole === ROLE_SLUGS.MOBILE_STOCKIST
                ? <Navigate to="/mobile/dashboard" replace />
                : <Navigate to="/stockist/dashboard" replace />
          }
        />

        <Route path="/partner/*" element={<Navigate to="/stockist/dashboard" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
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
