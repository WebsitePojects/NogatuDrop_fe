import { useEffect, useMemo, useState } from 'react';
import {
  Modal as FlowbiteModal,
  ModalHeader as FlowbiteModalHeader,
  ModalBody as FlowbiteModalBody,
  ModalFooter as FlowbiteModalFooter,
} from 'flowbite-react';

const EXIT_DURATION_MS = 180;

const cx = (...classes) => classes.filter(Boolean).join(' ');

function AnimatedModal({
  show,
  isOpen,
  onClose,
  dismissible = true,
  backdropClasses,
  theme,
  children,
  ...rest
}) {
  const isShown = typeof show === 'boolean' ? show : Boolean(isOpen);
  const [isMounted, setIsMounted] = useState(isShown);
  const [isVisible, setIsVisible] = useState(isShown);

  useEffect(() => {
    let timeoutId;

    if (isShown) {
      setIsMounted(true);
      const rafId = requestAnimationFrame(() => setIsVisible(true));
      return () => cancelAnimationFrame(rafId);
    }

    setIsVisible(false);
    timeoutId = setTimeout(() => setIsMounted(false), EXIT_DURATION_MS);
    return () => clearTimeout(timeoutId);
  }, [isShown]);

  const mergedTheme = useMemo(
    () => ({
      ...theme,
      root: {
        ...(theme?.root || {}),
        show: {
          ...(theme?.root?.show || {}),
          on: cx(
            'flex bg-gray-500/45 backdrop-blur-sm transition-opacity duration-200 ease-out',
            isVisible ? 'opacity-100' : 'opacity-0',
            backdropClasses,
            theme?.root?.show?.on
          ),
          off: theme?.root?.show?.off || 'hidden',
        },
      },
      content: {
        ...(theme?.content || {}),
        inner: cx(
          'relative flex max-h-[90dvh] flex-col rounded-2xl bg-white shadow-modal ng-modal-force-light transition-all duration-200 ease-out',
          isVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-95 opacity-0',
          theme?.content?.inner
        ),
      },
    }),
    [backdropClasses, isVisible, theme]
  );

  if (!isMounted) return null;

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  return (
    <FlowbiteModal
      show={isMounted}
      onClose={handleClose}
      dismissible={dismissible}
      theme={mergedTheme}
      {...rest}
    >
      {children}
    </FlowbiteModal>
  );
}

export const Modal = AnimatedModal;
export const ModalHeader = FlowbiteModalHeader;
export const ModalBody = FlowbiteModalBody;
export const ModalFooter = FlowbiteModalFooter;

export default AnimatedModal;
