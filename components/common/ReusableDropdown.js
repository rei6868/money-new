import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiChevronDown, FiX } from 'react-icons/fi';

import styles from './ReusableDropdown.module.css';

const normalizeOption = (option, index) => {
  if (typeof option === 'string' || typeof option === 'number') {
    const label = String(option);
    return {
      key: `${label}-${index}`,
      value: label,
      label,
      original: option,
    };
  }

  if (option && typeof option === 'object') {
    const rawValue =
      option.value !== undefined
        ? option.value
        : option.id !== undefined
          ? option.id
          : option.label ?? '';
    const value = String(rawValue ?? '');
    const label = option.label ?? String(rawValue ?? '');

    return {
      key: option.key ?? `${value}-${index}`,
      value,
      label,
      original: option,
    };
  }

  return null;
};

export default function ReusableDropdown({
  options = [],
  value,
  onChange,
  placeholder = 'Select an option',
  label,
  id,
  testIdPrefix,
  disabled = false,
  className = '',
  openOnMount = false,
  onOpenChange,
  searchPlaceholder = 'Search...',
  onAddNew,
  addNewLabel = '+ New',
  ariaLabel,
  hasError = false,
  filterTabs = [],
}) {
  const normalizedValue = value === undefined || value === null ? '' : String(value);
  const normalizedOptions = useMemo(
    () => options.map((option, index) => normalizeOption(option, index)).filter(Boolean),
    [options],
  );
  const normalizedFilterTabs = useMemo(() => {
    if (!Array.isArray(filterTabs)) {
      return [];
    }

    return filterTabs
      .map((tab, index) => {
        if (typeof tab === 'string' || typeof tab === 'number') {
          const label = String(tab);
          const valueKey = label.trim().toLowerCase().replace(/\s+/g, '-');
          return {
            key: `filter-${valueKey || index}`,
            value: valueKey || `filter-${index}`,
            label,
          };
        }

        if (tab && typeof tab === 'object') {
          const label = tab.label !== undefined ? String(tab.label) : '';
          const rawValue = tab.value !== undefined ? tab.value : label;
          const value = String(rawValue ?? `filter-${index}`);
          return {
            key: tab.key ?? `filter-${value}-${index}`,
            value,
            label,
          };
        }

        return null;
      })
      .filter(Boolean);
  }, [filterTabs]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [openDirection, setOpenDirection] = useState('down');
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const searchInputRef = useRef(null);
  const [activeFilterTab, setActiveFilterTab] = useState(() =>
    normalizedFilterTabs.length > 0 ? normalizedFilterTabs[0].value : null,
  );

  const selectedOption = useMemo(
    () => normalizedOptions.find((option) => option.value === normalizedValue) ?? null,
    [normalizedOptions, normalizedValue],
  );

  const filteredOptions = useMemo(() => {
    if (!searchTerm) {
      return normalizedOptions;
    }

    const normalizedTerm = searchTerm.trim().toLowerCase();
    return normalizedOptions.filter((option) =>
      option.label.toLowerCase().includes(normalizedTerm),
    );
  }, [normalizedOptions, searchTerm]);

  const closeDropdown = useCallback(
    (focusTrigger = false) => {
      setIsOpen(false);
      setSearchTerm('');
      onOpenChange?.(false);
      setOpenDirection('down');
      if (focusTrigger) {
        requestAnimationFrame(() => {
          triggerRef.current?.focus();
        });
      }
    },
    [onOpenChange],
  );

  const toggleDropdown = () => {
    if (disabled) {
      return;
    }
    setOpenDirection('down');
    setIsOpen((prev) => {
      const next = !prev;
      if (next) {
        setSearchTerm('');
      }
      onOpenChange?.(next);
      return next;
    });
  };

  useEffect(() => {
    if (!openOnMount || disabled) {
      return;
    }
    setIsOpen(true);
    setSearchTerm('');
    onOpenChange?.(true);
  }, [openOnMount, disabled, onOpenChange]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleClick = (event) => {
      if (
        menuRef.current?.contains(event.target) ||
        triggerRef.current?.contains(event.target)
      ) {
        return;
      }
      closeDropdown();
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDropdown(true);
      }
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closeDropdown]);

  useEffect(() => {
    if (normalizedFilterTabs.length === 0) {
      setActiveFilterTab(null);
      return;
    }

    setActiveFilterTab((previous) => {
      if (previous && normalizedFilterTabs.some((tab) => tab.value === previous)) {
        return previous;
      }
      return normalizedFilterTabs[0].value;
    });
  }, [normalizedFilterTabs]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    if (typeof window === 'undefined') {
      return undefined;
    }

    const updateMenuDirection = () => {
      const triggerEl = triggerRef.current;
      const menuEl = menuRef.current;

      if (!triggerEl || !menuEl) {
        return;
      }

      const triggerRect = triggerEl.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - triggerRect.bottom;
      const spaceAbove = triggerRect.top;
      const menuHeight = menuEl.offsetHeight;

      const shouldOpenUpward = menuHeight > spaceBelow && spaceAbove > spaceBelow;
      const nextDirection = shouldOpenUpward ? 'up' : 'down';

      setOpenDirection((previous) => (previous === nextDirection ? previous : nextDirection));
    };

    const rafId = requestAnimationFrame(updateMenuDirection);
    const handleScroll = () => updateMenuDirection();

    window.addEventListener('resize', updateMenuDirection);
    document.addEventListener('scroll', handleScroll, true);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updateMenuDirection);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, filteredOptions.length]);

  const handleSelect = (option) => {
    if (!option) {
      return;
    }
    onChange?.(option.value, option.original ?? option);
    closeDropdown();
  };

  const handleClear = (event) => {
    event.stopPropagation();
    if (disabled) {
      return;
    }
    onChange?.('', null);
    closeDropdown();
  };

  const handleNewClick = useCallback(() => {
    if (disabled) {
      return;
    }
    onAddNew?.();
    closeDropdown();
  }, [closeDropdown, disabled, onAddNew]);

  const dropdownId = id ?? `reusable-dropdown-${Math.random().toString(36).slice(2)}`;
  const triggerTestId = testIdPrefix ? `${testIdPrefix}-trigger` : undefined;
  const searchTestId = testIdPrefix ? `${testIdPrefix}-search` : undefined;
  const triggerAriaLabel = ariaLabel ?? (label ? undefined : placeholder);
  const filterTabsAriaLabel = label ? `${label} filters` : 'Filter options';

  return (
    <div
      className={`${styles.dropdown} ${className}`}
      data-disabled={disabled ? 'true' : undefined}
      data-error={hasError ? 'true' : undefined}
    >
      {label ? (
        <label className={styles.label} htmlFor={`${dropdownId}-search`}>
          {label}
        </label>
      ) : null}
      <button
        type="button"
        id={dropdownId}
        ref={triggerRef}
        className={styles.trigger}
        onClick={toggleDropdown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={triggerAriaLabel}
        data-placeholder={selectedOption ? 'false' : 'true'}
        data-testid={triggerTestId}
      >
        <span className={styles.triggerText}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className={styles.triggerIcons}>
          {selectedOption ? (
            <button
              type="button"
              className={styles.clearButton}
              onClick={handleClear}
              aria-label="Clear selection"
              data-testid={testIdPrefix ? `${testIdPrefix}-clear` : undefined}
            >
              <FiX aria-hidden />
            </button>
          ) : null}
          <FiChevronDown aria-hidden className={styles.chevronIcon} />
        </span>
      </button>

      {isOpen ? (
        <div
          className={styles.menu}
          ref={menuRef}
          role="listbox"
          data-direction={openDirection}
        >
          <div className={styles.searchWrapper}>
            <input
              ref={searchInputRef}
              id={`${dropdownId}-search`}
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={searchPlaceholder}
              className={styles.searchInput}
              data-testid={searchTestId}
            />
          </div>
          {normalizedFilterTabs.length > 0 ? (
            <div className={styles.filterTabs} role="tablist" aria-label={filterTabsAriaLabel}>
              {normalizedFilterTabs.map((tab) => (
                <button
                  type="button"
                  key={tab.key}
                  className={`${styles.filterTabButton} ${
                    activeFilterTab === tab.value ? styles.filterTabButtonActive : ''
                  }`}
                  onClick={() => setActiveFilterTab(tab.value)}
                  role="tab"
                  aria-selected={activeFilterTab === tab.value}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          ) : null}
          <div className={styles.optionsScrollArea}>
            <ul className={styles.optionsList}>
              {filteredOptions.length === 0 ? (
                <li className={styles.emptyState}>No matches found</li>
              ) : (
                filteredOptions.map((option) => (
                  <li key={option.key}>
                    <button
                      type="button"
                      className={styles.optionButton}
                      onClick={() => handleSelect(option)}
                      data-selected={option.value === normalizedValue ? 'true' : 'false'}
                      role="option"
                      aria-selected={option.value === normalizedValue}
                      data-testid={
                        testIdPrefix ? `${testIdPrefix}-option-${option.value}` : undefined
                      }
                    >
                      {option.label}
                    </button>
                  </li>
                ))
              )}
            </ul>
            {onAddNew ? (
              <div className={styles.newActionFooter}>
                <button
                  type="button"
                  className={`${styles.newButton} ${styles.stickyNewButton}`}
                  onClick={handleNewClick}
                >
                  {addNewLabel}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
