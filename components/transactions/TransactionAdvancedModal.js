import { FiXCircle } from 'react-icons/fi';

import { formatAmountWithTrailing } from '../../lib/numberFormat';
import styles from '../../styles/TransactionsHistory.module.css';

export function TransactionAdvancedModal({ panelData, onClose }) {
  if (!panelData) {
    return null;
  }

  return (
    <div
      className={styles.advancedOverlay}
      data-testid="transactions-advanced-modal"
      role="dialog"
      aria-modal="true"
    >
      <div className={styles.advancedPanel}>
        <div className={styles.advancedHeader}>
          <h3 className={styles.advancedTitle}>
            {panelData.mode === 'create'
              ? 'Quick Create Transaction'
              : panelData.mode === 'edit'
              ? `Edit ${panelData.transaction?.id ?? ''}`
              : panelData.mode === 'delete'
              ? `Delete ${panelData.transaction?.id ?? ''}`
              : `Advanced options for ${panelData.transaction?.id ?? ''}`}
          </h3>
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

        {panelData.mode === 'create' ? (
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
                <span className={styles.advancedValue}>
                  {panelData.transaction?.owner ?? 'Unassigned'}
                </span>
              </div>
              <div className={styles.advancedSection}>
                <span className={styles.advancedLabel}>Account</span>
                <span className={styles.advancedValue}>
                  {panelData.transaction?.account ?? 'Not available'}
                </span>
              </div>
              <div className={styles.advancedSection}>
                <span className={styles.advancedLabel}>Notes</span>
                <span className={styles.advancedValue}>{panelData.transaction?.notes ?? '—'}</span>
              </div>
            </div>

            <div className={styles.metricsGrid}>
              <div className={styles.metricTile}>
                <span className={styles.metricLabel}>Amount</span>
                <span className={styles.metricValue}>
                  {formatAmountWithTrailing(panelData.transaction?.amount)}
                </span>
              </div>
              <div className={styles.metricTile}>
                <span className={styles.metricLabel}>Total Back</span>
                <span className={styles.metricValue}>
                  {formatAmountWithTrailing(panelData.transaction?.totalBack)}
                </span>
              </div>
              <div className={styles.metricTile}>
                <span className={styles.metricLabel}>Final Price</span>
                <span className={styles.metricValue}>
                  {formatAmountWithTrailing(panelData.transaction?.finalPrice)}
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
              {panelData.mode === 'delete' ? (
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
