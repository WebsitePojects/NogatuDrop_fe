import { createContext, useContext, useState, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useThemeMode } from 'flowbite-react';

const ThemeContext = createContext(null);

// Dark mode is a setting of the logged-in portals only. Every other page (landing, login, shop,
// tracking, delivery, and any influencer link such as /kawoodee) is always light. Listing the
// portals instead of the public pages means a new public route can never inherit dark mode by
// accident; before this, /kawoodee picked up a visitor's dark preference and its labels vanished.
const PORTAL_PREFIXES = ['/main', '/stockist', '/mobile', '/dashboard', '/partner'];

export const isPortalPath = (pathname) =>
  PORTAL_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

export const ThemeProvider = ({ children }) => {
  const { setMode } = useThemeMode();
  const { pathname } = useLocation();
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('ncdms_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const darkApplies = dark && isPortalPath(pathname);

  // Remove the class during render as well, so a public page never paints one dark frame.
  if (!darkApplies) {
    document.documentElement.classList.remove('dark');
  }

  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', darkApplies);
    setMode(darkApplies ? 'dark' : 'light');
  }, [darkApplies, setMode]);

  useLayoutEffect(() => {
    localStorage.setItem('ncdms_theme', dark ? 'dark' : 'light');
  }, [dark]);

  const toggle = () => setDark((d) => !d);

  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
