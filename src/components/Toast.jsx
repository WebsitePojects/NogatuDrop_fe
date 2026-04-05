import { useState, useCallback, useEffect } from 'react';
import { Toast } from 'flowbite-react';
import {
  HiCheckCircle,
  HiXCircle,
  HiExclamationCircle,
  HiInformationCircle,
  HiX,
} from 'react-icons/hi';

let _toastId = 0;

const ICONS = {
  success: <HiCheckCircle className="text-green-500 w-5 h-5" />,
  error: <HiXCircle className="text-red-500 w-5 h-5" />,
  warning: <HiExclamationCircle className="text-amber-500 w-5 h-5" />,
  info: <HiInformationCircle className="text-blue-500 w-5 h-5" />,
};

const BG = {
  success: 'bg-white border-l-4 border-green-500',
  error: 'bg-white border-l-4 border-red-500',
  warning: 'bg-white border-l-4 border-amber-500',
  info: 'bg-white border-l-4 border-blue-500',
};

function ToastItem({ id, message, type, dismiss }) {
  useEffect(() => {
    const t = setTimeout(() => dismiss(id), 4000);
    return () => clearTimeout(t);
  }, [id, dismiss]);

  return (
    <div
      className={`flex items-start gap-3 shadow-lg rounded-lg px-4 py-3 min-w-[260px] max-w-[360px] ${BG[type] || BG.info}`}
      role="alert"
    >
      <span className="mt-0.5 flex-shrink-0">{ICONS[type] || ICONS.info}</span>
      <p className="flex-1 text-sm text-gray-800 leading-snug">{message}</p>
      <button
        onClick={() => dismiss(id)}
        className="ml-1 flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Dismiss"
      >
        <HiX className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, dismiss }) {
  if (!toasts.length) return null;
  return (
    <div className="toast-stack">
      {toasts.map((t) => (
        <ToastItem key={t.id} {...t} dismiss={dismiss} />
      ))}
    </div>
  );
}

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'info') => {
    const id = ++_toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  return { toasts, showToast, dismiss };
}

export default { ToastContainer, useToast };
