import { useEffect, useMemo, useState } from 'react';
import { FiSearch, FiX } from 'react-icons/fi';

import styles from '../../styles/TransactionsHistory.module.css';

function slugify(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'value';
}

export function TransactionsFilterModal({
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

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setPeopleSearch('');
    setCategorySearch('');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !onSearchOptions) {
      return undefined;
    }
    const handle = setTimeout(() => {
      onSearchOptions('people', peopleSearch);
    }, 250);
    return () => clearTimeout(handle);
  }, [peopleSearch, isOpen, onSearchOptions]);

  useEffect(() => {
    if (!isOpen || !onSearchOptions) {
      return undefined;
    }
    const handle = setTimeout(() => {
      onSearchOptions('categories', categorySearch);
    }, 250);
    return () => clearTimeout(handle);
  }, [categorySearch, isOpen, onSearchOptions]);

  const normalizedPeopleSearch = peopleSearch.trim().toLowerCase();
  const normalizedCategorySearch = categorySearch.trim().toLowerCase();

  const visiblePeopleOptions = useMemo(() => {
    const base = ['all', ...(options.people ?? [])];
    if (!normalizedPeopleSearch) {
      return base;
    }
    return base.filter((option) =>
      option === 'all' ? true : option.toLowerCase().includes(normalizedPeopleSearch),
    );
  }, [options.people, normalizedPeopleSearch]);

  const visibleCategoryOptions = useMemo(() => {
    const base = ['all', ...(options.categories ?? [])];
    if (!normalizedCategorySearch) {
      return base;
    }
    return base.filter((option) =>
      option === 'all' ? true : option.toLowerCase().includes(normalizedCategorySearch),
    );
  }, [options.categories, normalizedCategorySearch]);

  const hasPeopleMatches = visiblePeopleOptions.some((option) => option !== 'all');
  const hasCategoryMatches = visibleCategoryOptions.some((option) => option !== 'all');

  const handleChange = (field) => (event) => {
    onChange(field, event.target.value);
  };

  const handleToggle = (field, value) => (event) => {
    onToggleOption?.(field, value, event.target.checked);
  };

  const handleSelectOption = (field, value) => () => {
    onChange(field, value);
  };

  const selectedTypes = new Set(filters.types ?? []);
  const selectedDebtTags = new Set(filters.debtTags ?? []);

  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.modalOverlay} data-testid="transactions-filter-modal" role="dialog" aria-modal="true">
      <div className={styles.modalContent}>
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
          <div className={styles.modalField}>
            <label htmlFor="filter-person-search" className={styles.modalLabel}>
              Person
            </label>
            <div className={styles.modalPicker}>
              <div className={`${styles.modalPickerSearch} ${styles.modalSearchGroup}`}>
                <FiSearch aria-hidden className={styles.modalSearchIcon} />
                <input
                  id="filter-person-search"
                  type="search"
                  placeholder="Search people"
                  className={styles.modalSearchInput}
                  value={peopleSearch}
                  onChange={(event) => setPeopleSearch(event.target.value)}
                  data-testid="transactions-filter-person-search"
                />
              </div>
              <div
                className={styles.modalOptionList}
                role="listbox"
                aria-label="Filter by person"
                data-testid="transactions-filter-person"
              >
                {visiblePeopleOptions.map((person) => {
                  const value = person;
                  const label = person === 'all' ? 'All' : person;
                  const isSelected = filters.person === value;
                  return (
                    <button
                      type="button"
                      key={value || 'all'}
                      className={`${styles.modalOptionButton} ${
                        isSelected ? styles.modalOptionButtonActive : ''
                      }`}
                      onClick={handleSelectOption('person', value)}
                      role="option"
                      aria-selected={isSelected}
                      data-testid={`transactions-filter-person-option-${slugify(value)}`}
                    >
                      {label}
                    </button>
                  );
                })}
                {!hasPeopleMatches ? (
                  <span className={styles.emptyOption}>No people match</span>
                ) : null}
              </div>
            </div>
          </div>

          <div className={styles.modalField}>
            <label htmlFor="filter-category-search" className={styles.modalLabel}>
              Category
            </label>
            <div className={styles.modalPicker}>
              <div className={`${styles.modalPickerSearch} ${styles.modalSearchGroup}`}>
                <FiSearch aria-hidden className={styles.modalSearchIcon} />
                <input
                  id="filter-category-search"
                  type="search"
                  placeholder="Search categories"
                  className={styles.modalSearchInput}
                  value={categorySearch}
                  onChange={(event) => setCategorySearch(event.target.value)}
                  data-testid="transactions-filter-category-search"
                />
              </div>
              <div
                className={styles.modalOptionList}
                role="listbox"
                aria-label="Filter by category"
                data-testid="transactions-filter-category"
              >
                {visibleCategoryOptions.map((category) => {
                  const value = category;
                  const label = category === 'all' ? 'All' : category;
                  const isSelected = filters.category === value;
                  return (
                    <button
                      type="button"
                      key={value || 'all'}
                      className={`${styles.modalOptionButton} ${
                        isSelected ? styles.modalOptionButtonActive : ''
                      }`}
                      onClick={handleSelectOption('category', value)}
                      role="option"
                      aria-selected={isSelected}
                      data-testid={`transactions-filter-category-option-${slugify(value)}`}
                    >
                      {label}
                    </button>
                  );
                })}
                {!hasCategoryMatches ? (
                  <span className={styles.emptyOption}>No categories match</span>
                ) : null}
              </div>
            </div>
          </div>

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
            <div className={styles.tagList}>
              {options.debtTags?.length ? (
                options.debtTags.map((tag) => {
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
                <span className={styles.emptyOption}>No debt tags available</span>
              )}
            </div>
          </div>

          <div className={styles.modalField}>
            <label htmlFor="filter-year" className={styles.modalLabel}>
              Year
            </label>
            <select
              id="filter-year"
              className={styles.modalControl}
              value={filters.year}
              onChange={handleChange('year')}
              data-testid="transactions-filter-year"
            >
              <option value="all">All</option>
              {options.years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.modalField}>
            <label htmlFor="filter-month" className={styles.modalLabel}>
              Month
            </label>
            <select
              id="filter-month"
              className={styles.modalControl}
              value={filters.month}
              onChange={handleChange('month')}
              data-testid="transactions-filter-month"
            >
              <option value="all">All</option>
              {options.months.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </div>
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
