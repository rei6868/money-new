import { FiPlus, FiRotateCcw, FiSearch, FiSliders, FiX } from 'react-icons/fi';

import styles from '../../styles/TransactionsHistory.module.css';

export function TransactionsToolbar({
  query,
  onQueryChange,
  onClearQuery,
  previousQuery,
  onRestoreQuery,
  onFilterClick,
  filterCount,
  onAddTransaction,
}) {
  const hasQuery = Boolean(query);
  const canRestore = Boolean(previousQuery);
  const hasFilters = filterCount > 0;

  return (
    <section className={styles.toolbarCard} aria-label="Transactions controls">
      <div className={styles.toolbarLeft}>
        <div className={styles.searchGroup}>
          <FiSearch className={styles.searchIcon} aria-hidden />
          <input
            type="search"
            placeholder="Search all transactions"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            className={styles.searchInput}
            data-testid="transactions-search-input"
            aria-label="Search transactions"
          />
          {hasQuery ? (
            <button
              type="button"
              className={styles.iconButton}
              onClick={onClearQuery}
              data-testid="transactions-search-clear"
              aria-label="Clear search"
            >
              <FiX aria-hidden />
            </button>
          ) : null}
        </div>

        {canRestore ? (
          <button
            type="button"
            className={styles.restoreChip}
            onClick={() => onRestoreQuery(previousQuery)}
            data-testid="transactions-search-restore"
            aria-label="Restore previous search"
          >
            <FiRotateCcw aria-hidden />
            <span>Restore</span>
            <span className={styles.wrap}>&ldquo;{previousQuery}&rdquo;</span>
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
          className={styles.primaryButton}
          onClick={onAddTransaction}
          data-testid="transactions-add-button"
        >
          <FiPlus aria-hidden />
          Add transaction
        </button>
      </div>
    </section>
  );
}
