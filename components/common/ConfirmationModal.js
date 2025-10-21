import { createPortal } from 'react-dom';
import { useEffect, useMemo, useRef } from 'react';

import styles from './ConfirmationModal.module.css';

export function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  confirmTone = 'primary',
}) {
  const cancelButtonRef = useRef(null);
  const confirmButtonRef = useRef(null);
  const previouslyFocusedRef = useRef(null);
  const titleId = useMemo(
    () => `confirmation-modal-title-${Math.random().toString(36).slice(2)}`,
    [],
  );
  const messageId = useMemo(
    () => `confirmation-modal-message-${Math.random().toString(36).slice(2)}`,
    [],
  );

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') {
      return undefined;
    }

    previouslyFocusedRef.current = document.activeElement;

    const preferredFocus = confirmTone === 'danger' ? confirmButtonRef.current : cancelButtonRef.current;
    (preferredFocus ?? confirmButtonRef.current ?? cancelButtonRef.current)?.focus({ preventScroll: true });

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel?.();
        return;
      }

      if (event.key === 'Tab') {
        const focusable = [cancelButtonRef.current, confirmButtonRef.current].filter(Boolean);
        if (focusable.length <= 1) {
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;

        if (event.shiftKey) {
          if (active === first || !focusable.includes(active)) {
            event.preventDefault();
            last.focus();
          }
        } else if (active === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      const previouslyFocused = previouslyFocusedRef.current;
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [confirmTone, isOpen, onCancel]);

  if (typeof document === 'undefined' || !isOpen) {
    return null;
  }

  const confirmClasses = [styles.confirmButton];
  if (confirmTone === 'danger') {
    confirmClasses.push(styles.confirmButtonDanger);
  } else {
    confirmClasses.push(styles.confirmButtonPrimary);
  }

  const dialogTitleId = title ? titleId : undefined;
  const dialogMessageId = message ? messageId : undefined;

  return createPortal(
    <div
      className={styles.overlay}
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onCancel?.();
        }
      }}
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogTitleId}
        aria-describedby={dialogMessageId}
        onClick={(event) => event.stopPropagation()}
      >
        {title ? (
          <h2 className={styles.title} id={dialogTitleId}>
            {title}
          </h2>
        ) : null}
        {message ? (
          <p className={styles.message} id={dialogMessageId}>
            {message}
          </p>
        ) : null}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onCancel}
            ref={cancelButtonRef}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={confirmClasses.join(' ')}
            onClick={onConfirm}
            ref={confirmButtonRef}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
