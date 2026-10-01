import { useCallback, useEffect, useState } from 'react';

// Set by Login.jsx after a successful sign-in; consumed once by whichever portal layout mounts.
const LOGIN_PEEK_FLAG = 'nogatu_show_notifications';
const LOGIN_PEEK_MS = 5000;

function consumeLoginPeekFlag() {
  try {
    if (sessionStorage.getItem(LOGIN_PEEK_FLAG) !== '1') return false;
    sessionStorage.removeItem(LOGIN_PEEK_FLAG);
    return true;
  } catch {
    return false; // storage blocked: skip the peek rather than crash the layout
  }
}

/**
 * Open/close state for a portal layout's notification drawer. Right after login the drawer
 * opens by itself and closes after 5 seconds; any user open/close cancels that auto-close.
 *
 * Consuming the flag and scheduling the close live in separate effects on purpose: StrictMode
 * runs mount effects twice, and a single effect would clear its own timer in the first cleanup
 * and then find the flag already gone, leaving the drawer stuck open over the page.
 */
export default function useNotificationDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoginPeek, setIsLoginPeek] = useState(false);

  useEffect(() => {
    if (!consumeLoginPeekFlag()) return;
    setIsOpen(true);
    setIsLoginPeek(true);
  }, []);

  useEffect(() => {
    if (!isLoginPeek) return undefined;
    const timer = setTimeout(() => {
      setIsOpen(false);
      setIsLoginPeek(false);
    }, LOGIN_PEEK_MS);
    return () => clearTimeout(timer);
  }, [isLoginPeek]);

  const setOpen = useCallback((open) => {
    setIsLoginPeek(false);
    setIsOpen(open);
  }, []);

  return [isOpen, setOpen];
}
