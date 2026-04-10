import React from 'react';
import { Modal as AnimatedModal, ModalHeader, ModalBody } from '@/components/AnimatedModal';

const SIZE_MAP = {
  'max-w-sm': 'sm',
  'max-w-md': 'md',
  'max-w-lg': 'lg',
  'max-w-xl': 'xl',
  'max-w-2xl': '2xl',
  'max-w-3xl': '4xl',
  'max-w-4xl': '5xl',
};

const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) => {
  return (
    <AnimatedModal
      show={isOpen}
      onClose={onClose}
      dismissible
      size={SIZE_MAP[maxWidth] || 'lg'}
      backdropClasses="bg-gray-500/45 backdrop-blur-sm"
    >
      {title ? <ModalHeader>{title}</ModalHeader> : null}
      <ModalBody className="max-h-[75vh] overflow-y-auto p-6">{children}</ModalBody>
    </AnimatedModal>
  );
};

export default Modal;
