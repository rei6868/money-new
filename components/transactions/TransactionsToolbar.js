import { useEffect, useRef } from 'react';
import { FiPlus, FiRefreshCw, FiSearch, FiSettings } from 'react-icons/fi';

import styles from '../../styles/TransactionsHistory.module.css';
import { TableRestoreInput } from '../table';
import { Tooltip } from '../ui/Tooltip';

function ToggleSwitch({ pressed, label, onClick, disabled, indeterminate }) {
  return (
    <button
      type="button"
      className={styles.toggleSwitch}
      aria-pressed={pressed}
      data-indeterminate={indeterminate ? 'true' : 'false'}
      onClick={onClick}
      disabled={disabled}
    >
      <span className={styles.toggleVisual} data-state={pressed ? 'on' : 'off'} />
      <span className={styles.toggleLabel}>{label}</span>
    </button>
  );
}

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
  onRefresh,
}) {
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (!isReorderMode) {
      return;
    }
    searchInputRef.current?.blur();
  }, [isReorderMode]);

  const focusSearchInput = () => {
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  };

  const handleRefresh = () => {
    if (typeof onRefresh === 'function') {
      onRefresh();
      return;
    }
    onResetFilters?.();
  };

  const isSearchDisabled = isReorderMode;
  const isSearchEmpty = !searchValue?.trim();

  return (
    <section
      className={styles.toolbarCard}
      data-enhanced="true"
      aria-label="Transactions controls"
      data-reorder-mode={isReorderMode ? 'true' : 'false'}
    >
      <div className={styles.toolbarSearchRow}>
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
          iconDisabled={isSearchEmpty}
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
          restoreButtonTitle={appliedQuery ? `Restore ${appliedQuery}` : undefined}
          inputProps={{
            disabled: isSearchDisabled,
            'aria-disabled': isSearchDisabled ? 'true' : undefined,
          }}
          containerProps={{
            'data-testid': 'transactions-search-group',
            'data-disabled': isSearchDisabled ? 'true' : undefined,
          }}
        />

        <div className={styles.searchButtonGroup}>
          <button
            type="button"
            className={styles.searchSubmitButton}
            onClick={onSubmitSearch}
            data-testid="transactions-search-submit"
            disabled={isSearchDisabled || isSearchEmpty}
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
            disabled={isSearchDisabled}
            aria-label="Reset search and filters"
          >
            <FiRefreshCw aria-hidden />
            <span className={styles.resetButtonText}>Reset</span>
          </button>

          <button
            type="button"
            className={`${styles.secondaryButton} ${styles.toolbarIconButton}`.trim()}
            onClick={handleRefresh}
            data-testid="transactions-refresh"
            disabled={isSearchDisabled}
            aria-label="Refresh transactions"
          >
            <FiRefreshCw aria-hidden />
            <span className={styles.resetButtonText}>Refresh</span>
          </button>
        </div>
      </div>

      <div className={styles.toolbarCustomizeRow}>
        {selectedCount > 0 ? (
          <div className={styles.selectionActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => onToggleShowSelected?.()}
              data-testid="transactions-selection-toggle-show"
              disabled={isReorderMode}
            >
              {isShowingSelectedOnly ? 'Show all' : 'Show selected'}
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => onDeselectAll?.()}
              data-testid="transactions-selection-deselect"
              disabled={isReorderMode}
            >
              Deselect all
            </button>
          </div>
        ) : null}

        <div className={styles.customizeRow}>
          <ToggleSwitch
            label="All"
            pressed={Boolean(allToggleableVisible)}
            indeterminate={Boolean(someToggleableVisible) && !allToggleableVisible}
            onClick={() => onToggleAllColumns?.(!allToggleableVisible)}
            disabled={isReorderMode && selectedCount > 0}
          />
          <div className={styles.customizeActionsCluster}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => onResetColumns?.()}
              data-testid="transactions-columns-reset"
              disabled={!isReorderMode}
            >
              <FiRefreshCw aria-hidden />
              Reset
            </button>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => onDoneCustomize?.()}
              data-testid="transactions-columns-done"
              disabled={!isReorderMode}
            >
              Done
            </button>
          </div>
          <button
            type="button"
            className={[
              styles.filterButton,
              styles.toolbarIconButton,
              isReorderMode ? styles.filterButtonActive : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={onCustomizeColumns}
            data-testid="transactions-customize-columns-trigger"
            aria-label={isReorderMode ? 'Finish customizing columns' : 'Customize table columns'}
            aria-pressed={isReorderMode}
          >
            <FiSettings aria-hidden />
            <span className={styles.customizeButtonText}>
              {isReorderMode ? 'Done customizing' : 'Customize'}
            </span>
          </button>
        </div>

        <Tooltip content="Add transaction">
          <button
            type="button"
            className={`${styles.primaryButton} ${styles.iconPrimaryButton}`.trim()}
            onClick={onAddTransaction}
            data-testid="transactions-add-button"
            disabled={isReorderMode}
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

export default TransactionsToolbar;
