import { createContext, useContext, useState, useLayoutEffect } from 'react';
import { useThemeMode } from 'flowbite-react';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const { setMode } = useThemeMode();
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('ncdms_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Synchronously remove 'dark' class during render on public routes to prevent flashing
  const isPublicRoute = ['/', '/login', '/shop', '/track'].some((path) =>
    window.location.pathname === path || window.location.pathname.startsWith(path + '/')
  ) || window.location.pathname.startsWith('/deliver/');

  if (isPublicRoute) {
    document.documentElement.classList.remove('dark');
  }

  useLayoutEffect(() => {
    const isPublicRoute = ['/', '/login', '/shop', '/track'].some((path) =>
      window.location.pathname === path || window.location.pathname.startsWith(path + '/')
    ) || window.location.pathname.startsWith('/deliver/');

    const root = document.documentElement;
    if (isPublicRoute) {
      root.classList.remove('dark');
      setMode('light');
    } else {
      if (dark) {
        root.classList.add('dark');
        setMode('dark');
      } else {
        root.classList.remove('dark');
        setMode('light');
      }
    }
    localStorage.setItem('ncdms_theme', dark ? 'dark' : 'light');
  }, [dark, setMode]);

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
