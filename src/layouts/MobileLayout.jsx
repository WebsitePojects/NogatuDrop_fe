import { Outlet, NavLink } from 'react-router-dom';
import { HiOutlineHome, HiOutlineViewGrid, HiOutlineShoppingBag, HiOutlineUser } from 'react-icons/hi';
import { useAuth } from '@/context/AuthContext';

const BRAND_LOGO = '/assets/dropshipping_nogatu_logo.png';

const TAB_ITEMS = [
  { path: '/mobile/dashboard', label: 'Home',    icon: HiOutlineHome },
  { path: '/mobile/catalog',   label: 'Catalog', icon: HiOutlineViewGrid },
  { path: '/mobile/orders',    label: 'Orders',  icon: HiOutlineShoppingBag },
  { path: '/mobile/profile',   label: 'Profile', icon: HiOutlineUser },
];

export default function MobileLayout() {
  const { user } = useAuth();

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'M';

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--mobile-bg)' }}>
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 flex items-center justify-between" style={{ height: '56px' }}>
        <div className="flex items-center gap-2">
          <img src={BRAND_LOGO} alt="Nogatu" className="w-7 h-7 rounded-lg object-cover" />
          <span className="text-base font-bold" style={{ color: '#F59E0B' }}>Mobile</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 text-xs font-bold">
            {initials}
          </div>
          <span className="text-sm font-medium text-gray-700 hidden sm:block">{user?.name}</span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto page-enter" style={{ paddingBottom: '64px' }}>
        <Outlet />
      </main>

      {/* Bottom Tab Bar */}
      <nav className="mobile-tab-bar">
        {TAB_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `mobile-tab-item${isActive ? ' active' : ''}`}
          >
            <item.icon className="w-6 h-6" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
