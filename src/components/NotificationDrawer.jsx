import React, { useState } from 'react';
import { FiMapPin, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';
import { useNotifications } from '@/context/NotificationContext';

const NotificationDrawer = ({ isOpen, open, onClose }) => {
  const { notifications, markAsRead } = useNotifications();
  const [flashId, setFlashId] = useState(null);
  const visible = isOpen || open;

  const handleNotifClick = (notif) => {
    if (!notif.is_read) {
      markAsRead(notif.id);
    }
    setFlashId(notif.id);
    setTimeout(() => setFlashId(null), 600);
  };

  if (!visible) return null;

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
      <div className="fixed inset-0 z-40 bg-black/10 dark:bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="fixed right-4 sm:right-6 md:right-8 top-16 w-80 sm:w-96 max-h-[80vh] bg-white dark:bg-gray-800 shadow-2xl rounded-2xl z-50 flex flex-col border border-gray-100 dark:border-gray-700 overflow-hidden transform origin-top-right transition-all">
        
        {/* Title */}
        <div className="px-6 pt-6 pb-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-wide">NOTIFICATIONS</h2>
          <span className="bg-[#5D1A00] text-xs text-white px-2 py-0.5 rounded-full font-bold">
            {notifications.length}
          </span>
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400 dark:text-gray-500">
              <FiCheckCircle className="w-10 h-10 mb-3 opacity-20" />
              <span className="text-sm font-medium">All caught up!</span>
            </div>
          ) : (
            notifications.map((notif) => {
              const { icon, label, labelColor } = getStatusInfo(notif);
              const location = notif.location || notif.title || 'Unknown Location';
              const isFlashing = flashId === notif.id;
              return (
                <button
                  key={notif.id}
                  onClick={() => handleNotifClick(notif)}
                  className={[
                    'relative w-full text-left rounded-xl p-3 border border-transparent',
                    'transition-all duration-200 cursor-pointer',
                    'hover:shadow-md hover:-translate-y-0.5',
                    !notif.is_read ? 'bg-orange-50 dark:bg-gray-700 border-orange-100 dark:border-gray-600' : 'bg-gray-50 dark:bg-gray-800/50',
                    isFlashing ? 'bg-yellow-100 dark:bg-yellow-900/30' : ''
                  ].join(' ')}
                >
                  {/* Pulsing unread indicator */}
                  {!notif.is_read && (
                    <span className="absolute top-3 right-3 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
                    </span>
                  )}
                  {/* Location row */}
                  <div className="flex items-center gap-2 mb-1.5 pr-4">
                    <FiMapPin className="text-gray-700 dark:text-gray-300 text-sm flex-shrink-0" />
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{location}</span>
                  </div>
                  {/* Status row */}
                  <div className="flex items-center gap-2">
                    {icon}
                    <span className="text-xs font-semibold" style={{ color: labelColor }}>
                      {label}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={onClose}
            className="w-full py-2.5 text-white font-bold text-sm rounded-lg tracking-wider uppercase transition-colors hover:opacity-90"
            style={{ background: '#5D1A00' }}
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
};

export default NotificationDrawer;
