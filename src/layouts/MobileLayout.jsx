import { useState, Fragment } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Dropdown, DropdownItem, DropdownDivider } from 'flowbite-react';
import {
  HiOutlineHome, HiOutlineViewGrid, HiOutlineShoppingBag,
  HiOutlineUser, HiOutlineBell, HiOutlineLogout,
  HiOutlineMenuAlt2, HiOutlineX, HiOutlineSun, HiOutlineMoon,
  HiChevronDown,
} from 'react-icons/hi';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useNotifications } from '@/hooks/useNotifications';
import NotificationDrawer from '@/components/NotificationDrawer';

const BRAND_LOGO = '/assets/dropshipping_nogatu_logo.png';

/* Navy sidebar color for Mobile Stockist portal */
const MOBILE_SIDEBAR_BG = '#0e1829';

const NAV_ITEMS = [
  { path: '/mobile/dashboard', label: 'Dashboard',    icon: HiOutlineHome },
  { path: '/mobile/catalog',   label: 'Product Catalog', icon: HiOutlineViewGrid },
  { path: '/mobile/orders',    label: 'My Orders',    icon: HiOutlineShoppingBag },
  { path: '/mobile/profile',   label: 'Profile',      icon: HiOutlineUser },
];

export default function MobileLayout() {
  const { user, logout } = useAuth();
  const { dark, toggle: toggleTheme } = useTheme();
  const { count } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifOpen, setNotifOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'M';

  const currentLabel = NAV_ITEMS.find((i) => location.pathname.startsWith(i.path))?.label || '';

  /* Navy dark palette */
  const darkVars = dark ? {
    '--dark-bg':     '#0f1623',
    '--dark-card':   '#162035',
    '--dark-card2':  '#1c2a45',
    '--dark-border': '#2d3f5a',
    '--dark-topbar': '#131d30',
    '--dark-text':   '#e8eef8',
    '--dark-muted':  '#7a90b0',
  } : {};

  return (
    <div
      className={`flex min-h-screen ${dark ? 'dark' : ''}`}
      style={{ background: dark ? '#0f1623' : '#f8faff', ...darkVars }}
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
        style={{ background: MOBILE_SIDEBAR_BG }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-white/10 flex-shrink-0">
          <img src={BRAND_LOGO} alt="Nogatu" className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
          <div className="overflow-hidden">
            <p className="text-white text-sm font-bold leading-none">NCDMS</p>
            <p className="text-white/40 text-xs mt-0.5">Mobile Stockist</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
              style={({ isActive }) =>
                isActive
                  ? { background: 'rgba(255,140,0,0.2)', color: '#FF8C00' }
                  : {}
              }
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t border-white/10 p-3 flex-shrink-0">
          <div className="flex items-center gap-2.5 px-1 mb-2">
            <div className="w-8 h-8 rounded-full bg-orange-500/20 border border-orange-400/30 flex items-center justify-center text-orange-200 text-xs font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-white text-xs font-semibold truncate">{user?.name || 'Mobile Stockist'}</p>
              <p className="text-white/40 text-xs">Mobile Stockist</p>
            </div>
          </div>
          <button onClick={handleLogout} className="sidebar-item w-full text-left">
            <HiOutlineLogout className="w-4 h-4 flex-shrink-0" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* ─── Main area ────────────────────────────────────────────────── */}
      <div className={`portal-main ${sidebarOpen ? '' : 'full-width'}`}>
        {/* Topbar */}
        <header
          className="portal-topbar"
          style={{
            borderColor: dark ? '#2d3f5a' : '#e5e7eb',
            background: dark ? '#131d30' : '#ffffff',
          }}
        >
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <HiOutlineX className="w-5 h-5" /> : <HiOutlineMenuAlt2 className="w-5 h-5" />}
          </button>

          <div className="flex-1 pl-2 hidden sm:block">
            <span className="text-sm text-gray-500 dark:text-gray-400">{currentLabel}</span>
          </div>

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
                  <div className="w-8 h-8 rounded-full bg-orange-100 border border-orange-300 flex items-center justify-center text-orange-700 text-xs font-bold flex-shrink-0">
                    {initials}
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 leading-tight">{user?.name || 'Mobile'}</p>
                    <p className="text-xs text-gray-400 leading-tight">Mobile Stockist</p>
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
          style={{ background: dark ? '#0f1623' : '#f8faff' }}
        >
          <Outlet />
        </main>
      </div>

      <NotificationDrawer isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
    </div>
  );
}
