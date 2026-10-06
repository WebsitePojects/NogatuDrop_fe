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

// How long after sign-in an unread count may still trigger the peek (the count loads asynchronously).
const LOGIN_PEEK_WINDOW_MS = 10000;

/**
 * Open/close state for a portal layout's notification drawer. Right after login the drawer opens by
 * itself — only when there is something unread — and closes after 5 seconds; any user open/close
 * cancels that auto-close. An empty "All caught up" drawer covering the first screen helps nobody.
 *
 * Consuming the flag, opening, and scheduling the close live in separate effects on purpose:
 * StrictMode runs mount effects twice, and a single effect would clear its own timer in the first
 * cleanup and then find the flag already gone, leaving the drawer stuck open over the page.
 *
 * @param {number} unreadCount the layout's unread notification count
 */
export default function useNotificationDrawer(unreadCount = 0) {
  const [isOpen, setIsOpen] = useState(false);
  const [peekPending, setPeekPending] = useState(false);
  const [isLoginPeek, setIsLoginPeek] = useState(false);

  useEffect(() => {
    if (consumeLoginPeekFlag()) setPeekPending(true);
  }, []);

  useEffect(() => {
    if (!peekPending) return undefined;
    const expire = setTimeout(() => setPeekPending(false), LOGIN_PEEK_WINDOW_MS);
    return () => clearTimeout(expire);
  }, [peekPending]);

  useEffect(() => {
    if (!peekPending || unreadCount <= 0) return;
    setPeekPending(false);
    setIsOpen(true);
    setIsLoginPeek(true);
  }, [peekPending, unreadCount]);

  useEffect(() => {
    if (!isLoginPeek) return undefined;
    const timer = setTimeout(() => {
      setIsOpen(false);
      setIsLoginPeek(false);
    }, LOGIN_PEEK_MS);
    return () => clearTimeout(timer);
  }, [isLoginPeek]);

  const setOpen = useCallback((open) => {
    setPeekPending(false);
    setIsLoginPeek(false);
    setIsOpen(open);
  }, []);

  return [isOpen, setOpen];
}
