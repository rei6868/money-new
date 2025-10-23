import PropTypes from 'prop-types';

import styles from './ConfirmDialog.module.css';

function classNames(...values) {
  return values.filter(Boolean).join(' ');
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  tone = 'primary',
  confirmButtonProps,
  cancelButtonProps,
  className,
  overlayClassName,
  children,
  footer,
  ariaLabel,
}) {
  if (!isOpen) {
    return null;
  }

  const overlayClasses = classNames(styles.overlay, overlayClassName);
  const modalClasses = classNames(styles.modal, className);
  const { className: cancelClassName, ...restCancelProps } = cancelButtonProps ?? {};
  const { className: confirmClassName, ...restConfirmProps } = confirmButtonProps ?? {};

  const confirmToneClass =
    tone === 'danger' ? styles.confirmButtonDanger : styles.confirmButtonPrimary;
  const confirmClasses = classNames(styles.confirmButton, confirmToneClass, confirmClassName);
  const cancelClasses = classNames(styles.cancelButton, cancelClassName);

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget) {
      onCancel?.(event);
    }
  };

  return (
    <div className={overlayClasses} role="presentation" onClick={handleOverlayClick}>
      <div
        className={modalClasses}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? title ?? 'Confirmation dialog'}
        onClick={(event) => event.stopPropagation()}
      >
        {title ? <h2 className={styles.title}>{title}</h2> : null}
        {message ? <p className={styles.message}>{message}</p> : null}
        {children}
        <div className={styles.actions}>
          <button
            type="button"
            className={cancelClasses}
            onClick={onCancel}
            {...restCancelProps}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={confirmClasses}
            onClick={onConfirm}
            {...restConfirmProps}
          >
            {confirmLabel}
          </button>
        </div>
        {footer}
      </div>
    </div>
  );
}

ConfirmDialog.propTypes = {
  isOpen: PropTypes.bool,
  title: PropTypes.node,
  message: PropTypes.node,
  confirmLabel: PropTypes.node,
  cancelLabel: PropTypes.node,
  onConfirm: PropTypes.func,
  onCancel: PropTypes.func,
  tone: PropTypes.oneOf(['primary', 'danger']),
  confirmButtonProps: PropTypes.object,
  cancelButtonProps: PropTypes.object,
  className: PropTypes.string,
  overlayClassName: PropTypes.string,
  children: PropTypes.node,
  footer: PropTypes.node,
  ariaLabel: PropTypes.string,
};
