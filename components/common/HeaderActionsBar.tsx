import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FiFilter,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiSettings,
  FiX,
} from 'react-icons/fi';

import QuickAddMenu, {
  QuickAddActionId,
  QuickAddContext,
} from './QuickAddMenu';
import styles from '../../styles/HeaderActionsBar.module.css';

type HeaderActionsBarProps = {
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
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);
  return matches;
}

export function HeaderActionsBar({
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
}: HeaderActionsBarProps) {
  const isCompact = useBreakpoint('(max-width: 600px)');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const previousSearch = useRef<string>('');

  useEffect(() => {
    if (!isCompact) {
      setIsSearchExpanded(true);
    } else {
      setIsSearchExpanded(false);
    }
  }, [isCompact]);

  useEffect(() => {
    if (isSearchExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSearchExpanded]);

  useEffect(() => {
    if (searchValue) {
      previousSearch.current = searchValue;
    }
  }, [searchValue]);

  const normalizedAddLabel = useMemo(() => {
    if (addLabel) {
      return addLabel;
    }
    return context === 'accounts' ? 'Add Account' : 'Add Transaction';
  }, [addLabel, context]);

  const normalizedPlaceholder = searchPlaceholder ?? (context === 'accounts' ? 'Search accounts' : 'Search transactions');

  const handleClear = () => {
    previousSearch.current = searchValue;
    onSearchClear?.();
    if (isCompact) {
      setIsSearchExpanded(false);
    }
  };

  const handleRestore = () => {
    onSearchRestore?.();
    if (isCompact) {
      setIsSearchExpanded(true);
      window.requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const renderSearchField = (variant: 'desktop' | 'mobile') => (
    <div
      className={styles.searchShell}
      data-variant={variant}
      data-expanded={isSearchExpanded ? 'true' : undefined}
    >
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
        <button
          type="button"
          className={styles.iconButton}
          onClick={handleClear}
          aria-label="Clear search"
          disabled={!searchValue}
        >
          <FiX aria-hidden />
        </button>
        <button
          type="button"
          className={styles.iconButton}
          onClick={handleRestore}
          aria-label="Restore previous search"
          disabled={!previousSearch.current}
        >
          <FiRefreshCw aria-hidden />
        </button>
      </div>
    </div>
  );

  if (isCompact) {
    return (
      <section className={styles.headerBar} data-compact="true">
        <div className={styles.iconRow}>
          <button
            type="button"
            className={styles.iconButtonPrimary}
            onClick={onAdd}
            disabled={addDisabled}
            aria-label={normalizedAddLabel}
          >
            <FiPlus aria-hidden />
          </button>
          <button
            type="button"
            className={styles.iconButton}
            aria-pressed={isSearchExpanded}
            onClick={() => setIsSearchExpanded((value) => !value)}
            aria-label={isSearchExpanded ? 'Collapse search' : 'Expand search'}
          >
            <FiSearch aria-hidden />
          </button>
          <QuickAddMenu
            context={context}
            onSelect={onQuickAddSelect}
            disabled={quickAddDisabled}
            triggerLabel="Quick add"
            className={styles.quickAddMobile}
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
        <div className={styles.mobileSearchContainer} data-open={isSearchExpanded ? 'true' : undefined}>
          {renderSearchField('mobile')}
        </div>
      </section>
    );
  }

  return (
    <section className={styles.headerBar}>
      <div className={styles.primarySide}>
        <button
          type="button"
          className={styles.addButton}
          onClick={onAdd}
          disabled={addDisabled}
        >
          <FiPlus aria-hidden />
          <span>{normalizedAddLabel}</span>
        </button>
        {renderSearchField('desktop')}
      </div>
      <div className={styles.secondarySide}>
        <QuickAddMenu
          context={context}
          onSelect={onQuickAddSelect}
          disabled={quickAddDisabled}
          triggerLabel="Quick add"
          className={styles.quickAddDesktop}
        />
        <button type="button" className={styles.iconButton} onClick={onFilterClick} aria-label="Open filters">
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
    </section>
  );
}

export default HeaderActionsBar;
