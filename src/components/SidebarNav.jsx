import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { FiLogOut } from 'react-icons/fi';
import { useAuth } from '@/context/AuthContext';

const BRAND_LOGO = '/assets/dropshipping_nogatu_logo.png';

const SidebarNav = ({ theme = 'main', navItems = [] }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isMain = theme === 'main';
  const sidebarBg = isMain ? 'bg-[#4A1C00]' : 'bg-[#0B3D0B]';
  const hoverBg = isMain ? 'hover:bg-[#6B2D0E]' : 'hover:bg-[#1B6B1B]';
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside
      className={`${sidebarBg} w-64 min-h-screen flex flex-col text-white fixed left-0 top-0 bottom-0 z-40`}
    >
      <div className="p-4 flex items-center gap-3 border-b border-white/10">
        <img
          src={BRAND_LOGO}
          alt="Nogatu"
          className="w-12 h-12 rounded-xl object-cover border-2 border-white/60 shadow-[0_0_0_3px_rgba(255,255,255,0.2)]"
        />
        <div>
          <h1 className="font-bold text-base leading-tight">NCDMS</h1>
          <p className="text-[10px] text-white/60 tracking-wider">
            {isMain ? 'MAIN SYSTEM' : 'PARTNER PORTAL'}
          </p>
        </div>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-[#FF8C00] text-white shadow-lg'
                  : `text-white/80 ${hoverBg}`
              }`
            }
          >
            <item.icon className="text-lg flex-shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
            {user?.first_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="text-[10px] text-white/50 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-white/70 ${hoverBg} transition-colors`}
        >
          <FiLogOut />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default SidebarNav;
