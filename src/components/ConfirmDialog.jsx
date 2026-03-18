import React from 'react';
import { FiAlertTriangle } from 'react-icons/fi';

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
}) => {
  if (!isOpen) return null;

  const confirmColors =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 text-white'
      : 'bg-main-sidebar hover:bg-main-accent text-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-6 z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <FiAlertTriangle className="text-red-600 text-xl" />
          </div>
          <h3 className="text-lg font-bold text-gray-800">{title}</h3>
        </div>
        <p className="text-sm text-gray-600 mb-6 ml-[52px]">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${confirmColors} disabled:opacity-50`}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
