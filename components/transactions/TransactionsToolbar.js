import { useEffect, useRef, useState } from 'react';
import { FiPlus, FiSettings, FiSliders } from 'react-icons/fi';

import styles from '../../styles/TransactionsHistory.module.css';
import { formatAmountWithTrailing } from '../../lib/numberFormat';
import { TableConfirmModal, TableRestoreInput } from '../table';

export function TransactionsToolbar({
  searchValue,
  onSearchChange,
  onSubmitSearch,
  onClearSearch,
  previousQuery,
  onRestoreQuery,
  onFilterClick,
  filterCount,
  onAddTransaction,
  onCustomizeColumns,
  isReorderMode = false,
  selectedCount = 0,
  selectionSummary = { amount: 0, finalPrice: 0, totalBack: 0 },
  onDeselectAll,
  onToggleShowSelected,
  isShowingSelectedOnly,
}) {
  const hasQuery = Boolean(searchValue?.trim());
  const hasFilters = filterCount > 0;
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
    if (selectedCount === 0) {
      return;
    }
    onToggleShowSelected?.();
  };

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
          containerProps={{ 'data-testid': 'transactions-search-group' }}
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
        />

        <button
          type="button"
          className={styles.searchSubmitButton}
          onClick={onSubmitSearch}
          data-testid="transactions-search-submit"
        >
          Search
        </button>

        {selectedCount > 0 ? (
          <div className={styles.selectionQuickActions} data-testid="transactions-selection-inline">
            <span className={styles.selectionQuickSummary}>
              {selectedCount} selected · Amount {formatAmountWithTrailing(selectionSummary.amount)}
            </span>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={onDeselectAll}
              data-testid="transactions-quick-deselect"
            >
              De-select
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={handleToggleSelected}
              data-testid="transactions-quick-toggle"
            >
              {isShowingSelectedOnly ? 'Show all rows' : 'Show selected rows'}
            </button>
          </div>
        ) : null}
      </div>

      <div className={styles.actionsGroup}>
        <button
          type="button"
          className={`${styles.filterButton} ${hasFilters ? styles.filterButtonActive : ''}`}
          onClick={onFilterClick}
          data-testid="transactions-filter-trigger"
          aria-label="Open filters"
        >
          <FiSliders aria-hidden />
          Filters
          {hasFilters ? <span className={styles.countBadge}>{filterCount}</span> : null}
        </button>

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
