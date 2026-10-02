import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

// Matches Tailwind's `lg` breakpoint, where the portal sidebar stops being an overlay drawer.
const DESKTOP_QUERY = '(min-width: 1024px)';
const isDesktop = () => typeof window !== 'undefined' && window.matchMedia(DESKTOP_QUERY).matches;

/**
 * Open/closed state of a portal sidebar. Desktop starts open; phones and tablets start closed because
 * there the sidebar covers the page, and it closes again after every navigation so the chosen page is
 * visible. Shared by MainLayout, StockistLayout and MobileLayout.
 */
export default function useResponsiveSidebar() {
  const [open, setOpen] = useState(isDesktop);
  const { pathname } = useLocation();

  useEffect(() => {
    if (!isDesktop()) setOpen(false);
  }, [pathname]);

  return [open, setOpen];
}
