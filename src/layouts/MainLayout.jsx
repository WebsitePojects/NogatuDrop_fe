import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import {
  FiGrid,
  FiPackage,
  FiHome,
  FiShoppingCart,
  FiUsers,
  FiBox,
  FiTruck,
  FiFileText,
  FiBarChart2,
  FiUserPlus,
  FiBell,
} from 'react-icons/fi';
import SidebarNav from '@/components/SidebarNav';
import NotificationDrawer from '@/components/NotificationDrawer';
import { useNotifications } from '@/context/NotificationContext';
import { useAuth } from '@/context/AuthContext';

const navItems = [
  { path: '/main/dashboard', label: 'Dashboard', icon: FiGrid, end: true },
  { path: '/main/inventory', label: 'Inventory', icon: FiPackage },
  { path: '/main/warehouses', label: 'Warehouses', icon: FiHome },
  { path: '/main/orders', label: 'Orders', icon: FiShoppingCart },
  { path: '/main/partners', label: 'Partners', icon: FiUsers },
  { path: '/main/products', label: 'Products', icon: FiBox },
  { path: '/main/stock-transfers', label: 'Stock Transfers', icon: FiTruck },
  { path: '/main/purchase-orders', label: 'Purchase Orders', icon: FiFileText },
  { path: '/main/reports', label: 'Reports', icon: FiBarChart2 },
  { path: '/main/users', label: 'Manage Users', icon: FiUserPlus },
];

const MainLayout = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { unreadCount } = useNotifications();
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen bg-main-bg">
      <SidebarNav theme="main" navItems={navItems} />
      <div className="flex-1 ml-64">
        <header className="sticky top-0 z-30 bg-gradient-to-r from-[#4A1C00] to-[#6B2D0E] shadow-md">
          <div className="flex items-center justify-between px-6 py-3">
            <div />
            <div className="flex items-center gap-4">
              <button
                onClick={() => setDrawerOpen(true)}
                className="relative p-2 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <FiBell className="text-xl" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              <div className="flex items-center gap-2 text-white">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
                  {user?.first_name?.[0] || 'A'}
                </div>
                <span className="text-sm font-medium hidden sm:inline">
                  {user?.first_name || 'Admin'}
                </span>
              </div>
            </div>
          </div>
        </header>
        <main className="p-6">
          <Outlet />
        </main>
      </div>
      <NotificationDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
};

export default MainLayout;
