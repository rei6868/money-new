import React from 'react';

import styles from '../../styles/LoadingOverlay.module.css';

export type LoadingOverlayProps = {
  message?: string;
  className?: string;
};

export function LoadingOverlay({ message = 'Loading…', className }: LoadingOverlayProps) {
  const classNames = [styles.container, className].filter(Boolean).join(' ');

  return (
    <div className={classNames} role="status" aria-live="polite">
      <span className={styles.spinner} aria-hidden />
      {message ? <span className={styles.label}>{message}</span> : null}
    </div>
  );
}

export default LoadingOverlay;
