import { FiX } from 'react-icons/fi';

import styles from '../../styles/TransactionsHistory.module.css';

export function TransactionsFilterModal({
  isOpen,
  filters,
  onChange,
  onClose,
  onReset,
  onApply,
  options,
}) {
  if (!isOpen) {
    return null;
  }

  const handleChange = (field) => (event) => {
    onChange(field, event.target.value);
  };

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
            <label htmlFor="filter-person" className={styles.modalLabel}>
              Person
            </label>
            <select
              id="filter-person"
              className={styles.modalControl}
              value={filters.person}
              onChange={handleChange('person')}
              data-testid="transactions-filter-person"
            >
              <option value="all">All</option>
              {options.people.map((person) => (
                <option key={person} value={person}>
                  {person}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.modalField}>
            <label htmlFor="filter-category" className={styles.modalLabel}>
              Category
            </label>
            <select
              id="filter-category"
              className={styles.modalControl}
              value={filters.category}
              onChange={handleChange('category')}
              data-testid="transactions-filter-category"
            >
              <option value="all">All</option>
              {options.categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
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

