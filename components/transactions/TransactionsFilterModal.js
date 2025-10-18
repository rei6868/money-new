import { useEffect, useMemo, useState } from 'react';
import { FiSearch, FiX } from 'react-icons/fi';

import styles from '../../styles/TransactionsHistory.module.css';

function slugify(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'value';
}

function ModalSingleSelect({
  id,
  label,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  options = [],
  selectedValue,
  onSelectOption,
  emptyMessage,
  testIdPrefix,
}) {
  const normalizedOptions = options.includes('all') ? options : ['all', ...options];
  const normalizedSearch = searchValue.trim().toLowerCase();
  const filteredOptions = normalizedSearch
    ? normalizedOptions.filter((option) =>
        option === 'all' ? true : option.toLowerCase().includes(normalizedSearch),
      )
    : normalizedOptions;
  const hasMatches = filteredOptions.some((option) => option !== 'all');

  return (
    <div className={styles.modalField}>
      <label htmlFor={`${id}-search`} className={styles.modalLabel}>
        {label}
      </label>
      <div className={styles.modalPicker}>
        <div className={`${styles.modalPickerSearch} ${styles.modalSearchGroup}`}>
          <FiSearch aria-hidden className={styles.modalSearchIcon} />
          <input
            id={`${id}-search`}
            type="search"
            placeholder={searchPlaceholder}
            className={styles.modalSearchInput}
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            data-testid={`${testIdPrefix}-search`}
          />
        </div>
        <div
          className={styles.modalOptionList}
          role="listbox"
          aria-label={label}
          data-testid={testIdPrefix}
        >
          {filteredOptions.map((option) => {
            const value = option;
            const optionLabel = option === 'all' ? 'All' : option;
            const isSelected = selectedValue === value;
            return (
              <button
                type="button"
                key={value || 'all'}
                className={`${styles.modalOptionButton} ${
                  isSelected ? styles.modalOptionButtonActive : ''
                }`}
                onClick={onSelectOption(value)}
                role="option"
                aria-selected={isSelected}
                data-testid={`${testIdPrefix}-option-${slugify(value)}`}
              >
                {optionLabel}
              </button>
            );
          })}
          {!hasMatches ? <span className={styles.emptyOption}>{emptyMessage}</span> : null}
        </div>
      </div>
    </div>
  );
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
  const [debtTagSearch, setDebtTagSearch] = useState('');

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setPeopleSearch('');
    setCategorySearch('');
    setDebtTagSearch('');
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
  const normalizedDebtTagSearch = debtTagSearch.trim().toLowerCase();

  const visibleDebtTags = useMemo(() => {
    const base = options.debtTags ?? [];
    if (!normalizedDebtTagSearch) {
      return base;
    }
    return base.filter((tag) => tag.toLowerCase().includes(normalizedDebtTagSearch));
  }, [options.debtTags, normalizedDebtTagSearch]);

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
          <ModalSingleSelect
            id="filter-person"
            label="Person"
            searchPlaceholder="Search people"
            searchValue={peopleSearch}
            onSearchChange={setPeopleSearch}
            options={options.people ?? []}
            selectedValue={filters.person}
            onSelectOption={(value) => handleSelectOption('person', value)}
            emptyMessage="No people match"
            testIdPrefix="transactions-filter-person"
          />

          <ModalSingleSelect
            id="filter-category"
            label="Category"
            searchPlaceholder="Search categories"
            searchValue={categorySearch}
            onSearchChange={setCategorySearch}
            options={options.categories ?? []}
            selectedValue={filters.category}
            onSelectOption={(value) => handleSelectOption('category', value)}
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
