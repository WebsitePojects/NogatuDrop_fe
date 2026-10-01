import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '@/services/api';
import { NOTIFICATIONS } from '@/services/endpoints';
import { useAuth } from './AuthContext';
import { ToastContainer } from '@/components/NotificationToast';
import { getNotificationLabel, getNotificationToastType } from '@/utils/notificationMeta';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState([]);
  const intervalRef = useRef(null);
  const notifiedIdsRef = useRef(new Set());
  const isInitialLoadRef = useRef(true);

  const addToast = useCallback((toast) => {
    const id = toast.id || `t-${Date.now()}-${Math.random()}`;
    const entry = { id, duration: 5000, ...toast };
    setToasts((prev) => [entry, ...prev].slice(0, 5)); // Keep max 5 visible toasts
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.get(NOTIFICATIONS.LIST);
      const fetched = data.data || [];
      setNotifications(fetched);

      if (isInitialLoadRef.current) {
        // First load: record existing IDs so we don't toast backlog. The board is
        // NOT auto-opened here — doing so interrupted every page refresh. The
        // post-login popup is driven only by the `nogatu_show_notifications`
        // sessionStorage flag set in Login.jsx and read by each layout; the bell
        // badge carries the unread count on ordinary page loads.
        fetched.forEach((n) => notifiedIdsRef.current.add(n.id));
        isInitialLoadRef.current = false;
      } else {
        // Subsequent polling: trigger toast for previously unseen, unread notifications
        const newNotifs = fetched.filter((n) => !notifiedIdsRef.current.has(n.id) && !n.is_read);
        newNotifs.sort((a, b) => new Date(a.created_at || a.createdAt || 0) - new Date(b.created_at || b.createdAt || 0)); // Ascending so latest is toasted last (top)

        newNotifs.forEach((n) => {
          addToast({
            title: n.title || n.location || 'New Notification',
            message: n.message || n.subtitle || n.body || '',
            label: getNotificationLabel(n),
            type: getNotificationToastType(n),
            notificationId: n.id,
          });
          notifiedIdsRef.current.add(n.id);
        });
      }
    } catch {
      // silently fail
    }
  }, [user, addToast]);

  const triggerLatestToast = useCallback((opts = {}) => {
    if (!notifications || notifications.length === 0) return null;
    // prefer unread low-stock/no-stock, else unread latest, else latest
    const byDate = [...notifications].sort((a, b) => {
      const ta = new Date(a.created_at || a.createdAt || 0).getTime() || a.id;
      const tb = new Date(b.created_at || b.createdAt || 0).getTime() || b.id;
      return tb - ta;
    });

    let candidate = byDate.find((n) => !n.is_read && (n.type === 'no_stock' || n.type === 'low_stock'));
    if (!candidate) candidate = byDate.find((n) => !n.is_read) || byDate[0];

    if (candidate) {
      addToast({
        title: candidate.title || candidate.location || 'Notification',
        message: candidate.message || candidate.subtitle || candidate.body || '',
        label: getNotificationLabel(candidate),
        type: getNotificationToastType(candidate),
        notificationId: candidate.id,
        ...opts,
      });
    }
  }, [notifications, addToast]);

  const fetchCount = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.get(NOTIFICATIONS.COUNT);
      setUnreadCount(data.data?.unread_count || 0);
    } catch {
      // silently fail
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      isInitialLoadRef.current = true;
      notifiedIdsRef.current.clear();
      fetchNotifications();
      fetchCount();
      intervalRef.current = setInterval(() => {
        fetchNotifications();
        fetchCount();
      }, 30000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user, fetchNotifications, fetchCount]);

  const markAsRead = async (notificationId) => {
    try {
      await api.patch(NOTIFICATIONS.MARK_READ(notificationId));
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // silently fail
    }
  };

  const markAsUnread = async (notificationId) => {
    let increment = 0;
    setNotifications((prev) =>
      prev.map((n) => {
        if (n.id !== notificationId) return n;
        if (n.is_read) increment = 1;
        return { ...n, is_read: false };
      })
    );
    if (increment) {
      setUnreadCount((prev) => prev + 1);
    }
  };

  const markAllRead = async () => {
    try {
      await api.patch(NOTIFICATIONS.MARK_ALL_READ);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // silently fail
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        count: unreadCount, // alias used by new layouts
        markAsRead,
        markAsUnread,
        markAllRead,
        refetch: fetchNotifications,
        // toast helpers
        addToast,
        removeToast,
        triggerLatestToast,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};

export default NotificationContext;
