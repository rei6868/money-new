import { useCallback, useEffect, useState } from 'react';
import { FiRotateCcw, FiX } from 'react-icons/fi';

import styles from './InputActionIcon.module.css';

function ActionButton({ icon: Icon, label, isVisible, onClick, className, title, testId }) {
  return (
    <button
      type="button"
      className={`${styles.iconButton} ${className ?? ''}`}
      onClick={onClick}
      title={title}
      style={{ visibility: isVisible ? 'visible' : 'hidden', pointerEvents: isVisible ? 'auto' : 'none' }}
      data-testid={testId}
    >
      <Icon aria-hidden />
      <span className={styles.srOnly}>{label}</span>
    </button>
  );
}

export function InputClearAction({
  isVisible,
  onConfirm,
  confirmMessage = 'Clear this field?',
  label = 'Clear input',
  onCancel,
  shortcutKey = 'Escape',
  testId,
}) {
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = useCallback(() => {
    onConfirm();
    setIsConfirming(false);
  }, [onConfirm]);

  useEffect(() => {
    if (!isConfirming) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === shortcutKey) {
        event.preventDefault();
        handleConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleConfirm, isConfirming, shortcutKey]);

  const handleOpen = () => {
    setIsConfirming(true);
  };

  const handleCancel = () => {
    setIsConfirming(false);
    onCancel?.();
  };

  return (
    <span className={styles.wrapper}>
      <ActionButton
        icon={FiX}
        label={label}
        isVisible={isVisible}
        onClick={handleOpen}
        title={label}
        testId={testId}
      />
      {isConfirming ? (
        <div className={styles.confirmPopover} role="alertdialog" aria-modal="false">
          <p>{confirmMessage}</p>
          <div className={styles.confirmActions}>
            <button type="button" className={styles.secondaryButton} onClick={handleCancel}>
              Cancel
            </button>
            <button type="button" className={styles.primaryButton} onClick={handleConfirm}>
              Confirm
            </button>
          </div>
          <p className={styles.shortcutHint}>Press Esc to confirm instantly.</p>
        </div>
      ) : null}
    </span>
  );
}

export function InputRestoreAction({
  isVisible,
  onRestore,
  label = 'Restore input',
  title = 'Restore',
  testId,
}) {
  return (
    <span className={styles.wrapper}>
      <ActionButton
        icon={FiRotateCcw}
        label={label}
        isVisible={isVisible}
        onClick={onRestore}
        title={title}
        testId={testId}
      />
    </span>
  );
}

