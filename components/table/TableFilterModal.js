import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiSearch, FiX } from 'react-icons/fi';

import styles from '../../styles/TransactionsHistory.module.css';
import { DropdownSimple } from '../common/DropdownSimple';
import { DropdownWithSearch } from '../common/DropdownWithSearch';

export function TableFilterModal({
  isOpen,
  filters,
  onChange,
  onToggleOption,
  onClose,
  onReset,
  onApply,
  options = { people: [], categories: [], years: [], months: [], types: [], debtTags: [] },
  onSearchOptions,
}) {
  const [peopleSearch, setPeopleSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [debtTagSearch, setDebtTagSearch] = useState('');
  const [openDropdown, setOpenDropdown] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setPeopleSearch('');
    setCategorySearch('');
    setDebtTagSearch('');
    setOpenDropdown(null);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !onSearchOptions || openDropdown !== 'person') {
      return undefined;
    }
    const handle = setTimeout(() => {
      onSearchOptions('people', peopleSearch);
    }, 250);
    return () => clearTimeout(handle);
  }, [peopleSearch, isOpen, onSearchOptions, openDropdown]);

  useEffect(() => {
    if (!isOpen || !onSearchOptions || openDropdown !== 'category') {
      return undefined;
    }
    const handle = setTimeout(() => {
      onSearchOptions('categories', categorySearch);
    }, 250);
    return () => clearTimeout(handle);
  }, [categorySearch, isOpen, onSearchOptions, openDropdown]);

  const normalizedPeopleSearch = peopleSearch.trim().toLowerCase();
  const normalizedCategorySearch = categorySearch.trim().toLowerCase();
  const normalizedDebtTagSearch = debtTagSearch.trim().toLowerCase();

  const visibleDebtTags = useMemo(() => {
    const base = options.debtTags ?? [];
    if (!normalizedDebtTagSearch) {
      return base;
    }
    return base.filter((tag) => tag.toLowerCase().includes(normalizedDebtTagSearch));
  }, [options.debtTags, normalizedDebtTagSearch]);

  const handleDropdownToggle = useCallback((id) => {
    setOpenDropdown((current) => (current === id ? null : id));
  }, []);

  const handleChange = useCallback(
    (field, value) => {
      onChange(field, value);
    },
    [onChange],
  );

  const handleToggle = (field, value) => (event) => {
    onToggleOption?.(field, value, event.target.checked);
  };

  const handleSelectOption = useCallback(
    (field, value) => {
      handleChange(field, value);
      setOpenDropdown(null);
    },
    [handleChange],
  );

  const handleOverlayDismiss = useCallback(
    (event) => {
      event.stopPropagation();
      onClose?.();
    },
    [onClose],
  );

  const handleContentClick = useCallback((event) => {
    event.stopPropagation();
  }, []);

  const selectedTypes = new Set(filters.types ?? []);
  const selectedDebtTags = new Set(filters.debtTags ?? []);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={styles.modalOverlay}
      data-testid="transactions-filter-modal"
      role="dialog"
      aria-modal="true"
      onMouseDown={handleOverlayDismiss}
    >
      <div className={styles.modalContent} onMouseDown={handleContentClick}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Filter Transactions</h2>
          <button
            type="button"
            className={styles.iconButton}
            onClick={onClose}
            data-testid="transactions-filter-close"
            aria-label="Close filters"
          >
            <FiX aria-hidden />
          </button>
        </div>

        <div className={styles.modalBody}>
          <DropdownWithSearch
            id="filter-person"
            label="Person"
            isOpen={openDropdown === 'person'}
            onToggle={handleDropdownToggle}
            options={options.people ?? []}
            searchValue={peopleSearch}
            searchPlaceholder="Search people"
            onSearchChange={setPeopleSearch}
            onSelectOption={(value) => handleSelectOption('person', value)}
            selectedValue={filters.person}
            emptyMessage="No people match"
            testIdPrefix="transactions-filter-person"
          />

          <DropdownWithSearch
            id="filter-category"
            label="Category"
            isOpen={openDropdown === 'category'}
            onToggle={handleDropdownToggle}
            options={options.categories ?? []}
            searchValue={categorySearch}
            searchPlaceholder="Search categories"
            onSearchChange={setCategorySearch}
            onSelectOption={(value) => handleSelectOption('category', value)}
            selectedValue={filters.category}
            emptyMessage="No categories match"
            testIdPrefix="transactions-filter-category"
          />

          <div className={styles.modalField}>
            <span className={styles.modalLabel}>Type</span>
            <div className={styles.tagList}>
              {options.types?.length ? (
                options.types.map((type) => {
                  const isSelected = selectedTypes.has(type);
                  return (
                    <label
                      key={type}
                      className={`${styles.tagOption} ${isSelected ? styles.tagOptionActive : ''}`}
                      data-testid={`transactions-filter-type-${type}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={handleToggle('types', type)}
                      />
                      <span>{type}</span>
                    </label>
                  );
                })
              ) : (
                <span className={styles.emptyOption}>No types available</span>
              )}
            </div>
          </div>

          <div className={styles.modalField}>
            <span className={styles.modalLabel}>Debt Tag</span>
            <div className={styles.modalPicker}>
              <div className={`${styles.modalPickerSearch} ${styles.modalSearchGroup}`}>
                <FiSearch aria-hidden className={styles.modalSearchIcon} />
                <input
                  type="search"
                  placeholder="Search debt tags"
                  className={styles.modalSearchInput}
                  value={debtTagSearch}
                  onChange={(event) => setDebtTagSearch(event.target.value)}
                  data-testid="transactions-filter-debt-search"
                />
              </div>
              <div className={styles.tagList} data-testid="transactions-filter-debt">
                {visibleDebtTags.length ? (
                  visibleDebtTags.map((tag) => {
                    const isSelected = selectedDebtTags.has(tag);
                    return (
                      <label
                        key={tag}
                        className={`${styles.tagOption} ${isSelected ? styles.tagOptionActive : ''}`}
                        data-testid={`transactions-filter-debt-${tag}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={handleToggle('debtTags', tag)}
                        />
                        <span>{tag}</span>
                      </label>
                    );
                  })
                ) : (
                  <span className={styles.emptyOption}>No debt tags match</span>
                )}
              </div>
            </div>
          </div>

          <DropdownSimple
            id="filter-year"
            label="Year"
            isOpen={openDropdown === 'year'}
            onToggle={handleDropdownToggle}
            options={options.years ?? []}
            value={filters.year}
            onSelect={(value) => handleSelectOption('year', value)}
            testIdPrefix="transactions-filter-year"
          />

          <DropdownSimple
            id="filter-month"
            label="Month"
            isOpen={openDropdown === 'month'}
            onToggle={handleDropdownToggle}
            options={options.months ?? []}
            value={filters.month}
            onSelect={(value) => handleSelectOption('month', value)}
            testIdPrefix="transactions-filter-month"
          />
        </div>

        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={onReset}
            data-testid="transactions-filter-reset"
          >
            Reset
          </button>
          <button
            type="button"
            className={styles.modalApply}
            onClick={onApply}
            data-testid="transactions-filter-apply"
          >
            Apply filters
          </button>
        </div>
      </div>
    </div>
  );
}
