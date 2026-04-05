import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'flowbite-react';
import { HiExclamationCircle } from 'react-icons/hi';

export default function ConfirmModal({
  show,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmLabel = 'Confirm',
  confirmColor = 'failure',
  onConfirm,
  onClose,
  loading = false,
}) {
  return (
    <Modal show={show} onClose={onClose} size="sm" popup>
      <ModalHeader />
      <ModalBody>
        <div className="text-center">
          <HiExclamationCircle
            className={`mx-auto mb-4 w-14 h-14 ${
              confirmColor === 'failure' ? 'text-red-400' : 'text-amber-400'
            }`}
          />
          <h3 className="mb-2 text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500 mb-6">{message}</p>
          <div className="flex justify-center gap-3">
            <Button
              color={confirmColor}
              onClick={onConfirm}
              disabled={loading}
              isProcessing={loading}
            >
              {confirmLabel}
            </Button>
            <Button color="gray" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
          </div>
        </div>
      </ModalBody>
    </Modal>
  );
}
