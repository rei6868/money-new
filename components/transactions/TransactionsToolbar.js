import { useEffect, useRef, useState } from 'react';
import { FiPlus, FiSettings } from 'react-icons/fi';

import styles from '../../styles/TransactionsHistory.module.css';
import { TableConfirmModal, TableRestoreInput } from '../table';

export function TransactionsToolbar({
  searchValue,
  onSearchChange,
  onSubmitSearch,
  onClearSearch,
  previousQuery,
  onRestoreQuery,
  onAddTransaction,
  onCustomizeColumns,
  isReorderMode = false,
  selectedCount = 0,
  onDeselectAll,
  onToggleShowSelected,
  isShowingSelectedOnly,
}) {
  const hasQuery = Boolean(searchValue?.trim());
  const searchInputRef = useRef(null);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);

  const focusSearchInput = () => {
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  };

  useEffect(() => {
    if (!isConfirmingClear) {
      return undefined;
    }

    const handleKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsConfirmingClear(false);
        focusSearchInput();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
    };
  }, [isConfirmingClear]);

  const handleConfirmClear = () => {
    setIsConfirmingClear(false);
    onClearSearch?.();
    focusSearchInput();
  };

  const handleCancelClear = () => {
    setIsConfirmingClear(false);
    focusSearchInput();
  };

  const handleToggleSelected = () => {
    if (selectedCount === 0 || isCustomizeLocked) {
      return;
    }
    onToggleShowSelected?.();
  };

  const isCustomizeLocked = isReorderMode;

  return (
    <section className={styles.toolbarCard} aria-label="Transactions controls">
      <div className={styles.toolbarLeft}>
        <TableRestoreInput
          ref={searchInputRef}
          value={searchValue}
          onChange={onSearchChange}
          onSubmit={onSubmitSearch}
          onClear={onClearSearch}
          onRequestClearConfirm={() => (hasQuery ? setIsConfirmingClear(true) : null)}
          previousValue={previousQuery}
          onRestore={(value) => {
            onRestoreQuery?.(value);
            focusSearchInput();
          }}
          placeholder="Search all transactions"
          containerClassName={styles.searchGroup}
          inputClassName={styles.searchInput}
          iconButtonClassName={styles.searchIconButton}
          restoreButtonClassName={styles.searchRestoreButton}
          clearButtonClassName={styles.searchClearButton}
          staticIconClassName={`${styles.searchIconButton} ${styles.searchStaticIcon}`}
          inputTestId="transactions-search-input"
          restoreButtonTestId="transactions-search-restore"
          clearButtonTestId="transactions-search-clear"
          clearButtonAriaLabel="Clear search"
          restoreButtonAriaLabel={previousQuery ? `Restore search ${previousQuery}` : 'Restore search'}
          clearButtonTitle="Clear search"
          restoreButtonTitle={previousQuery ? `Restore “${previousQuery}”` : undefined}
          inputProps={{
            disabled: isCustomizeLocked,
            'aria-disabled': isCustomizeLocked ? 'true' : undefined,
          }}
          containerProps={{
            'data-testid': 'transactions-search-group',
            'data-disabled': isCustomizeLocked ? 'true' : undefined,
          }}
        />

        <button
          type="button"
          className={styles.searchSubmitButton}
          onClick={onSubmitSearch}
          data-testid="transactions-search-submit"
          disabled={isCustomizeLocked}
        >
          Search
        </button>

        {selectedCount > 0 ? (
          <div className={styles.selectionQuickActions} data-testid="transactions-selection-inline">
            <span className={styles.selectionQuickSummary}>{selectedCount} selected</span>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={onDeselectAll}
              data-testid="transactions-quick-deselect"
              disabled={isCustomizeLocked}
            >
              De-select
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={handleToggleSelected}
              data-testid="transactions-quick-toggle"
              disabled={isCustomizeLocked}
            >
              {isShowingSelectedOnly ? 'Show all rows' : 'Show selected rows'}
            </button>
          </div>
        ) : null}
      </div>

      <div className={styles.actionsGroup}>
        <button
          type="button"
          className={`${styles.filterButton} ${isReorderMode ? styles.filterButtonActive : ''}`}
          onClick={onCustomizeColumns}
          data-testid="transactions-customize-columns-trigger"
          aria-label={isReorderMode ? 'Finish customizing columns' : 'Customize table columns'}
          aria-pressed={isReorderMode}
        >
          <FiSettings aria-hidden />
          {isReorderMode ? 'Done customizing' : 'Customize columns'}
        </button>

        <button
          type="button"
          className={styles.primaryButton}
          onClick={onAddTransaction}
          data-testid="transactions-add-button"
        >
          <FiPlus aria-hidden />
          Add transaction
        </button>
      </div>

      <TableConfirmModal
        isOpen={isConfirmingClear}
        title="Clear search"
        message="Clear the current search text?"
        cancelLabel="Cancel"
        confirmLabel="Clear search"
        onCancel={handleCancelClear}
        onConfirm={handleConfirmClear}
        className={styles.confirmOverlay}
        contentClassName={styles.confirmDialog}
        actionsClassName={styles.confirmActions}
        cancelButtonClassName={styles.secondaryButton}
        confirmButtonClassName={styles.primaryButton}
        cancelButtonProps={{ 'data-testid': 'transactions-search-cancel-clear' }}
        confirmButtonProps={{ 'data-testid': 'transactions-search-confirm-clear' }}
      />
    </section>
  );
}
