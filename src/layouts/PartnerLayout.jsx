import React from 'react';
import { Outlet } from 'react-router-dom';
import {
  FiGrid,
  FiBox,
  FiShoppingCart,
  FiFileText,
  FiBarChart2,
  FiUserPlus,
} from 'react-icons/fi';
import SidebarNav from '@/components/SidebarNav';
import { useAuth } from '@/context/AuthContext';
import { ROLE_SLUGS } from '@/utils/constants';

const BRAND_LOGO = '/assets/dropshipping_nogatu_logo.jpg';

const PartnerLayout = () => {
  const { user } = useAuth();

  const navItems = [
    { path: '/partner/dashboard', label: 'Dashboard', icon: FiGrid, end: true },
    { path: '/partner/products', label: 'Products', icon: FiBox },
    { path: '/partner/cart', label: 'Shopping Cart', icon: FiShoppingCart },
    { path: '/partner/orders', label: 'Orders', icon: FiFileText },
    { path: '/partner/reports', label: 'Reports', icon: FiBarChart2 },
  ];

  if (user?.role_slug === ROLE_SLUGS.ADMIN) {
    navItems.push({ path: '/partner/users', label: 'Manage Users', icon: FiUserPlus });
  }

  return (
    <div className="flex min-h-screen bg-partner-bg">
      <SidebarNav theme="partner" navItems={navItems} />
      <div className="flex-1 ml-64">
        <header className="sticky top-0 z-30 bg-gradient-to-r from-[#0B3D0B] to-[#1B6B1B] shadow-md">
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-3 text-white">
              <img
                src={BRAND_LOGO}
                alt="Nogatu logo"
                className="w-9 h-9 rounded-lg object-cover border border-white/30"
              />
              <span className="text-sm font-semibold tracking-wide hidden sm:inline">NOGATU</span>
            </div>
            <div className="flex items-center gap-2 text-white">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
                {user?.first_name?.[0] || 'P'}
              </div>
              <span className="text-sm font-medium hidden sm:inline">
                {user?.first_name || 'Partner'}
              </span>
            </div>
          </div>
        </header>
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default PartnerLayout;
