import { useEffect, useRef } from 'react';
import { FiPlus, FiRefreshCw, FiSettings } from 'react-icons/fi';

import styles from '../../styles/TransactionsHistory.module.css';
import { TableRestoreInput } from '../table';

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
  onToggleAllColumns,
  allToggleableVisible,
  someToggleableVisible,
  onResetColumns,
  onDoneCustomize,
}) {
  const searchInputRef = useRef(null);
  const columnSelectAllRef = useRef(null);

  const focusSearchInput = () => {
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  };

  useEffect(() => {
    if (!columnSelectAllRef.current) {
      return;
    }
    columnSelectAllRef.current.indeterminate =
      Boolean(someToggleableVisible) && !allToggleableVisible;
  }, [someToggleableVisible, allToggleableVisible]);

  const handleToggleSelected = () => {
    if (selectedCount === 0) {
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
          actionsClassName={styles.searchInputActions}
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
        <div className={styles.customizeActionsGroup}>
          {isReorderMode ? (
            <div className={styles.toolbarCustomizeControls}>
              <label className={styles.customizeSelectAll}>
                <input
                  ref={columnSelectAllRef}
                  type="checkbox"
                  checked={Boolean(allToggleableVisible)}
                  onChange={(event) => onToggleAllColumns?.(event.target.checked)}
                  aria-label="Select or deselect all columns except Notes"
                />
                <span>All columns (excl. Notes)</span>
              </label>

              <div className={styles.customizeToolbarActions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => onResetColumns?.()}
                  data-testid="transactions-columns-reset"
                >
                  <FiRefreshCw aria-hidden />
                  Reset
                </button>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => onDoneCustomize?.()}
                  data-testid="transactions-columns-done"
                >
                  Done
                </button>
              </div>
            </div>
          ) : null}

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
        </div>

        <button
          type="button"
          className={styles.primaryButton}
          onClick={onAddTransaction}
          data-testid="transactions-add-button"
          disabled={isCustomizeLocked}
        >
          <FiPlus aria-hidden />
          Add transaction
        </button>
      </div>
    </section>
  );
}
