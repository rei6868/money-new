import { useEffect } from 'react';
import { FiXCircle } from 'react-icons/fi';

import { formatAmountWithTrailing } from '../../lib/numberFormat';
import styles from '../../styles/TransactionsHistory.module.css';

export function TransactionAdvancedModal({ panelData, onClose }) {
  const mode = panelData?.mode ?? null;
  const transaction = panelData?.transaction ?? null;
  const transactionId = transaction?.id ?? '';
  const isCreateMode = mode === 'create';
  const isDeleteMode = mode === 'delete';

  useEffect(() => {
    if (!panelData) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [panelData, onClose]);

  if (!panelData) {
    return null;
  }

  const modalTitle =
    mode === 'create'
      ? 'Quick Create Transaction'
      : mode === 'edit'
      ? `Edit ${transactionId}`
      : mode === 'delete'
      ? `Delete ${transactionId}`
      : `Advanced options for ${transactionId}`;

  return (
    <div
      className={styles.advancedOverlay}
      data-testid="transactions-advanced-modal"
      role="dialog"
      aria-modal="true"
    >
      <div className={styles.advancedPanel}>
        <div className={styles.advancedHeader}>
          <h3 className={styles.advancedTitle}>{modalTitle}</h3>
          <button
            type="button"
            className={styles.iconButton}
            onClick={onClose}
            data-testid="transactions-advanced-close"
            aria-label="Close advanced options"
          >
            <FiXCircle aria-hidden />
          </button>
        </div>

        {isCreateMode ? (
          <div className={styles.modalBody}>
            <div className={styles.modalField}>
              <p className={styles.modalLabel}>Status</p>
              <p className={styles.advancedValue}>
                Use this space to configure quick entry templates. Builder is coming soon.
              </p>
            </div>
            <div className={styles.modalField}>
              <p className={styles.modalLabel}>Next step</p>
              <p className={styles.advancedValue}>
                Connect to your preferred batch input to populate a draft transaction with preset
                Cashback and Debt parameters.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className={styles.modalBody}>
              <div className={styles.advancedSection}>
                <span className={styles.advancedLabel}>Owner</span>
                <span className={styles.advancedValue}>{transaction?.owner ?? 'Unassigned'}</span>
              </div>
              <div className={styles.advancedSection}>
                <span className={styles.advancedLabel}>Account</span>
                <span className={styles.advancedValue}>{transaction?.account ?? 'Not available'}</span>
              </div>
              <div className={styles.advancedSection}>
                <span className={styles.advancedLabel}>Notes</span>
                <span className={styles.advancedValue}>{transaction?.notes ?? '—'}</span>
              </div>
            </div>

            <div className={styles.metricsGrid}>
              <div className={styles.metricTile}>
                <span className={styles.metricLabel}>Amount</span>
                <span className={styles.metricValue}>
                  {formatAmountWithTrailing(transaction?.amount)}
                </span>
              </div>
              <div className={styles.metricTile}>
                <span className={styles.metricLabel}>Total Back</span>
                <span className={styles.metricValue}>
                  {formatAmountWithTrailing(transaction?.totalBack)}
                </span>
              </div>
              <div className={styles.metricTile}>
                <span className={styles.metricLabel}>Final Price</span>
                <span className={styles.metricValue}>
                  {formatAmountWithTrailing(transaction?.finalPrice)}
                </span>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={onClose}
                data-testid="transactions-advanced-dismiss"
              >
                Close
              </button>
              {isDeleteMode ? (
                <button
                  type="button"
                  className={`${styles.primaryButton} ${styles.wrap}`}
                  data-testid="transactions-advanced-confirm-delete"
                >
                  Confirm delete
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.primaryButton}
                  data-testid="transactions-advanced-start-edit"
                >
                  Launch editor
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default TransactionAdvancedModal;
