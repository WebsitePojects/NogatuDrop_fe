import { useState, Fragment } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Dropdown, DropdownItem, DropdownDivider, Tooltip } from 'flowbite-react';
import {
  HiOutlineHome,
  HiOutlineViewGrid,
  HiOutlineShoppingCart,
  HiOutlineClipboardList,
  HiOutlineTruck,
  HiOutlineUsers,
  HiOutlineCube,
  HiOutlineChartBar,
  HiOutlineBell,
  HiOutlineLogout,
  HiOutlineMenuAlt2,
  HiOutlineX,
  HiOutlineDocumentText,
  HiOutlineRefresh,
  HiOutlineSwitchHorizontal,
  HiOutlineSun,
  HiOutlineMoon,
  HiOutlineCog,
  HiOutlineArchive,
  HiOutlineShoppingBag,
  HiChevronDown,
  HiChevronRight,
} from 'react-icons/hi';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useNotifications } from '@/hooks/useNotifications';
import NotificationDrawer from '@/components/NotificationDrawer';
import FloatingTutorial from '@/components/FloatingTutorial';
import FloatingCartButton from '@/components/FloatingCartButton';

const BRAND_LOGO = '/assets/dropshipping_nogatu_logo.png';

// Nav structure for Stockist portal
// Each group has: label, items[]
// Each item: path, label, icon, roles (if undefined = all stockist roles can see)
function buildNavGroups(role) {
  const isStaff = role === 'staff';
  const isAdmin = role === 'admin'; // legacy — treat same as city
  const isCity = role === 'city_stockist' || isAdmin;
  const isProvincial = role === 'provincial_stockist';
  const isManager = isProvincial || isCity; // can manage things

  return [
    // ── Overview ──────────────────────────────────────────
    {
      label: null,
      items: [
        { path: '/stockist/dashboard', label: 'Dashboard', icon: HiOutlineHome },
      ],
    },

    // ── Selling ───────────────────────────────────────────
    {
      label: 'Selling',
      items: [
        { path: '/stockist/catalog',  label: 'Product Catalog', icon: HiOutlineViewGrid },
        ...(!isStaff ? [{ path: '/stockist/cart', label: 'Shopping Cart', icon: HiOutlineShoppingCart }] : []),
      ],
    },

    // ── Order Center (Phase 1) ───────────────────────────
    {
      label: 'Order Center',
      items: [
        { path: '/stockist/orders', label: 'Orders', icon: HiOutlineClipboardList },
        { path: '/stockist/orders/board', label: 'Kanban Orders', icon: HiOutlineClipboardList },
        { path: '/stockist/orders/payments', label: 'Payment Status', icon: HiOutlineShoppingBag },
        { path: '/stockist/orders/dispatch', label: 'Dispatch Readiness', icon: HiOutlineTruck },
      ],
    },

    // ── Delivery (Phase 1) ───────────────────────────────
    {
      label: 'Delivery',
      items: [
        { path: '/stockist/delivery/live', label: 'Live Deliveries Map', icon: HiOutlineTruck },
        { path: '/stockist/delivery/couriers', label: 'Courier Performance', icon: HiOutlineTruck },
        { path: '/stockist/delivery/pod', label: 'Delivery Proofs', icon: HiOutlineDocumentText },
      ],
    },

    // ── Inventory & Warehouse ─────────────────────────────
    {
      label: 'Inventory',
      items: [
        { path: '/stockist/inventory', label: 'Inventory', icon: HiOutlineCube },
        { path: '/stockist/grn', label: 'Goods Receipt (GRN)', icon: HiOutlineArchive },
        ...(isManager
          ? [
              { path: '/stockist/stock-transfers', label: 'Stock Transfers', icon: HiOutlineSwitchHorizontal },
              { path: '/stockist/purchase-orders', label: 'Purchase Orders', icon: HiOutlineDocumentText },
            ]
          : []),
      ],
    },

    // ── Network ───────────────────────────────────────────
    ...(isManager
      ? [
          {
            label: 'Mobile Stockists',
            items: [
              { path: '/stockist/mobile-stockists', label: 'Mobile Stockists', icon: HiOutlineUsers },
              { path: '/stockist/mobile-stockists/segments', label: 'Segments', icon: HiOutlineUsers },
              { path: '/stockist/mobile-stockists/activity', label: 'Activity and Last Login', icon: HiOutlineRefresh },
              { path: '/stockist/mobile-stockists/risk-signals', label: 'Risk Signals', icon: HiOutlineCog },
            ],
          },
          {
            label: 'Network',
            items: [
              { path: '/stockist/warehouses', label: 'My Warehouses', icon: HiOutlineHome },
            ],
          },
        ]
      : []),

    // ── Analytics ─────────────────────────────────────────
    {
      label: 'Analytics',
      items: [
        { path: '/stockist/reports', label: 'Reports', icon: HiOutlineChartBar },
      ],
    },

    // ── Management ────────────────────────────────────────
    ...(isManager
      ? [
          {
            label: 'Management',
            items: [
              { path: '/stockist/users', label: 'Users', icon: HiOutlineCog },
            ],
          },
        ]
      : []),
  ];
}

export default function StockistLayout() {
  const { user, logout } = useAuth();
  const { dark, toggle: toggleTheme } = useTheme();
  const { count } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifOpen, setNotifOpen] = useState(false);

  const role = user?.role_slug || 'city_stockist';
  const navGroups = buildNavGroups(role);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'S';

  const roleLabel = {
    provincial_stockist: 'Provincial Stockist',
    city_stockist:       'City Stockist',
    staff:               'Staff',
    admin:               'Stockist',
  }[role] || 'Stockist';

  /* Forest dark palette — complements green #0A2E0A sidebar */
  const darkVars = dark ? {
    '--dark-bg':     '#0e1a0e',
    '--dark-card':   '#162316',
    '--dark-card2':  '#1a2a1a',
    '--dark-border': '#2d4a2d',
    '--dark-topbar': '#111f11',
    '--dark-text':   '#e8f5e8',
    '--dark-muted':  '#7aaa7a',
  } : {};

  return (
    <div
      className={`flex min-h-screen ${dark ? 'dark' : ''}`}
      style={{ background: dark ? '#0e1a0e' : 'var(--stockist-bg)', ...darkVars }}
    >
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ─── Sidebar ─────────────────────────────────────────────── */}
      <aside
        className={`portal-sidebar ${sidebarOpen ? '' : 'collapsed'}`}
        style={{ background: 'var(--stockist-sidebar)' }}
      >
        {/* Logo row */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-white/10 flex-shrink-0">
          <img
            src={BRAND_LOGO}
            alt="Nogatu"
            className="w-9 h-9 rounded-xl object-cover flex-shrink-0"
          />
          <div className="overflow-hidden">
            <p className="text-white text-sm font-bold leading-none">NCDMS</p>
            <p className="text-white/40 text-xs mt-0.5">Stockist Portal</p>
          </div>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3">
          {navGroups.map((group, gi) => (
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
                      ? { background: 'rgba(255,255,255,0.15)', color: '#fff' }
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
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-200 text-xs font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-white text-xs font-semibold truncate">{user?.name || 'Stockist'}</p>
              <p className="text-white/40 text-xs">{roleLabel}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="sidebar-item w-full text-left">
            <HiOutlineLogout className="w-4 h-4 flex-shrink-0" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* ─── Main area ────────────────────────────────────────────── */}
      <div className={`portal-main ${sidebarOpen ? '' : 'full-width'}`}>
        {/* Top bar */}
        <header
          className="portal-topbar"
          style={{
            borderColor: dark ? '#2d4a2d' : 'var(--stockist-border)',
            background: dark ? '#111f11' : '#fff',
          }}
        >
          {/* Hamburger */}
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

          {/* Breadcrumb hint */}
          <div className="flex-1 pl-2 hidden sm:block">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {navGroups.flatMap(g => g.items).find(i => location.pathname.startsWith(i.path))?.label || ''}
            </span>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300"
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {dark ? <HiOutlineSun className="w-5 h-5" /> : <HiOutlineMoon className="w-5 h-5" />}
            </button>

            {/* Notifications */}
            <button
              onClick={() => setNotifOpen(true)}
              className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300"
            >
              <HiOutlineBell className="w-5 h-5" />
              {count > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center leading-none">
                  {count > 9 ? '9+' : count}
                </span>
              )}
            </button>

            {/* User menu */}
            <Dropdown
              label={
                <div className="flex items-center gap-2 cursor-pointer px-1">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 text-xs font-bold flex-shrink-0">
                    {initials}
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 leading-tight">{user?.name || 'Stockist'}</p>
                    <p className="text-xs text-gray-400 leading-tight">{roleLabel}</p>
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

        {/* Page content */}
        <main
          className="flex-1 p-4 md:p-5 page-enter"
          style={{ background: dark ? '#0e1a0e' : 'var(--stockist-bg)' }}
        >
          <Outlet />
        </main>
      </div>

      <NotificationDrawer isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
      <FloatingCartButton />
      <FloatingTutorial />
    </div>
  );
}
