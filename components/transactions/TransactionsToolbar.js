import { useEffect, useRef } from 'react';
import { FiPlus, FiRefreshCw, FiSettings, FiSearch } from 'react-icons/fi';

import styles from '../../styles/TransactionsHistory.module.css';
import { TableRestoreInput } from '../table';
import { Tooltip } from '../ui/Tooltip';

export function TransactionsToolbar({
  searchValue,
  clearedDraftQuery,
  appliedQuery,
  onSearchChange,
  onSubmitSearch,
  onClearSearch,
  onRestoreSearch,
  onAddTransaction,
  onCustomizeColumns,
  isReorderMode = false,
  onToggleAllColumns,
  allToggleableVisible,
  someToggleableVisible,
  onResetColumns,
  onDoneCustomize,
  selectedCount = 0,
  onDeselectAll,
  onToggleShowSelected,
  isShowingSelectedOnly,
  onResetFilters,
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

  const isCustomizeLocked = isReorderMode;

  return (
    <section className={styles.toolbarCard} aria-label="Transactions controls">
      <div className={styles.toolbarLeft}>
        <TableRestoreInput
          ref={searchInputRef}
          value={searchValue}
          valueToRestoreLocally={clearedDraftQuery}
          onChange={onSearchChange}
          onSubmit={onSubmitSearch}
          onClear={onClearSearch}
          previousValue={appliedQuery ?? ''}
          onRestore={() => {
            onRestoreSearch?.();
            focusSearchInput();
          }}
          placeholder="Search all transactions"
          containerClassName={styles.searchGroup}
          inputClassName={styles.searchInput}
          iconButtonClassName={styles.searchIconButton}
          onIconClick={onSubmitSearch}
          iconDisabled={!searchValue?.trim()}
          restoreButtonClassName={styles.searchRestoreButton}
          clearButtonClassName={styles.searchClearButton}
          actionsClassName={styles.searchInputActions}
          inputTestId="transactions-search-input"
          restoreButtonTestId="transactions-search-restore"
          clearButtonTestId="transactions-search-clear"
          clearButtonAriaLabel="Clear search"
          restoreButtonAriaLabel={
            appliedQuery ? `Restore search ${appliedQuery}` : 'Restore search'
          }
          clearButtonTitle="Clear search"
          restoreButtonTitle={appliedQuery ? `Restore “${appliedQuery}”` : undefined}
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
          disabled={isCustomizeLocked || !searchValue?.trim()}
          aria-label="Search transactions"
        >
          <FiSearch className={styles.searchSubmitIcon} aria-hidden />
          <span className={styles.searchSubmitText}>Search</span>
        </button>

        <button
          type="button"
          className={`${styles.secondaryButton} ${styles.toolbarIconButton}`.trim()}
          onClick={onResetFilters}
          data-testid="transactions-reset-filters"
          disabled={isCustomizeLocked}
          aria-label="Reset search and filters"
        >
          <FiRefreshCw aria-hidden />
          <span className={styles.resetButtonText}>Reset</span>
        </button>

      </div>

      <div className={styles.actionsGroup}>
        <div className={styles.customizeActionsGroup}>
          {selectedCount > 0 && (
            <>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => onToggleShowSelected?.()}
                data-testid="transactions-selection-toggle-show"
              >
                {isShowingSelectedOnly ? 'Show all' : 'Show selected'}
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => onDeselectAll?.()}
                data-testid="transactions-selection-deselect"
              >
                Deselect all
              </button>
            </>
          )}

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
          className={`${styles.filterButton} ${
            isReorderMode ? styles.filterButtonActive : ''
          } ${styles.toolbarIconButton}`.trim()}
          onClick={onCustomizeColumns}
          data-testid="transactions-customize-columns-trigger"
          aria-label={isReorderMode ? 'Finish customizing columns' : 'Customize table columns'}
          aria-pressed={isReorderMode}
        >
            <FiSettings aria-hidden />
            <span className={styles.customizeButtonText}>
              {isReorderMode ? 'Done customizing' : 'Customize columns'}
            </span>
          </button>
        </div>

        <Tooltip content="Add transaction">
          <button
            type="button"
            className={`${styles.primaryButton} ${styles.iconPrimaryButton}`.trim()}
            onClick={onAddTransaction}
            data-testid="transactions-add-button"
            disabled={isCustomizeLocked}
            aria-label="Add new transaction"
          >
            <FiPlus aria-hidden />
            <span className={styles.srOnly}>Add transaction</span>
          </button>
        </Tooltip>
      </div>
    </section>
  );
}
