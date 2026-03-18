import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { ROLE_SLUGS } from '@/utils/constants';

import MainLayout from '@/layouts/MainLayout';
import PartnerLayout from '@/layouts/PartnerLayout';

import Login from '@/pages/shared/Login';
import LandingPage from '@/pages/shared/LandingPage';
import NotFound from '@/pages/shared/NotFound';
import Tracking from '@/pages/shared/Tracking';

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

import PartnerDashboard from '@/pages/partner/Dashboard';
import PartnerProductCatalog from '@/pages/partner/ProductCatalog';
import PartnerShoppingCart from '@/pages/partner/ShoppingCart';
import PartnerOrders from '@/pages/partner/Orders';
import PartnerReports from '@/pages/partner/Reports';
import PartnerUsers from '@/pages/partner/Users';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-main-active border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role_slug)) {
    const target = user.role_slug === ROLE_SLUGS.SUPER_ADMIN ? '/main/dashboard' : '/partner/dashboard';
    return <Navigate to={target} replace />;
  }

  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />

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
        <Route path="inventory" element={<MainInventory />} />
        <Route path="warehouses" element={<MainWarehouses />} />
        <Route path="orders" element={<MainOrders />} />
        <Route path="partners" element={<MainPartners />} />
        <Route path="products" element={<MainProducts />} />
        <Route path="stock-transfers" element={<MainStockTransfers />} />
        <Route path="purchase-orders" element={<MainPurchaseOrders />} />
        <Route path="reports" element={<MainReports />} />
        <Route path="users" element={<MainUsers />} />
      </Route>

      <Route
        path="/partner/*"
        element={
          <ProtectedRoute allowedRoles={[ROLE_SLUGS.ADMIN, ROLE_SLUGS.STAFF]}>
            <CartProvider>
              <PartnerLayout />
            </CartProvider>
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<PartnerDashboard />} />
        <Route path="products" element={<PartnerProductCatalog />} />
        <Route path="cart" element={<PartnerShoppingCart />} />
        <Route path="orders" element={<PartnerOrders />} />
        <Route path="orders/:id" element={<PartnerOrders />} />
        <Route path="reports" element={<PartnerReports />} />
        <Route
          path="users"
          element={
            <ProtectedRoute allowedRoles={[ROLE_SLUGS.ADMIN]}>
              <PartnerUsers />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="/tracking/:orderId" element={<Tracking />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppRoutes />
      </NotificationProvider>
    </AuthProvider>
  );
};

export default App;
