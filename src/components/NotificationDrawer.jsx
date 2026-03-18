import React from 'react';
import { FiMapPin, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';
import { useNotifications } from '@/context/NotificationContext';

const NotificationDrawer = ({ isOpen, onClose }) => {
  const { notifications, markAsRead } = useNotifications();

  if (!isOpen) return null;

  const getStatusInfo = (notif) => {
    const type = notif.type;
    if (type === 'no_stock') {
      return {
        icon: <FiAlertTriangle className="text-red-500 text-base" />,
        label: 'No stocks',
        labelColor: '#dc2626',
      };
    }
    if (type === 'replenished' || type === 'stock_replenished') {
      return {
        icon: <FiCheckCircle className="text-green-600 text-base" />,
        label: 'Stock Replenished',
        labelColor: '#16a34a',
      };
    }
    // Default: low_stock
    return {
      icon: <FiAlertTriangle className="text-yellow-500 text-base" />,
      label: 'Low Stock, Needs Replenishment',
      labelColor: '#FF8C00',
    };
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-[420px] bg-white shadow-2xl z-50 flex flex-col">
        {/* Title */}
        <div className="px-6 pt-8 pb-4">
          <h2 className="text-3xl font-black text-gray-900 tracking-wide">NOTIFICATIONS</h2>
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
              No notifications
            </div>
          ) : (
            notifications.map((notif) => {
              const { icon, label, labelColor } = getStatusInfo(notif);
              const location = notif.location || notif.title || 'Unknown Location';
              return (
                <div
                  key={notif.id}
                  onClick={() => !notif.is_read && markAsRead(notif.id)}
                  className="bg-gray-100 rounded-xl px-4 py-4 cursor-pointer hover:bg-gray-150 transition-colors"
                >
                  {/* Location row */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <FiMapPin className="text-gray-700 text-base flex-shrink-0" />
                    <span className="text-sm font-bold text-gray-800">{location}</span>
                  </div>
                  {/* Status row */}
                  <div className="flex items-center gap-2">
                    {icon}
                    <span className="text-sm font-medium" style={{ color: labelColor }}>
                      {label}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Close Button */}
        <div className="p-4">
          <button
            onClick={onClose}
            className="w-full py-4 text-white font-bold text-sm rounded-xl tracking-widest uppercase"
            style={{ background: '#5D1A00' }}
          >
            CLOSE
          </button>
        </div>
      </div>
    </>
  );
};

export default NotificationDrawer;
