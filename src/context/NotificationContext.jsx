import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '@/services/api';
import { NOTIFICATIONS } from '@/services/endpoints';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.get(NOTIFICATIONS.LIST);
      setNotifications(data.data || []);
    } catch {
      // silently fail
    }
  }, [user]);

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
      fetchNotifications();
      fetchCount();
      intervalRef.current = setInterval(fetchCount, 30000);
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
        markAllRead,
        refetch: fetchNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};

export default NotificationContext;
