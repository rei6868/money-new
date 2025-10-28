import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FiFilter,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiSettings,
  FiX,
} from 'react-icons/fi';

import QuickAddModal, {
  QuickAddActionId,
  QuickAddContext,
} from './QuickAddModal';
import styles from '../../styles/HeaderActionBar.module.css';

type HeaderActionBarProps = {
  context: QuickAddContext;
  onAdd?: () => void;
  addLabel?: string;
  addDisabled?: boolean;
  onQuickAddSelect?: (context: QuickAddContext, actionId: QuickAddActionId) => void;
  quickAddDisabled?: boolean;
  searchValue: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  onSearchClear?: () => void;
  onSearchRestore?: () => void;
  onFilterClick?: () => void;
  onCustomizeClick?: () => void;
};

function useBreakpoint(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    const media = window.matchMedia(query);
    const handleChange = () => setMatches(media.matches);
    handleChange();
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, [query]);
  return matches;
}

export function HeaderActionBar({
  context,
  onAdd,
  addLabel,
  addDisabled = false,
  onQuickAddSelect,
  quickAddDisabled = false,
  searchValue,
  searchPlaceholder,
  onSearchChange,
  onSearchClear,
  onSearchRestore,
  onFilterClick,
  onCustomizeClick,
}: HeaderActionBarProps) {
  const isCompact = useBreakpoint('(max-width: 720px)');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const previousSearch = useRef<string>('');

  const normalizedAddLabel = useMemo(() => {
    if (addLabel) {
      return addLabel;
    }
    return context === 'accounts' ? 'Add account' : 'Add transaction';
  }, [addLabel, context]);

  const normalizedPlaceholder =
    searchPlaceholder ?? (context === 'accounts' ? 'Search accounts' : 'Search transactions');

  useEffect(() => {
    if (searchValue) {
      previousSearch.current = searchValue;
    }
  }, [searchValue]);

  useEffect(() => {
    if (!isCompact) {
      setIsMobileSearchOpen(false);
    }
  }, [isCompact]);

  useEffect(() => {
    if (isMobileSearchOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isMobileSearchOpen]);

  const handleClear = () => {
    previousSearch.current = searchValue;
    onSearchClear?.();
    if (isCompact) {
      setIsMobileSearchOpen(false);
    }
  };

  const handleRestore = () => {
    if (!previousSearch.current) {
      return;
    }
    onSearchRestore?.();
    if (isCompact) {
      setIsMobileSearchOpen(true);
      window.requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const renderSearchField = (variant: 'desktop' | 'mobile') => (
    <div className={styles.searchShell} data-variant={variant} data-open={isCompact && isMobileSearchOpen ? 'true' : undefined}>
      <FiSearch className={styles.searchIcon} aria-hidden />
      <input
        ref={inputRef}
        type="search"
        className={styles.searchInput}
        value={searchValue}
        placeholder={normalizedPlaceholder}
        onChange={(event) => onSearchChange?.(event.target.value)}
      />
      <div className={styles.searchActions}>
        {searchValue ? (
          <button
            type="button"
            className={styles.searchActionButton}
            onClick={handleClear}
            aria-label="Clear search"
          >
            <FiX aria-hidden />
          </button>
        ) : null}
        <button
          type="button"
          className={styles.searchActionButton}
          onClick={handleRestore}
          aria-label="Restore previous search"
          disabled={!previousSearch.current}
        >
          <FiRefreshCw aria-hidden />
        </button>
      </div>
    </div>
  );

  return (
    <section className={styles.headerBar} data-compact={isCompact ? 'true' : undefined}>
      <div className={styles.actionRow}>
        <button
          type="button"
          className={styles.addButton}
          onClick={onAdd}
          disabled={addDisabled}
          aria-label={normalizedAddLabel}
        >
          <FiPlus aria-hidden />
          <span>{normalizedAddLabel}</span>
        </button>

        {isCompact ? (
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => setIsMobileSearchOpen((value) => !value)}
            aria-label={isMobileSearchOpen ? 'Hide search' : 'Show search'}
            data-active={isMobileSearchOpen ? 'true' : undefined}
          >
            <FiSearch aria-hidden />
          </button>
        ) : (
          renderSearchField('desktop')
        )}

        <QuickAddModal
          context={context}
          onSelect={onQuickAddSelect}
          disabled={quickAddDisabled}
          className={styles.quickAdd}
          triggerLabel="Quick add"
          triggerAriaLabel="Open quick add"
        />

        <button
          type="button"
          className={styles.iconButton}
          onClick={onFilterClick}
          aria-label="Open filters"
        >
          <FiFilter aria-hidden />
        </button>
        <button
          type="button"
          className={styles.iconButton}
          onClick={onCustomizeClick}
          aria-label="Customize columns"
        >
          <FiSettings aria-hidden />
        </button>
      </div>

      {isCompact ? (
        <div className={styles.mobileSearchContainer} data-open={isMobileSearchOpen ? 'true' : undefined}>
          {renderSearchField('mobile')}
        </div>
      ) : null}
    </section>
  );
}

export default HeaderActionBar;
