import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiCheck, FiChevronDown, FiX } from 'react-icons/fi';

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
  multiple = false,
  onSearchTermChange,
  isLoading = false,
  emptyState = 'No matches found',
}) {
  const normalizedOptions = useMemo(
    () => options.map((option, index) => normalizeOption(option, index)).filter(Boolean),
    [options],
  );
  const normalizedValue = useMemo(() => {
    if (multiple) {
      if (Array.isArray(value)) {
        return value.map((item) => String(item));
      }
      if (typeof value === 'string' && value.length > 0) {
        return [value];
      }
      return [];
    }
    return value === undefined || value === null ? '' : String(value);
  }, [multiple, value]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const searchInputRef = useRef(null);
  const [menuStyles, setMenuStyles] = useState(null);

  const selectedOption = useMemo(() => {
    if (multiple) {
      return null;
    }
    return normalizedOptions.find((option) => option.value === normalizedValue) ?? null;
  }, [multiple, normalizedOptions, normalizedValue]);

  const selectedOptions = useMemo(() => {
    if (!multiple) {
      return [];
    }
    const valueSet = new Set(Array.isArray(normalizedValue) ? normalizedValue : []);
    return normalizedOptions.filter((option) => valueSet.has(option.value));
  }, [multiple, normalizedOptions, normalizedValue]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) {
      return normalizedOptions;
    }

    const normalizedTerm = searchTerm.trim().toLowerCase();
    return normalizedOptions.filter((option) => option.label.toLowerCase().includes(normalizedTerm));
  }, [normalizedOptions, searchTerm]);

  const displayLabel = useMemo(() => {
    if (multiple) {
      if (!selectedOptions.length) {
        return placeholder;
      }
      if (selectedOptions.length > 2) {
        const preview = selectedOptions.slice(0, 2).map((option) => option.label).join(', ');
        return `${preview} +${selectedOptions.length - 2}`;
      }
      return selectedOptions.map((option) => option.label).join(', ');
    }
    return selectedOption ? selectedOption.label : placeholder;
  }, [multiple, placeholder, selectedOption, selectedOptions]);

  const closeDropdown = useCallback(
    (focusTrigger = false) => {
      setIsOpen(false);
      setSearchTerm('');
      onSearchTermChange?.('');
      onOpenChange?.(false);
      setMenuStyles(null);
      if (focusTrigger) {
        requestAnimationFrame(() => {
          triggerRef.current?.focus();
        });
      }
    },
    [onOpenChange, onSearchTermChange],
  );

  const toggleDropdown = () => {
    if (disabled) {
      return;
    }

    if (isOpen) {
      closeDropdown(true);
      return;
    }

    setIsOpen(true);
    setSearchTerm('');
    onSearchTermChange?.('');
    onOpenChange?.(true);
  };

  const updateMenuPosition = useCallback(() => {
    if (!isOpen || typeof window === 'undefined' || !triggerRef.current) {
      return;
    }

    const rect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth || 0;
    const horizontalMargin = 12;
    const verticalMargin = 8;
    const maxAvailableWidth = Math.max(viewportWidth - horizontalMargin * 2, 180);
    const width = Math.min(Math.max(rect.width, 180), maxAvailableWidth);
    const maxLeft = Math.max(viewportWidth - width - horizontalMargin, horizontalMargin);
    const left = Math.min(Math.max(rect.left, horizontalMargin), maxLeft);
    const top = Math.max(rect.bottom, verticalMargin);

    setMenuStyles((previous) => {
      const next = { top, left, width };
      if (
        previous &&
        previous.top === next.top &&
        previous.left === next.left &&
        previous.width === next.width
      ) {
        return previous;
      }
      return next;
    });
  }, [isOpen]);

  useEffect(() => {
    if (!openOnMount || disabled) {
      return;
    }
    setIsOpen(true);
    setSearchTerm('');
    onSearchTermChange?.('');
    onOpenChange?.(true);
  }, [openOnMount, disabled, onOpenChange, onSearchTermChange]);

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
    if (!isOpen || typeof window === 'undefined') {
      return undefined;
    }

    updateMenuPosition();
    const rafId = requestAnimationFrame(updateMenuPosition);

    const handleResize = () => {
      updateMenuPosition();
    };
    const handleScroll = () => {
      updateMenuPosition();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, updateMenuPosition]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  }, [isOpen]);

  const normalizedArray = useMemo(
    () => (multiple ? (Array.isArray(normalizedValue) ? normalizedValue : []) : []),
    [multiple, normalizedValue],
  );

  const handleSelect = (option) => {
    if (!option) {
      return;
    }

    if (multiple) {
      const nextValues = new Set(normalizedArray);
      if (nextValues.has(option.value)) {
        nextValues.delete(option.value);
      } else {
        nextValues.add(option.value);
      }
      onChange?.(Array.from(nextValues), option.original ?? option);
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

    if (multiple) {
      onChange?.([], null);
    } else {
      onChange?.('', null);
    }
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

  const handleSearchChange = (event) => {
    const next = event.target.value;
    setSearchTerm(next);
    onSearchTermChange?.(next);
  };

  const hasSelection = multiple ? selectedOptions.length > 0 : Boolean(selectedOption);
  const isPlaceholder = multiple ? selectedOptions.length === 0 : !selectedOption;

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
        data-placeholder={isPlaceholder ? 'true' : 'false'}
        data-testid={triggerTestId}
      >
        <span className={styles.triggerText}>
          {displayLabel}
        </span>
        <span className={styles.triggerIcons}>
          {hasSelection ? (
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

      {isOpen && typeof document !== 'undefined'
        ? createPortal(
            <div
              className={styles.menu}
              ref={menuRef}
              role="listbox"
              aria-multiselectable={multiple ? 'true' : undefined}
              style={{
                top: menuStyles ? `${menuStyles.top}px` : '0px',
                left: menuStyles ? `${menuStyles.left}px` : '0px',
                width: menuStyles ? `${menuStyles.width}px` : undefined,
                visibility: menuStyles ? 'visible' : 'hidden',
              }}
            >
              <div className={styles.searchWrapper}>
                <input
                  ref={searchInputRef}
                  id={`${dropdownId}-search`}
                  type="search"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder={searchPlaceholder}
                  className={styles.searchInput}
                  data-testid={searchTestId}
                />
              </div>
              {onAddNew ? (
                <div className={styles.menuNewAction}>
                  <button type="button" className={styles.newButton} onClick={handleNewClick}>
                    {addNewLabel}
                  </button>
                </div>
              ) : null}
              <ul className={styles.optionsList}>
                {isLoading ? (
                  <li className={styles.loadingState}>Loading…</li>
                ) : filteredOptions.length === 0 ? (
                  <li className={styles.emptyState}>{emptyState}</li>
                ) : (
                  filteredOptions.map((option) => (
                    <li key={option.key}>
                      <button
                        type="button"
                        className={styles.optionButton}
                        onClick={() => handleSelect(option)}
                        data-selected={
                          multiple
                            ? normalizedArray.includes(option.value)
                              ? 'true'
                              : 'false'
                            : option.value === normalizedValue
                            ? 'true'
                            : 'false'
                        }
                        role="option"
                        aria-selected={
                          multiple
                            ? normalizedArray.includes(option.value)
                            : option.value === normalizedValue
                        }
                        data-testid={
                          testIdPrefix ? `${testIdPrefix}-option-${option.value}` : undefined
                        }
                      >
                        <span className={styles.optionContent}>
                          {multiple ? (
                            <span className={styles.optionCheckbox} aria-hidden>
                              <FiCheck />
                            </span>
                          ) : null}
                          <span className={styles.optionLabel}>{option.label}</span>
                          {option.original?.description ? (
                            <span className={styles.optionDescription}>{option.original.description}</span>
                          ) : null}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
