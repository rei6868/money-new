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
  onAddTransaction,
  onCustomizeColumns,
  selectionSummary,
  onDeselectAll,
  onToggleShowSelected,
  isShowingSelectedOnly,
}) {
  const searchInputRef = useRef(null);
  const hasSearch = Boolean(searchValue && searchValue.trim().length > 0);
  const canRestore = Boolean(previousQuery);
  const hasSelection = (selectionSummary?.count ?? 0) > 0;

  const handleClearClick = () => {
    if (!hasSearch) {
      return;
    }
    onClearSearch();
    onSearchChange('');
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  };

  const handleRestore = () => {
    if (!previousQuery) {
      return;
    }
    onRestoreQuery(previousQuery);
    onSearchChange(previousQuery);
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmitSearch();
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
            onChange={(event) => onSearchChange(event.target.value)}
            className={styles.searchInput}
            data-testid="transactions-search-input"
            aria-label="Search transactions"
          />
          <button
            type="submit"
            className={styles.searchSubmitButton}
            data-testid="transactions-search-submit"
            aria-label="Apply search"
          >
            <FiSearch aria-hidden />
          </button>
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
        <button type="submit" className={styles.searchSubmitButton} data-testid="transactions-search-apply">
          Search
        </button>
      </form>

      <div className={styles.toolbarSelectionControls}>
        <button type="button" className={styles.primaryPillButton} onClick={onAddTransaction}>
          <FiPlus aria-hidden /> Add transaction
        </button>
        <button type="button" className={styles.secondaryButton} onClick={onFilterClick} data-testid="transactions-open-filter">
          <FiSliders aria-hidden /> Filters
          {filterCount > 0 ? <span aria-hidden> ({filterCount})</span> : null}
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
