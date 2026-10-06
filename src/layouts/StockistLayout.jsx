import { Fragment } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Dropdown } from 'flowbite-react';
import {
  HiOutlineHome,
  HiOutlineViewGrid,
  HiOutlineClipboardList,
  HiOutlineUsers,
  HiOutlineCube,
  HiOutlineChartBar,
  HiOutlineBell,
  HiOutlineLogout,
  HiOutlineMenuAlt2,
  HiOutlineX,
  HiOutlineSun,
  HiOutlineMoon,
  HiOutlineCog,
  HiOutlineArchive,
  HiOutlineTruck,
  HiChevronDown,
} from 'react-icons/hi';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useNotifications } from '@/hooks/useNotifications';
import { PERMISSIONS, can, normalizeRoleSlug } from '@/utils/permissions';
import { isCenterStaff, centerStaffLabel } from '@/utils/partnerLevel';
import MobileTabBar from '@/components/MobileTabBar';
import NotificationDrawer from '@/components/NotificationDrawer';
import FloatingCartButton from '@/components/FloatingCartButton';
import useNotificationDrawer from '@/hooks/useNotificationDrawer';
import useResponsiveSidebar from '@/hooks/useResponsiveSidebar';

const BRAND_LOGO = '/assets/dropshipping_nogatu_logo.png';

// Nav structure for Stockist portal
// Each group has: label, items[]
// Each item: path, label, icon, roles (if undefined = all stockist roles can see)
function buildNavGroups(role, centerStaff) {
  const normalizedRole = normalizeRoleSlug(role);
  const isAdmin = role === 'admin'; // legacy — treat same as city
  const isCity = normalizedRole === 'city_stockist' || isAdmin;
  const isProvincial = normalizedRole === 'provincial_stockist';
  const isManager = isProvincial || isCity; // can manage things
  // Center staff fulfil orders; they never shop for stock or manage a team.
  const canUseCart = !centerStaff && can(normalizedRole, PERMISSIONS.CART_USE);

  // Lean stockist navigation (Wave 3 §1/§2.5). Hidden modules (live map, cycle
  // counts, stock transfers, purchase orders, warehouses, settlements) keep their
  // routes and stay on the Super Admin side; the shopping cart is reached from the
  // catalog and the floating cart button, not the sidebar.
  return [
    {
      label: null,
      items: [
        { path: '/stockist/dashboard', label: 'Dashboard', icon: HiOutlineHome },
      ],
    },

    {
      label: 'Orders',
      items: [
        ...(canUseCart ? [{ path: '/stockist/catalog', label: 'Order Products', icon: HiOutlineViewGrid }] : []),
        { path: '/stockist/orders', label: centerStaff ? 'Center Orders' : 'My Orders', icon: HiOutlineClipboardList },
        // Centers ship the store orders, so their staff follow riders on the road; Stockists see
        // their own incoming delivery on the order itself.
        ...(centerStaff ? [{ path: '/stockist/delivery/live', label: 'Live Deliveries', icon: HiOutlineTruck }] : []),
      ],
    },

    {
      label: 'Inventory',
      items: [
        { path: '/stockist/inventory', label: 'Inventory', icon: HiOutlineCube },
        // Kept until goods receipt is folded into "mark order received".
        { path: '/stockist/grn', label: 'Receive Goods', icon: HiOutlineArchive },
      ],
    },

    {
      label: 'Reports',
      items: [
        { path: '/stockist/reports', label: 'Sales Report', icon: HiOutlineChartBar },
      ],
    },

    {
      label: 'My Team',
      items: [
        ...(!centerStaff && isManager ? [{ path: '/stockist/users', label: 'Users', icon: HiOutlineCog }] : []),
        // Same permission as the route guard in App.jsx so a visible link never 403s.
        ...(!centerStaff && can(normalizedRole, PERMISSIONS.MOBILE_STOCKISTS_MANAGE)
          ? [{ path: '/stockist/mobile-stockists', label: 'Mobile Stockists', icon: HiOutlineUsers }]
          : []),
      ],
    },
  ].filter((group) => Array.isArray(group.items) && group.items.length > 0);
}

// Phone tab bar: the first four of these that the user's menu actually has, with short labels.
const TAB_PATHS = ['/stockist/dashboard', '/stockist/catalog', '/stockist/orders', '/stockist/delivery/live', '/stockist/inventory', '/stockist/grn', '/stockist/reports'];
const TAB_LABELS = {
  '/stockist/dashboard': 'Home',
  '/stockist/catalog': 'Order',
  '/stockist/orders': 'Orders',
  '/stockist/delivery/live': 'Live',
  '/stockist/inventory': 'Stock',
  '/stockist/grn': 'Receive',
  '/stockist/reports': 'Sales',
};
function buildTabItems(navGroups) {
  const byPath = new Map(navGroups.flatMap((g) => g.items).map((item) => [item.path, item]));
  return TAB_PATHS.filter((p) => byPath.has(p)).slice(0, 4).map((p) => ({ ...byPath.get(p), label: TAB_LABELS[p] }));
}

export default function StockistLayout() {
  const { user, logout } = useAuth();
  const { dark, toggle: toggleTheme } = useTheme();
  const { count } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useResponsiveSidebar();
  const [notifOpen, setNotifOpen] = useNotificationDrawer(count);

  const role = normalizeRoleSlug(user?.role_slug || 'city_stockist');
  const centerStaff = isCenterStaff(user);
  const navGroups = buildNavGroups(role, centerStaff);
  const tabItems = buildTabItems(navGroups);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'S';

  const roleLabel = centerStaff
    ? centerStaffLabel(user)
    : {
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
      style={{ background: dark ? 'var(--dark-bg)' : 'var(--stockist-bg)', ...darkVars }}
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
            <p className="text-white/65 text-xs mt-0.5">Stockist Portal</p>
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
              <p className="text-white/65 text-xs">{roleLabel}</p>
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
            borderColor: dark ? 'var(--dark-border)' : 'var(--stockist-border)',
            background: dark ? 'var(--dark-topbar)' : '#fff',
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
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {navGroups.flatMap(g => g.items).find(i => location.pathname.startsWith(i.path))?.label
                || (location.pathname.startsWith('/stockist/cart') ? 'Shopping Cart' : '')}
            </span>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300"
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {dark ? <HiOutlineSun className="w-5 h-5" /> : <HiOutlineMoon className="w-5 h-5" />}
            </button>

            {/* Notifications */}
            <button
              onClick={() => setNotifOpen(true)}
              aria-label={count > 0 ? `Notifications, ${count} unread` : 'Notifications'}
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
                    <p className="text-xs text-gray-600 dark:text-[var(--dark-muted)] leading-tight">{roleLabel}</p>
                  </div>
                  <HiChevronDown className="w-3.5 h-3.5 text-gray-600 dark:text-[var(--dark-muted)] hidden md:block" />
                </div>
              }
              inline
              arrowIcon={false}
            >
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-600">{user?.email}</p>
              </div>
            </Dropdown>
          </div>
        </header>

        {/* Page content */}
        <main
          className="flex-1 p-4 md:p-5 page-enter"
          style={{ background: dark ? 'var(--dark-bg)' : 'var(--stockist-bg)' }}
        >
          <Outlet />
        </main>
        <MobileTabBar items={tabItems} onMenu={() => setSidebarOpen(true)} tone="green" />
      </div>

      <NotificationDrawer isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
      <FloatingCartButton />
    </div>
  );
}
