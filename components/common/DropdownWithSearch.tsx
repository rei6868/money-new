import { useMemo } from 'react';
import { FiChevronDown, FiSearch } from 'react-icons/fi';

import styles from '../../styles/TransactionsHistory.module.css';
import { slugify } from '../table/tableUtils';

type OptionFormatter = (value: string) => string;

interface DropdownWithSearchContentProps {
  options: string[];
  includeAllOption?: boolean;
  searchValue: string;
  searchPlaceholder?: string;
  onSearchChange: (value: string) => void;
  onSelectOption: (value: string) => void;
  selectedValue?: string;
  selectedValues?: string[];
  multi?: boolean;
  emptyMessage?: string;
  testIdPrefix?: string;
  optionFormatter?: OptionFormatter;
}

interface DropdownWithSearchProps extends DropdownWithSearchContentProps {
  id: string;
  label: string;
  isOpen: boolean;
  onToggle: (id: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  renderValue?: (value: string | undefined, fallback: string) => string;
}

function normalizeOptions(options: string[], includeAllOption: boolean): string[] {
  const normalized = options.filter((option): option is string => typeof option === 'string' && option.length > 0);
  if (!includeAllOption) {
    return normalized;
  }
  return normalized.includes('all') ? normalized : ['all', ...normalized];
}

function filterOptions(options: string[], searchValue: string): string[] {
  const lowered = searchValue.trim().toLowerCase();
  if (!lowered) {
    return options;
  }
  return options.filter((option) => option === 'all' || option.toLowerCase().includes(lowered));
}

function defaultFormatter(value: string): string {
  return value === 'all' ? 'All' : value;
}

export function DropdownWithSearchContent({
  options,
  includeAllOption = true,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  onSelectOption,
  selectedValue,
  selectedValues,
  multi = false,
  emptyMessage = 'No options available',
  testIdPrefix,
  optionFormatter = defaultFormatter,
}: DropdownWithSearchContentProps) {
  const normalized = useMemo(() => normalizeOptions(options, includeAllOption), [options, includeAllOption]);
  const filtered = useMemo(() => filterOptions(normalized, searchValue), [normalized, searchValue]);
  const selectedSet = useMemo(() => new Set(selectedValues ?? []), [selectedValues]);

  const renderSearchField = () => (
    <div className={`${styles.modalPickerSearch} ${styles.modalSearchGroup}`}>
      <FiSearch
        aria-hidden
        className={styles.modalSearchIcon}
      />
      <input
        type="search"
        value={searchValue}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={searchPlaceholder ? searchPlaceholder : 'Search'}
        className={styles.modalSearchInput}
        data-testid={testIdPrefix ? `${testIdPrefix}-search` : undefined}
      />
    </div>
  );

  const renderOptionList = () => {
    if (filtered.length === 0) {
      return <div className={styles.emptyOption}>{emptyMessage}</div>;
    }

    return (
      <div
        className={styles.modalOptionList}
        role="listbox"
        data-testid={testIdPrefix}
        aria-label="Options"
      >
        {filtered.map((option) => {
          const isActive = multi ? selectedSet.has(option) : selectedValue === option;
          return (
            <button
              type="button"
              key={`${option}-${slugify(option)}`}
              className={`${styles.modalOptionButton} ${
                isActive ? styles.modalOptionButtonActive : ''
              }`}
              onClick={() => onSelectOption(option)}
              role="option"
              aria-selected={isActive}
              data-testid={
                testIdPrefix ? `${testIdPrefix}-option-${slugify(option)}` : undefined
              }
            >
              {optionFormatter(option)}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className={styles.modalPicker}>
      {renderSearchField()}
      {renderOptionList()}
    </div>
  );
}

export function DropdownWithSearch({
  id,
  label,
  isOpen,
  onToggle,
  options,
  includeAllOption,
  searchValue,
  searchPlaceholder,
  onSearchChange,
  onSelectOption,
  selectedValue,
  selectedValues,
  multi,
  emptyMessage,
  testIdPrefix,
  placeholder,
  renderValue,
  optionFormatter,
}: DropdownWithSearchProps) {
  const normalizedSelected = multi ? selectedValues ?? [] : [selectedValue ?? ''];
  const displayValue = renderValue
    ? renderValue(multi ? undefined : selectedValue, normalizedSelected[0])
    : optionFormatter?.(selectedValue ?? '') ?? defaultFormatter(selectedValue ?? '');

  return (
    <div className={styles.modalDropdown}>
      <button
        type="button"
        className={styles.modalDropdownTrigger}
        onClick={() => onToggle(id)}
        aria-expanded={isOpen}
        aria-controls={`${id}-options`}
        data-testid={testIdPrefix ? `${testIdPrefix}-trigger` : undefined}
      >
        <span className={styles.modalDropdownLabelGroup}>
          <span className={styles.modalLabel}>{label}</span>
          <span className={styles.modalDropdownValue}>
            {normalizedSelected.length > 0 && normalizedSelected[0]
              ? displayValue
              : placeholder ?? 'Select'}
          </span>
        </span>
        <FiChevronDown aria-hidden className={styles.modalDropdownChevron} />
      </button>
      {isOpen ? (
        <div
          id={`${id}-options`}
          className={styles.modalDropdownContent}
          role="dialog"
          aria-label={label}
        >
          <DropdownWithSearchContent
            options={options}
            includeAllOption={includeAllOption}
            searchValue={searchValue}
            searchPlaceholder={searchPlaceholder}
            onSearchChange={onSearchChange}
            onSelectOption={onSelectOption}
            selectedValue={selectedValue}
            selectedValues={selectedValues}
            multi={multi}
            emptyMessage={emptyMessage}
            testIdPrefix={testIdPrefix}
            optionFormatter={optionFormatter}
          />
        </div>
      ) : null}
    </div>
  );
}
