import { useEffect, useRef, useState } from 'react';
import { FiPlus, FiRotateCcw, FiSearch, FiSettings, FiSliders, FiX } from 'react-icons/fi';

import styles from '../../styles/TransactionsHistory.module.css';

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
}) {
  const hasQuery = Boolean(searchValue);
  const canRestore = Boolean(previousQuery);
  const hasFilters = filterCount > 0;
  const searchInputRef = useRef(null);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);

  const showClearButton = hasQuery;
  const showRestoreButton = canRestore && !hasQuery;

  const focusSearchInput = () => {
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
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
      onSubmitSearch();
      return;
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
    onRestoreQuery(previousQuery);
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
    onClearSearch();
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  };

  const handleCancelClear = () => {
    setIsConfirmingClear(false);
    focusSearchInput();
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
            onChange={(event) => onSearchChange(event.target.value)}
            onFocus={handleFocus}
            onBlur={() => setIsSearchFocused(false)}
            onKeyDown={handleSearchKeyDown}
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

        {canRestore ? (
          <button
            type="button"
            className={styles.restoreIconButton}
            onClick={() => onRestoreQuery(previousQuery)}
            data-testid="transactions-search-restore"
            aria-label={`Restore search ${previousQuery}`}
            title={`Restore “${previousQuery}”`}
          >
            <FiRotateCcw aria-hidden />
          </button>
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
