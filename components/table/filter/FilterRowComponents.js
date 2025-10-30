import { DropdownWithSearch, DropdownWithSearchContent } from '../../common/DropdownWithSearch';
import styles from '../../../styles/TransactionsHistory.module.css';

export function FilterDropdownSearchRow(props) {
  return <DropdownWithSearch {...props} />;
}

export function FilterDropdownMultiSearchRow({ selectedValues = [], ...rest }) {
  return (
    <DropdownWithSearchContent
      selectedValues={Array.isArray(selectedValues) ? selectedValues : []}
      {...rest}
    />
  );
}

export function FilterAmountRow({
  operatorOptions = [],
  operatorValue = 'all',
  onOperatorSelect,
  amountValue = '',
  onAmountChange,
  isAmountDisabled = false,
}) {
  return (
    <div className={styles.columnFilterSection}>
      <div className={styles.columnFilterGroup}>
        <label htmlFor="transactions-filter-amount-operator" className={styles.modalLabel}>
          Amount operator
        </label>
        <select
          id="transactions-filter-amount-operator"
          className={styles.modalControl}
          value={operatorValue}
          onChange={(event) => onOperatorSelect?.(event.target.value)}
        >
          {operatorOptions.map((option) => (
            <option key={`amount-operator-${option.value}`} value={option.value}>
              {option.label ?? option.value}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.columnFilterGroup}>
        <label htmlFor="transactions-filter-amount-value" className={styles.modalLabel}>
          Amount value
        </label>
        <input
          id="transactions-filter-amount-value"
          type="number"
          inputMode="decimal"
          className={styles.modalControl}
          value={amountValue}
          onChange={(event) => onAmountChange?.(event.target.value)}
          disabled={isAmountDisabled}
          placeholder="Enter amount"
        />
      </div>
    </div>
  );
}

export function FilterDateRow({
  yearValue = 'all',
  yearOptions = [],
  onYearChange,
  monthValue = 'all',
  monthOptions = [],
  onMonthChange,
  onClear,
}) {
  return (
    <div className={styles.columnFilterSection}>
      <div className={styles.columnFilterGrid}>
        <label htmlFor="transactions-filter-year" className={styles.modalLabel}>
          Year
        </label>
        <select
          id="transactions-filter-year"
          className={styles.modalControl}
          value={yearValue}
          onChange={(event) => onYearChange?.(event.target.value)}
        >
          <option value="all">Any year</option>
          {yearOptions.map((option) => (
            <option key={`year-option-${option}`} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.columnFilterGrid}>
        <label htmlFor="transactions-filter-month" className={styles.modalLabel}>
          Month
        </label>
        <select
          id="transactions-filter-month"
          className={styles.modalControl}
          value={monthValue}
          onChange={(event) => onMonthChange?.(event.target.value)}
        >
          <option value="all">Any month</option>
          {monthOptions.map((option) => (
            <option key={`month-option-${option.value}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.columnFilterFooter}>
        <button
          type="button"
          className={`${styles.secondaryButton} ${styles.columnFilterClear}`.trim()}
          onClick={() => onClear?.()}
        >
          Clear date
        </button>
      </div>
    </div>
  );
}

export function FilterTextRow({
  id,
  label,
  value = '',
  onChange,
  placeholder,
}) {
  return (
    <div className={styles.columnFilterSection}>
      <label htmlFor={id} className={styles.modalLabel}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        className={styles.modalControl}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
