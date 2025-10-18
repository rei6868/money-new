import { useEffect, useRef, useState } from 'react';
import {
  FiPlus,
  FiRotateCcw,
  FiSearch,
  FiSettings,
  FiSliders,
  FiX,
} from 'react-icons/fi';

import styles from '../../styles/TransactionsHistory.module.css';
import { formatAmountWithTrailing } from '../../lib/numberFormat';

export function TransactionsToolbar({
  searchValue,
  onSearchChange,
  onSubmitSearch,
  onClearSearch,
  previousQuery,
  onRestoreQuery,
  onFilterClick,
  filterCount,
  onClearFilters,
  onAddTransaction,
  onCustomizeColumns,
  selectedCount = 0,
  selectionSummary = { amount: 0, finalPrice: 0, totalBack: 0 },
  onDeselectAll,
  onToggleShowSelected,
  isShowingSelectedOnly,
}) {
  const hasQuery = Boolean(searchValue?.trim());
  const canRestore = Boolean(previousQuery);
  const hasFilters = filterCount > 0;
  const searchInputRef = useRef(null);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const showClearButton = hasQuery;
  const showRestoreButton = canRestore && !hasQuery && isSearchFocused && !isConfirmingClear;

  const focusSearchInput = () => {
    requestAnimationFrame(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
        setIsSearchFocused(true);
      }
    });
  };

  const handleClearMouseDown = (event) => {
    event.preventDefault();
  };

  const handleClearClick = () => {
    if (!hasQuery) {
      return;
    }
    setIsConfirmingClear(true);
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onSubmitSearch?.();
    }
    if (event.key === 'Escape' && hasQuery) {
      event.preventDefault();
      setIsConfirmingClear(true);
    }
  };

  const handleRestoreClick = () => {
    if (!previousQuery) {
      return;
    }
    onRestoreQuery?.(previousQuery);
    focusSearchInput();
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
        <div className={styles.searchGroup} data-testid="transactions-search-group">
          <input
            ref={searchInputRef}
            type="search"
            placeholder="Search all transactions"
            value={searchValue}
            onChange={(event) => onSearchChange?.(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className={styles.searchInput}
            data-testid="transactions-search-input"
            aria-label="Search transactions"
          />
          <div className={styles.searchTrailingIcons}>
            {showRestoreButton ? (
              <button
                type="button"
                className={`${styles.searchIconButton} ${styles.searchRestoreButton}`}
                onClick={handleRestoreClick}
                data-testid="transactions-search-restore"
                aria-label={`Restore search ${previousQuery}`}
                title={`Restore “${previousQuery}”`}
              >
                <FiRotateCcw aria-hidden />
              </button>
            ) : null}
            {showClearButton ? (
              <button
                type="button"
                className={`${styles.searchIconButton} ${styles.searchClearButton}`}
                onMouseDown={handleClearMouseDown}
                onClick={handleClearClick}
                data-testid="transactions-search-clear"
                aria-label="Clear search"
              >
                <FiX aria-hidden />
              </button>
            ) : null}
            <span className={`${styles.searchIconButton} ${styles.searchStaticIcon}`} aria-hidden>
              <FiSearch />
            </span>
          </div>
        </div>

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
              {selectedCount} selected · Amount {formatAmountWithTrailing(selectionSummary.amount)} · Final {formatAmountWithTrailing(selectionSummary.finalPrice)} · Total Back {formatAmountWithTrailing(selectionSummary.totalBack)}
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

        {hasFilters ? (
          <button
            type="button"
            className={`${styles.secondaryButton} ${styles.clearFilterButton}`}
            onClick={() => onClearFilters?.()}
            data-testid="transactions-clear-filters"
            aria-label="Clear applied filters"
          >
            Clear filters
          </button>
        ) : null}

        <button
          type="button"
          className={styles.filterButton}
          onClick={onCustomizeColumns}
          data-testid="transactions-customize-columns-trigger"
          aria-label="Customize table columns"
        >
          <FiSettings aria-hidden />
          Customize columns
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

      {isConfirmingClear ? (
        <div className={styles.confirmOverlay} role="dialog" aria-modal="true">
          <div className={styles.confirmDialog}>
            <p className={styles.confirmMessage}>Clear the current search text?</p>
            <div className={styles.confirmActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={handleCancelClear}
                data-testid="transactions-search-cancel-clear"
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={handleConfirmClear}
                data-testid="transactions-search-confirm-clear"
              >
                Clear search
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
