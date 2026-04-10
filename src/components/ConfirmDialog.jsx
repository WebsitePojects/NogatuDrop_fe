import React from 'react';
import { FiAlertTriangle } from 'react-icons/fi';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/AnimatedModal';

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
  const confirmColors =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 text-white'
      : 'bg-main-sidebar hover:bg-main-accent text-white';

  return (
    <Modal
      show={isOpen}
      onClose={onClose}
      dismissible
      size="sm"
      backdropClasses="bg-gray-500/45 backdrop-blur-sm"
    >
      <ModalHeader>{title}</ModalHeader>
      <ModalBody>
        <div className="flex items-start gap-3">
          <div className="mt-0.5 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <FiAlertTriangle className="text-red-600 text-xl" aria-hidden="true" />
          </div>
          <p className="text-sm text-gray-600">{message}</p>
        </div>
      </ModalBody>
      <ModalFooter>
        <div className="flex w-full justify-end gap-3">
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
      </ModalFooter>
    </Modal>
  );
};

export default ConfirmDialog;
