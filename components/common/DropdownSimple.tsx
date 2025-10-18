import { FiChevronDown } from 'react-icons/fi';

import styles from '../../styles/TransactionsHistory.module.css';
import { slugify } from '../table/tableUtils';

interface DropdownSimpleProps {
  id: string;
  label: string;
  isOpen: boolean;
  onToggle: (id: string) => void;
  options: string[];
  value: string;
  onSelect: (value: string) => void;
  includeAllOption?: boolean;
  placeholder?: string;
  testIdPrefix?: string;
  optionFormatter?: (value: string) => string;
}

function normalizeOptions(options: string[], includeAllOption: boolean): string[] {
  const normalized = options.filter((option): option is string => typeof option === 'string' && option.length > 0);
  if (!includeAllOption) {
    return normalized;
  }
  return normalized.includes('all') ? normalized : ['all', ...normalized];
}

export function DropdownSimple({
  id,
  label,
  isOpen,
  onToggle,
  options,
  value,
  onSelect,
  includeAllOption = true,
  placeholder = 'Select',
  testIdPrefix,
  optionFormatter,
}: DropdownSimpleProps) {
  const normalizedOptions = normalizeOptions(options, includeAllOption);
  const formatOption = optionFormatter ?? ((option: string) => (option === 'all' ? 'All' : option));
  const currentLabel = value ? formatOption(value) : placeholder;

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
          <span className={styles.modalDropdownValue}>{currentLabel}</span>
        </span>
        <FiChevronDown aria-hidden className={styles.modalDropdownChevron} />
      </button>
      {isOpen ? (
        <div
          id={`${id}-options`}
          className={styles.modalDropdownContent}
          role="listbox"
          aria-label={label}
        >
          <div className={styles.modalSimpleList} data-testid={testIdPrefix}>
            {normalizedOptions.map((option) => {
              const isActive = option === value;
              return (
                <button
                  key={`${option}-${slugify(option)}`}
                  type="button"
                  className={`${styles.modalOptionButton} ${
                    isActive ? styles.modalOptionButtonActive : ''
                  }`}
                  onClick={() => onSelect(option)}
                  role="option"
                  aria-selected={isActive}
                  data-testid={
                    testIdPrefix ? `${testIdPrefix}-option-${slugify(option)}` : undefined
                  }
                >
                  {formatOption(option)}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
