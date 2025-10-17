import { useEffect, useRef, useState } from 'react';
import { FiPlus, FiSearch, FiSliders } from 'react-icons/fi';

import { InputClearAction, InputRestoreAction } from '../common/InputActionIcon';
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
  const [isFocused, setIsFocused] = useState(false);
  const [shouldShowRestore, setShouldShowRestore] = useState(false);
  const inputRef = useRef(null);
  const hasQuery = Boolean(query);
  const hasFilters = filterCount > 0;

  useEffect(() => {
    setShouldShowRestore(Boolean(previousQuery));
  }, [previousQuery]);

  const handleRestore = () => {
    if (!previousQuery) {
      return;
    }
    onRestoreQuery(previousQuery);
    setShouldShowRestore(false);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      setIsFocused(true);
    });
  };

  const handleClear = () => {
    onClearQuery();
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      setIsFocused(true);
    });
  };

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
            ref={inputRef}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
          <InputClearAction
            isVisible={isFocused}
            onConfirm={handleClear}
            confirmMessage={
              hasQuery ? `Clear the search “${query}”?` : 'Clear this field?'
            }
            label="Clear search"
            onCancel={() => setIsFocused(true)}
            testId="transactions-search-clear"
          />
          <InputRestoreAction
            isVisible={shouldShowRestore}
            onRestore={handleRestore}
            label="Restore previous search"
            title="Restore search"
            testId="transactions-search-restore"
          />
        </div>
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
