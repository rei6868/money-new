import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { FiFilter, FiRefreshCw, FiSave, FiSearch, FiX } from 'react-icons/fi';

import type { TableFilters } from './filterTypes';
import { createEmptyFilters, formatDateRange, hasActiveFilters } from './filterTypes';
import { ActionBar, useMediaQuery } from '../common/ActionBar';

import styles from './FilterBar.module.css';

export type FilterBarProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filters: TableFilters;
  onFiltersChange: (filters: TableFilters) => void;
  onOpenFilters: () => void;
  savedViewStorageKey?: string;
  leadingActions?: ReactNode;
  trailingActions?: ReactNode;
  tabs?: ReactNode;
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
  savedViewStorageKey = 'mf.tableFilters.views',
  leadingActions,
  trailingActions,
  tabs,
}: FilterBarProps) {
  const isMobile = useMediaQuery('(max-width: 600px)');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const lastSearchRef = useRef<string>('');

  useEffect(() => {
    if (!isMobile) {
      setIsMobileSearchOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      lastSearchRef.current = searchQuery;
    }
  }, [searchQuery]);

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

  const handleSearchClear = useCallback(() => {
    if (searchQuery.trim().length === 0) {
      return;
    }
    lastSearchRef.current = searchQuery;
    onSearchChange('');
    if (isMobile) {
      setIsMobileSearchOpen(false);
    }
  }, [isMobile, onSearchChange, searchQuery]);

  const handleSearchRestore = useCallback(() => {
    const previous = lastSearchRef.current;
    if (!previous || previous === searchQuery) {
      return;
    }
    onSearchChange(previous);
    if (isMobile) {
      setIsMobileSearchOpen(true);
      window.requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [isMobile, onSearchChange, searchQuery]);

  const handleMobileSearchToggle = useCallback(() => {
    if (!isMobile) {
      return;
    }
    setIsMobileSearchOpen((current) => {
      const next = !current;
      if (!next) {
        searchInputRef.current?.blur();
      } else {
        window.requestAnimationFrame(() => searchInputRef.current?.focus());
      }
      return next;
    });
  }, [isMobile]);

  const handleMobileSearchBlur = useCallback(() => {
    if (!isMobile) {
      return;
    }
    window.requestAnimationFrame(() => {
      const activeElement = document.activeElement as HTMLElement | null;
      if (activeElement && searchInputRef.current?.parentElement?.contains(activeElement)) {
        return;
      }
      setIsMobileSearchOpen(false);
    });
  }, [isMobile]);

  const resetAll = useCallback(() => {
    onFiltersChange(createEmptyFilters());
    onSearchChange('');
    if (isMobile) {
      setIsMobileSearchOpen(false);
    }
  }, [isMobile, onFiltersChange, onSearchChange]);

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

  const actionButtons = (
    <div className={styles.actionsGroup}>
      <button type="button" className={styles.primaryButton} onClick={onOpenFilters}>
        <FiFilter aria-hidden />
        <span>Filters</span>
      </button>
      <button type="button" className={styles.secondaryButton} onClick={handleSaveView}>
        <FiSave aria-hidden />
        <span>Save view</span>
      </button>
      <button
        type="button"
        className={styles.secondaryButton}
        onClick={resetAll}
        disabled={!active}
      >
        <FiRefreshCw aria-hidden />
        <span>Reset all</span>
      </button>
    </div>
  );

  const isSearchOpen = !isMobile || isMobileSearchOpen;

  return (
    <div className={styles.root}>
      <ActionBar
        left={tabs}
        center={
          <div className={styles.searchShell} data-open={isSearchOpen ? 'true' : 'false'}>
            <button
              type="button"
              className={styles.searchIconButton}
              onClick={handleMobileSearchToggle}
              aria-label={isMobileSearchOpen ? 'Hide search' : 'Show search'}
              data-visible={isMobile ? 'true' : undefined}
            >
              <FiSearch aria-hidden />
            </button>
            <div
              className={styles.searchFieldShell}
              data-open={isSearchOpen ? 'true' : 'false'}
            >
              <FiSearch className={styles.searchIcon} aria-hidden />
              <input
                ref={searchInputRef}
                id="table-search"
                className={styles.searchField}
                type="search"
                placeholder="Search transactions, accounts, notes…"
                value={searchQuery}
                onChange={handleSearchChange}
                onBlur={handleMobileSearchBlur}
              />
              <div className={styles.searchActions}>
                {searchQuery ? (
                  <button
                    type="button"
                    className={styles.searchActionButton}
                    onClick={handleSearchClear}
                    aria-label="Clear search"
                  >
                    <FiX aria-hidden />
                  </button>
                ) : null}
                <button
                  type="button"
                  className={styles.searchActionButton}
                  onClick={handleSearchRestore}
                  aria-label="Restore previous search"
                  disabled={!lastSearchRef.current || lastSearchRef.current === searchQuery}
                >
                  <FiRefreshCw aria-hidden />
                </button>
              </div>
            </div>
          </div>
        }
        right={
          <div className={styles.trailingArea}>
            {leadingActions ? (
              <div className={styles.leadingActions}>{leadingActions}</div>
            ) : null}
            {actionButtons}
            {trailingActions ? (
              <div className={styles.trailingActions}>{trailingActions}</div>
            ) : null}
          </div>
        }
      />

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
