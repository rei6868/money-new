import React, { ReactNode } from 'react';
import styles from './ModalWrapper.module.css';

export type ModalWrapperProps = {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when overlay is clicked (for close on backdrop click) */
  onBackdropClick?: () => void;
  /** Modal content */
  children: ReactNode;
  /** Optional CSS class for wrapper */
  wrapperClassName?: string;
  /** Optional CSS class for backdrop */
  backdropClassName?: string;
  /** Optional CSS class for panel */
  panelClassName?: string;
  /** Z-index level: 'standard' (70/80) or 'top' (90) for critical modals */
  zIndexLevel?: 'standard' | 'top';
  /** Whether to show backdrop blur effect */
  showBlur?: boolean;
  /** Whether clicking backdrop closes modal */
  closeOnBackdropClick?: boolean;
};

/**
 * Unified Modal Wrapper Component
 * 
 * Standardizes all modal overlays with consistent z-index, pointer-events, and styling.
 * 
 * Z-Index Levels:
 * - standard: overlay=70, modal=80 (default for most modals)
 * - top: overlay=85, modal=90 (for critical confirmations)
 * 
 * Usage:
 * ```tsx
 * <ModalWrapper isOpen={isOpen} onBackdropClick={handleClose}>
 *   <div>Modal content here</div>
 * </ModalWrapper>
 * ```
 */
export function ModalWrapper({
  isOpen,
  onBackdropClick,
  children,
  wrapperClassName,
  backdropClassName,
  panelClassName,
  zIndexLevel = 'standard',
  showBlur = true,
  closeOnBackdropClick = true,
}: ModalWrapperProps) {
  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if clicking directly on backdrop, not on modal content
    if (e.target === e.currentTarget && closeOnBackdropClick && onBackdropClick) {
      onBackdropClick();
    }
  };

  const zIndexClass = zIndexLevel === 'top' ? styles.topLevel : styles.standardLevel;
  const blurClass = showBlur ? styles.withBlur : '';

  return (
    <div
      className={`${styles.root} ${zIndexClass} ${wrapperClassName || ''}`.trim()}
      role="presentation"
    >
      {/* Backdrop */}
      <div
        className={`${styles.backdrop} ${blurClass} ${backdropClassName || ''}`.trim()}
        onClick={handleBackdropClick}
        role="presentation"
        aria-hidden="true"
      />

      {/* Modal Panel Container */}
      <div className={styles.panelContainer}>
        <div
          className={`${styles.panel} ${panelClassName || ''}`.trim()}
          role="dialog"
          aria-modal="true"
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export default ModalWrapper;

