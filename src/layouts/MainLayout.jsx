import { useState, Fragment } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Dropdown, DropdownItem, DropdownDivider } from 'flowbite-react';
import {
  HiOutlineHome, HiOutlineShoppingCart, HiOutlineCube, HiOutlineCollection,
  HiOutlineAdjustments, HiOutlineOfficeBuilding, HiOutlineTag,
  HiOutlineSwitchHorizontal, HiOutlineClipboardList, HiOutlineUserGroup,
  HiOutlineClipboardCheck, HiOutlineCurrencyDollar, HiOutlineTruck,
  HiOutlineChartBar, HiOutlineUsers, HiOutlineBell, HiOutlineLogout,
  HiOutlineMenuAlt2, HiOutlineX, HiOutlineSun, HiOutlineMoon,
  HiChevronDown,
} from 'react-icons/hi';
import NotificationDrawer from '@/components/NotificationDrawer';
import FloatingTutorial from '@/components/FloatingTutorial';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

const BRAND_LOGO = '/assets/dropshipping_nogatu_logo.png';

const NAV_GROUPS = [
  {
    label: null,
    items: [
      { path: '/main/dashboard', label: 'Dashboard', icon: HiOutlineHome },
    ],
  },
  {
    label: 'Operations',
    items: [
      { path: '/main/operations/control-tower', label: 'Control Tower', icon: HiOutlineClipboardList },
      { path: '/main/operations/dispatch-board', label: 'Dispatch Board', icon: HiOutlineTruck },
      { path: '/main/operations/exceptions', label: 'Delivery Exceptions', icon: HiOutlineTruck },
      { path: '/main/orders',          label: 'Orders',          icon: HiOutlineShoppingCart },
      { path: '/main/stock-transfers', label: 'Stock Transfers', icon: HiOutlineSwitchHorizontal },
      { path: '/main/purchase-orders', label: 'Purchase Orders', icon: HiOutlineClipboardList },
    ],
  },
  {
    label: 'Payments',
    items: [
      { path: '/main/payments/queue', label: 'Verification Queue', icon: HiOutlineCurrencyDollar },
      { path: '/main/payments/routing', label: 'Regional Routing', icon: HiOutlineOfficeBuilding },
      { path: '/main/payments/settlements', label: 'Settlement Monitor', icon: HiOutlineCurrencyDollar },
      { path: '/main/bank-accounts', label: 'Bank Accounts', icon: HiOutlineCurrencyDollar },
    ],
  },
  {
    label: 'Stock Health',
    items: [
      { path: '/main/stock/replenishment', label: 'Replenishment Planner', icon: HiOutlineCube },
      { path: '/main/stock/expiry-risk', label: 'Expiry Risk Board', icon: HiOutlineCollection },
      { path: '/main/stock/capacity', label: 'Capacity Heatmap', icon: HiOutlineChartBar },
      { path: '/main/inventory',         label: 'Inventory',        icon: HiOutlineCube },
      { path: '/main/stock-movements',   label: 'Stock Movements',  icon: HiOutlineCollection },
      { path: '/main/stock-adjustments', label: 'Adjustments',      icon: HiOutlineAdjustments },
      { path: '/main/warehouses',        label: 'Warehouses',       icon: HiOutlineOfficeBuilding },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { path: '/main/products', label: 'Products', icon: HiOutlineTag },
    ],
  },
  {
    label: 'Applications',
    items: [
      { path: '/main/applications',  label: 'Applications',  icon: HiOutlineClipboardCheck },
      { path: '/main/applications/pipeline',  label: 'Pipeline Board',  icon: HiOutlineClipboardCheck },
      { path: '/main/applications/analytics',  label: 'Conversion Analytics',  icon: HiOutlineChartBar },
    ],
  },
  {
    label: 'People',
    items: [
      { path: '/main/partners',      label: 'Stockists',     icon: HiOutlineUserGroup },
      { path: '/main/users',         label: 'Users',         icon: HiOutlineUsers },
    ],
  },
  {
    label: 'Reports',
    items: [
      { path: '/main/reports',       label: 'Reports',       icon: HiOutlineChartBar },
    ],
  },
  {
    label: 'Logistics',
    items: [
      { path: '/main/couriers', label: 'Couriers', icon: HiOutlineTruck },
    ],
  },
];

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifOpen, setNotifOpen] = useState(false);
  const { count } = useNotifications();
  const { user, logout } = useAuth();
  const { dark, toggle: toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'SA';

  const currentPageLabel = NAV_GROUPS
    .flatMap((g) => g.items)
    .find((i) => location.pathname.startsWith(i.path))?.label || '';

  /* Warm charcoal palette — complements brown #1C0A00 sidebar */
  const darkVars = dark ? {
    '--dark-bg':     '#1e1613',
    '--dark-card':   '#271c18',
    '--dark-card2':  '#2e221e',
    '--dark-border': '#3d2e28',
    '--dark-topbar': '#221a16',
    '--dark-text':   '#f5ebe3',
    '--dark-muted':  '#9e8a7e',
  } : {};

  return (
    <div
      className={`flex min-h-screen ${dark ? 'dark' : ''}`}
      style={{ background: dark ? '#1e1613' : 'var(--main-bg)', ...darkVars }}
    >
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ─── Sidebar ──────────────────────────────────────────────────── */}
      <aside
        className={`portal-sidebar ${sidebarOpen ? '' : 'collapsed'}`}
        style={{ background: 'var(--main-sidebar)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-white/10 flex-shrink-0">
          <img src={BRAND_LOGO} alt="Nogatu" className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
          <div className="overflow-hidden">
            <p className="text-white text-sm font-bold leading-none">NCDMS</p>
            <p className="text-white/40 text-xs mt-0.5">Main System</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3">
          {NAV_GROUPS.map((group, gi) => (
            <Fragment key={gi}>
              {group.label && (
                <p className="sidebar-group-label">{group.label}</p>
              )}
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `sidebar-item${isActive ? ' active' : ''}`
                  }
                  style={({ isActive }) =>
                    isActive
                      ? { background: 'rgba(245,158,11,0.2)', color: '#F59E0B' }
                      : {}
                  }
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              ))}
            </Fragment>
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t border-white/10 p-3 flex-shrink-0">
          <div className="flex items-center gap-2.5 px-1 mb-2">
            <div className="w-8 h-8 rounded-full bg-amber-500/30 border border-amber-500/50 flex items-center justify-center text-amber-200 text-xs font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-white text-xs font-semibold truncate">{user?.name || 'Admin'}</p>
              <p className="text-white/40 text-xs">Super Admin</p>
            </div>
          </div>
          <button onClick={handleLogout} className="sidebar-item w-full text-left">
            <HiOutlineLogout className="w-4 h-4 flex-shrink-0" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* ─── Main content ───────────────────────────────────────────── */}
      <div className={`portal-main ${sidebarOpen ? '' : 'full-width'}`}>
        {/* Top bar */}
        <header
          className="portal-topbar"
          style={{
            borderColor: dark ? '#3d2e28' : 'var(--main-border)',
            background: dark ? '#221a16' : '#fff',
          }}
        >
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? (
              <HiOutlineX className="w-5 h-5" />
            ) : (
              <HiOutlineMenuAlt2 className="w-5 h-5" />
            )}
          </button>

          {/* Page label */}
          <div className="flex-1 pl-2 hidden sm:block">
            <span className="text-sm text-gray-500 dark:text-gray-400">{currentPageLabel}</span>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300"
              title={dark ? 'Light mode' : 'Dark mode'}
            >
              {dark ? <HiOutlineSun className="w-5 h-5" /> : <HiOutlineMoon className="w-5 h-5" />}
            </button>

            {/* Notifications */}
            <button
              onClick={() => setNotifOpen(true)}
              className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300"
              aria-label="Notifications"
            >
              <HiOutlineBell className="w-5 h-5" />
              {count > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center leading-none">
                  {count > 9 ? '9+' : count}
                </span>
              )}
            </button>

            {/* User dropdown */}
            <Dropdown
              label={
                <div className="flex items-center gap-2 cursor-pointer px-1">
                  <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 text-xs font-bold flex-shrink-0">
                    {initials}
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 leading-tight">{user?.name || 'Admin'}</p>
                    <p className="text-xs text-gray-400 leading-tight">Super Admin</p>
                  </div>
                  <HiChevronDown className="w-3.5 h-3.5 text-gray-400 hidden md:block" />
                </div>
              }
              inline
              arrowIcon={false}
            >
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-400">{user?.email}</p>
              </div>
              <DropdownItem onClick={toggleTheme}>
                {dark ? '☀️ Light Mode' : '🌙 Dark Mode'}
              </DropdownItem>
              <DropdownDivider />
              <DropdownItem icon={HiOutlineLogout} onClick={handleLogout}>
                Sign out
              </DropdownItem>
            </Dropdown>
          </div>
        </header>

        <main
          className="flex-1 p-4 md:p-5 page-enter"
          style={{ background: dark ? '#1e1613' : 'var(--main-bg)' }}
        >
          <Outlet />
        </main>
      </div>

      <NotificationDrawer isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
      <FloatingTutorial />
    </div>
  );
}
