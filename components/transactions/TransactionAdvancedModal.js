import { useEffect, useState } from 'react';
import { FiXCircle } from 'react-icons/fi';

import { formatAmountWithTrailing } from '../../lib/numberFormat';
import styles from '../../styles/TransactionsHistory.module.css';

export function TransactionAdvancedModal({ panelData, onClose, onQuickEditSave }) {
  const [formState, setFormState] = useState({ owner: '', category: '', notes: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!panelData) {
    return null;
  }

  const { transaction } = panelData;
  const isEditMode = panelData.mode === 'edit';

  useEffect(() => {
    if (isEditMode && transaction) {
      setFormState({
        owner: transaction.owner ?? '',
        category: transaction.category ?? '',
        notes: transaction.notes ?? '',
      });
    } else {
      setFormState({ owner: '', category: '', notes: '' });
    }
    setErrorMessage('');
    setIsSaving(false);
  }, [isEditMode, transaction]);

  const handleInputChange = (field) => (event) => {
    const { value } = event.target;
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!isEditMode || !transaction?.id) {
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    const updates = {
      owner: formState.owner,
      category: formState.category,
      notes: formState.notes,
    };

    try {
      const response = await fetch('/api/transactions/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'quickEdit',
          payload: {
            id: transaction.id,
            updates,
          },
        }),
      });

      const data = await response
        .json()
        .catch(() => ({ status: response.ok ? 'success' : 'error' }));

      if (!response.ok || data.status !== 'success') {
        const message = data?.message ?? 'Failed to save changes. Please try again.';
        throw new Error(message);
      }

      const resolvedUpdates =
        data && typeof data.updatedRow === 'object' && data.updatedRow
          ? data.updatedRow
          : updates;

      onQuickEditSave?.(transaction.id, resolvedUpdates);
      setIsSaving(false);
      onClose?.();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to save changes. Please try again.',
      );
      setIsSaving(false);
    }
  };

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
              {isEditMode ? (
                <>
                  <div className={styles.advancedSection}>
                    <label className={styles.modalLabel} htmlFor="quick-edit-owner">
                      Owner
                    </label>
                    <input
                      id="quick-edit-owner"
                      className={styles.modalControl}
                      value={formState.owner}
                      onChange={handleInputChange('owner')}
                      placeholder="Add owner"
                    />
                  </div>
                  <div className={styles.advancedSection}>
                    <label className={styles.modalLabel} htmlFor="quick-edit-category">
                      Category
                    </label>
                    <input
                      id="quick-edit-category"
                      className={styles.modalControl}
                      value={formState.category}
                      onChange={handleInputChange('category')}
                      placeholder="Add category"
                    />
                  </div>
                  <div className={styles.advancedSection}>
                    <label className={styles.modalLabel} htmlFor="quick-edit-notes">
                      Notes
                    </label>
                    <textarea
                      id="quick-edit-notes"
                      className={`${styles.modalControl} ${styles.advancedTextarea}`.trim()}
                      value={formState.notes}
                      onChange={handleInputChange('notes')}
                      placeholder="Add notes"
                    />
                  </div>
                  <div className={styles.advancedSection}>
                    <span className={styles.advancedLabel}>Account</span>
                    <span className={styles.advancedValue}>
                      {panelData.transaction?.account ?? 'Not available'}
                    </span>
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}
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

            {errorMessage ? (
              <div className={styles.advancedError} role="alert" aria-live="assertive">
                {errorMessage}
              </div>
            ) : null}

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
              ) : isEditMode ? (
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={handleSave}
                  data-testid="transactions-advanced-save"
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving…' : 'Save'}
                </button>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default TransactionAdvancedModal;
