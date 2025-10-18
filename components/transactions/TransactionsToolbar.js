import { useRef } from 'react';
import { FiPlus, FiRotateCcw, FiSearch, FiSettings, FiSliders, FiX } from 'react-icons/fi';

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

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmitSearch();
  };

  const handleToggleSelected = () => {
    if (selectedCount === 0) {
      return;
    }
    onToggleShowSelected?.();
  };

  return (
    <section className={styles.toolbarCard} aria-label="Transactions controls">
      <form className={styles.toolbarLeft} onSubmit={handleSubmit} role="search">
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
            {canRestore ? (
              <button
                type="button"
                className={styles.searchIconButton}
                onClick={handleRestore}
                data-testid="transactions-search-restore"
                aria-label="Restore last search"
                title={previousQuery}
              >
                <FiRotateCcw aria-hidden />
              </button>
            ) : null}
            {hasSearch ? (
              <button
                type="button"
                className={styles.searchIconButton}
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
      </form>

        {selectedCount > 0 ? (
          <div className={styles.selectionQuickActions} data-testid="transactions-selection-inline">
            <span className={styles.selectionQuickSummary}>
              {selectedCount} selected · Amount {formatAmountWithTrailing(selectionSummary.amount)} · Final {formatAmountWithTrailing(selectionSummary.finalPrice)} · Total Back {formatAmountWithTrailing(selectionSummary.totalBack)}
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
        <button type="button" className={styles.secondaryButton} onClick={onCustomizeColumns}>
          <FiSettings aria-hidden /> Customize
        </button>
        {hasSelection ? (
          <>
            <div className={styles.selectionTotals}>
              <span>{selectionSummary.count} selected</span>
              <span>Total {formatAmountWithTrailing(selectionSummary.amount)}</span>
              <span>Final {formatAmountWithTrailing(selectionSummary.finalPrice)}</span>
              <span>Back {formatAmountWithTrailing(selectionSummary.totalBack)}</span>
            </div>
            <button type="button" className={styles.secondaryButton} onClick={onDeselectAll}>
              Clear selection
            </button>
            <button type="button" className={styles.secondaryButton} onClick={onToggleShowSelected}>
              {isShowingSelectedOnly ? 'Show all' : 'Show selected'}
            </button>
          </>
        ) : null}
      </div>
    </section>
  );
}
