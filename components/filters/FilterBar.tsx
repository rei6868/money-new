import { useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { FiFilter, FiSave, FiSearch, FiX } from 'react-icons/fi';

import type { FilterAnalytics, TableFilters } from './filterTypes';
import { createEmptyFilters, formatDateRange, hasActiveFilters } from './filterTypes';

import styles from './FilterBar.module.css';

export type FilterBarProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filters: TableFilters;
  onFiltersChange: (filters: TableFilters) => void;
  onOpenFilters: () => void;
  analytics?: FilterAnalytics;
  savedViewStorageKey?: string;
  leadingActions?: ReactNode;
};

function removeFilterValue(values: string[], target: string) {
  return values.filter((value) => value !== target);
}

function getSavedViews(storageKey: string): SavedView[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item): item is SavedView => typeof item?.name === 'string');
  } catch (error) {
    console.error('Unable to read saved filter views', error);
    return [];
  }
}

function persistSavedViews(storageKey: string, views: SavedView[]) {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(views));
  } catch (error) {
    console.error('Unable to persist saved filter views', error);
  }
}

type SavedView = {
  name: string;
  filters: TableFilters;
  searchQuery: string;
  savedAt: string;
};

export function FilterBar({
  searchQuery,
  onSearchChange,
  filters,
  onFiltersChange,
  onOpenFilters,
  analytics,
  savedViewStorageKey = 'mf.tableFilters.views',
  leadingActions,
}: FilterBarProps) {
  const summaryChips = useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void }[] = [];

    if (searchQuery.trim().length > 0) {
      chips.push({
        key: `search:${searchQuery}`,
        label: `Search: “${searchQuery.trim()}”`,
        onRemove: () => onSearchChange(''),
      });
    }

    const appendChip = (values: string[], labelPrefix: string, keyPrefix: string) => {
      values.forEach((value) => {
        const label = `${labelPrefix}: ${value}`;
        chips.push({
          key: `${keyPrefix}:${value}`,
          label,
          onRemove: () => {
            onFiltersChange({
              ...filters,
              [keyPrefix]: removeFilterValue(values, value),
            });
          },
        });
      });
    };

    appendChip(filters.accounts, 'Account', 'accounts');
    appendChip(filters.people, 'Person', 'people');
    appendChip(filters.debtTags, 'Debt tag', 'debtTags');
    appendChip(filters.categories, 'Category', 'categories');

    if (filters.type) {
      const typeLabel = filters.type.replace(/^[a-z]/, (char) => char.toUpperCase());
      chips.push({
        key: `type:${filters.type}`,
        label: `Type: ${typeLabel}`,
        onRemove: () => onFiltersChange({ ...filters, type: null }),
      });
    }

    const formattedRange = formatDateRange(filters.dateRange);
    if (formattedRange) {
      chips.push({
        key: `dateRange:${formattedRange}`,
        label: `Date ${formattedRange}`,
        onRemove: () =>
          onFiltersChange({
            ...filters,
            dateRange: createEmptyFilters().dateRange,
          }),
      });
    }

    return chips;
  }, [filters, onFiltersChange, onSearchChange, searchQuery]);

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onSearchChange(event.target.value);
    },
    [onSearchChange],
  );

  const resetAll = useCallback(() => {
    onFiltersChange(createEmptyFilters());
    onSearchChange('');
  }, [onFiltersChange, onSearchChange]);

  const handleSaveView = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const name = window.prompt('Name this view');
    if (!name) {
      return;
    }

    const existing = getSavedViews(savedViewStorageKey);
    const updated: SavedView[] = [
      {
        name,
        filters,
        searchQuery,
        savedAt: new Date().toISOString(),
      },
      ...existing.filter((view) => view.name !== name),
    ];

    persistSavedViews(savedViewStorageKey, updated);
  }, [filters, savedViewStorageKey, searchQuery]);

  const active = hasActiveFilters(filters, searchQuery);

  return (
    <div className={styles.root}>
      <div className={styles.primaryRow}>
        {leadingActions ? <div className={styles.leadingActions}>{leadingActions}</div> : null}
        <label className={styles.searchInput} htmlFor="table-search">
          <FiSearch aria-hidden />
          <input
            id="table-search"
            className={styles.searchField}
            type="search"
            placeholder="Search transactions, accounts, notes…"
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </label>

        <div className={styles.actionsGroup}>
          <button type="button" className={styles.primaryButton} onClick={onOpenFilters}>
            <FiFilter aria-hidden />
            Filters
          </button>
          <button type="button" className={styles.secondaryButton} onClick={handleSaveView}>
            <FiSave aria-hidden />
            Save view
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={resetAll}
            disabled={!active}
          >
            Reset all
          </button>
        </div>

        {analytics ? (
          <div className={styles.analyticsCard} role="status" aria-live="polite">
            <div>
              <div className={styles.analyticsLabel}>Matching</div>
              <div className={styles.analyticsValue}>{analytics.resultCount}</div>
            </div>
            {analytics.totals?.amount !== undefined ? (
              <div>
                <div className={styles.analyticsLabel}>Total amount</div>
                <div className={styles.analyticsValue}>
                  {analytics.totals.amount.toLocaleString(undefined, {
                    style: 'currency',
                    currency: 'USD',
                    maximumFractionDigits: 0,
                  })}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {summaryChips.length > 0 ? (
        <div className={styles.filtersRow}>
          {summaryChips.map((chip) => (
            <span key={chip.key} className={styles.chip}>
              {chip.label}
              <button type="button" onClick={chip.onRemove} aria-label={`Remove ${chip.label}`}>
                <FiX aria-hidden />
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default FilterBar;
