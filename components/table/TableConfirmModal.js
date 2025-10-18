import { createPortal } from 'react-dom';
import { useEffect } from 'react';

import { useIsMounted } from './tableUtils';

export function TableConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  className = 'table-confirm-modal',
  contentClassName = 'table-confirm-content',
  actionsClassName = 'table-confirm-actions',
  cancelButtonClassName = 'table-confirm-cancel',
  confirmButtonClassName = 'table-confirm-submit',
  cancelButtonProps = {},
  confirmButtonProps = {},
}) {
  const isMounted = useIsMounted();

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isMounted || !isOpen) {
    return null;
  }

  return createPortal(
    <div className={className} role="dialog" aria-modal="true">
      <div className={contentClassName}>
        {title ? <h2>{title}</h2> : null}
        {message ? <p>{message}</p> : null}
        <div className={actionsClassName}>
          <button
            type="button"
            onClick={onCancel}
            className={cancelButtonClassName}
            {...cancelButtonProps}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={confirmButtonClassName}
            {...confirmButtonProps}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
