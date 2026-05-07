import React, { useEffect } from 'react';
import { FiX, FiAlertCircle, FiCheckCircle, FiInfo } from 'react-icons/fi';

const Toast = ({ toast, onClose }) => {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => onClose(toast.id), toast.duration || 5000);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;

  const typeConfig = {
    no_stock: {
      color: 'text-red-600 dark:text-red-400',
      bgIcon: 'bg-red-100/50 dark:bg-red-500/20',
      icon: <FiAlertCircle className="w-5 h-5" />,
      border: 'border-red-200/50 dark:border-red-800/50'
    },
    replenished: {
      color: 'text-green-600 dark:text-green-400',
      bgIcon: 'bg-green-100/50 dark:bg-green-500/20',
      icon: <FiCheckCircle className="w-5 h-5" />,
      border: 'border-green-200/50 dark:border-green-800/50'
    },
    low_stock: {
      color: 'text-orange-500 dark:text-orange-400',
      bgIcon: 'bg-orange-100/50 dark:bg-orange-500/20',
      icon: <FiAlertCircle className="w-5 h-5" />,
      border: 'border-orange-200/50 dark:border-orange-800/50'
    },
    default: {
      color: 'text-blue-600 dark:text-blue-400',
      bgIcon: 'bg-blue-100/50 dark:bg-blue-500/20',
      icon: <FiInfo className="w-5 h-5" />,
      border: 'border-white/40 dark:border-gray-700/50'
    },
  };

  const config = typeConfig[toast.type] || typeConfig.default;

  return (
    <div
      className={`relative w-80 mb-3 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] cursor-pointer transition-all duration-300 ease-out transform hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.16)] flex p-4 bg-white/70 dark:bg-gray-900/80 border ${config.border} overflow-hidden group animate-in slide-in-from-right-4 fade-in`}
      role="status"
      onClick={() => onClose(toast.id)}
      style={{
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {/* Decorative gradient blur in background */}
      <div className="absolute -top-10 -right-10 w-24 h-24 bg-white/20 rounded-full blur-2xl pointer-events-none"></div>

      <div className="flex gap-4 items-start relative z-10 w-full">
        {/* Icon */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${config.bgIcon} ${config.color}`}>
          {config.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex justify-between items-start gap-2 mb-1">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">
              {toast.title}
            </h4>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${config.color} whitespace-nowrap`}>
              {toast.label}
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-300 leading-snug line-clamp-2">
            {toast.message}
          </p>
        </div>

        {/* Close Button */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onClose(toast.id);
          }}
          className="absolute top-0 right-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <FiX className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export const ToastContainer = ({ toasts = [], removeToast }) => {
  return (
    <div className="fixed right-4 top-20 z-[9999] flex flex-col items-end pointer-events-none gap-2">
      <div className="w-full max-w-xs pointer-events-auto">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onClose={removeToast} />
        ))}
      </div>
    </div>
  );
};

export default Toast;
