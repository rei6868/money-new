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
}) {
  const normalizedValue = value === undefined || value === null ? '' : String(value);
  const normalizedOptions = useMemo(
    () => options.map((option, index) => normalizeOption(option, index)).filter(Boolean),
    [options],
  );
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const searchInputRef = useRef(null);

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
    if (!isOpen) {
      return;
    }
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  }, [isOpen]);

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
    // eslint-disable-next-line no-console
    console.log('Add New clicked');
  }, []);

  const dropdownId = id ?? `reusable-dropdown-${Math.random().toString(36).slice(2)}`;
  const triggerTestId = testIdPrefix ? `${testIdPrefix}-trigger` : undefined;
  const searchTestId = testIdPrefix ? `${testIdPrefix}-search` : undefined;

  return (
    <div className={`${styles.dropdown} ${className}`} data-disabled={disabled ? 'true' : undefined}>
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
        <div className={styles.menu} ref={menuRef} role="listbox">
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
          <div className={styles.menuActions}>
            <button type="button" className={styles.newButton} onClick={handleNewClick}>
              + New
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
