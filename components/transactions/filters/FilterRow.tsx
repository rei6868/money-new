import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiChevronDown, FiChevronUp, FiFilter } from 'react-icons/fi';

import styles from '../../../styles/TransactionsHistory.module.css';
import { DropdownSimple } from '../../common/DropdownSimple';
import { DropdownWithSearch } from '../../common/DropdownWithSearch';
import { AMOUNT_OPERATOR_OPTIONS, MONTH_OPTIONS } from './useTransactionsFilterController';

interface FilterValues {
  person: string | null;
  account: string | null;
  category: string | null;
  shop: string | null;
  debtTags: string[];
  amountOperator: string | null;
  amountValue: string;
  year: string | null;
  month: string | null;
  type: string | null;
  notes: string;
}

interface FilterSearchValues {
  person: string;
  account: string;
  category: string;
  shop: string;
  debtTags: string;
  type: string;
}

interface FilterRowProps {
  filters: FilterValues;
  filterSearchValues: FilterSearchValues;
  personOptions: string[];
  accountOptions: string[];
  categoryOptions: string[];
  shopOptions: string[];
  debtTagOptions: string[];
  typeOptions: string[];
  yearOptions: string[];
  amountOperatorLabelLookup: Map<string, string>;
  onFilterSearchChange: (field: keyof FilterSearchValues, value: string) => void;
  onSelectFilter: (field: keyof FilterValues, value: string) => void;
  onToggleDebtTag: (value: string) => void;
  onAmountOperatorSelect: (operator: string) => void;
  onAmountValueChange: (value: string) => void;
  onClearDate: () => void;
}

const DROPDOWN_IDS = {
  person: 'person',
  account: 'account',
  category: 'category',
  shop: 'shop',
  debtTags: 'debtTags',
  type: 'type',
  amountOperator: 'amount-operator',
  year: 'year',
  month: 'month',
} as const;

const COLLAPSE_QUERY = '(max-width: 840px)';

export function FilterRow({
  filters,
  filterSearchValues,
  personOptions,
  accountOptions,
  categoryOptions,
  shopOptions,
  debtTagOptions,
  typeOptions,
  yearOptions,
  amountOperatorLabelLookup,
  onFilterSearchChange,
  onSelectFilter,
  onToggleDebtTag,
  onAmountOperatorSelect,
  onAmountValueChange,
  onClearDate,
}: FilterRowProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isCompact, setIsCompact] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const media = window.matchMedia(COLLAPSE_QUERY);
    const update = () => {
      const shouldCollapse = media.matches;
      setIsCompact(shouldCollapse);
      if (!shouldCollapse) {
        setIsCollapsed(false);
      }
    };

    update();
    media.addEventListener('change', update);

    return () => {
      media.removeEventListener('change', update);
    };
  }, []);

  useEffect(() => {
    if (isCollapsed) {
      setOpenDropdown(null);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleExternalOpen = () => {
      setIsCollapsed(false);
      if (isCompact) {
        window.requestAnimationFrame(() => {
          containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      }
    };

    window.addEventListener('transactions-filters-open', handleExternalOpen);
    return () => {
      window.removeEventListener('transactions-filters-open', handleExternalOpen);
    };
  }, [isCompact]);

  useEffect(() => {
    if (!openDropdown) {
      return undefined;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) {
        return;
      }
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [openDropdown]);

  const handleToggle = useCallback((id: string) => {
    setOpenDropdown((current) => (current === id ? null : id));
  }, []);

  const handleCollapseToggle = useCallback(() => {
    setIsCollapsed((current) => !current);
  }, []);

  const handleSelect = useCallback(
    (field: keyof FilterValues, value: string) => {
      onSelectFilter(field, value);
      setOpenDropdown(null);
    },
    [onSelectFilter],
  );

  const handleAmountOperatorChange = useCallback(
    (value: string) => {
      onAmountOperatorSelect(value);
      setOpenDropdown(null);
    },
    [onAmountOperatorSelect],
  );

  const personLabelFormatter = useCallback(
    (value: string) => (value === 'all' ? 'Any person' : value),
    [],
  );
  const accountLabelFormatter = useCallback(
    (value: string) => (value === 'all' ? 'Any account' : value),
    [],
  );
  const categoryLabelFormatter = useCallback(
    (value: string) => (value === 'all' ? 'Any category' : value),
    [],
  );
  const shopLabelFormatter = useCallback(
    (value: string) => (value === 'all' ? 'Any shop' : value),
    [],
  );
  const typeLabelFormatter = useCallback((value: string) => (value === 'all' ? 'Any type' : value), []);

  const yearOptionsWithAll = useMemo(() => yearOptions ?? [], [yearOptions]);
  const monthValueOptions = useMemo(() => MONTH_OPTIONS.map((option) => option.value), []);

  const amountOperatorOptions = useMemo(
    () => AMOUNT_OPERATOR_OPTIONS.map((option) => option.value),
    [],
  );

  const collapseLabel = isCollapsed ? 'Show filters' : 'Hide filters';

  return (
    <div
      id="transactions-filter-row"
      ref={containerRef}
      className={styles.filterRowContainer}
      data-collapsed={isCompact && isCollapsed ? 'true' : undefined}
    >
      <div className={styles.filterRowHeader}>
        <div className={styles.filterRowTitleGroup}>
          <FiFilter aria-hidden className={styles.filterRowTitleIcon} />
          <span className={styles.filterRowTitle}>Filters</span>
        </div>
        {isCompact ? (
          <button
            type="button"
            className={`${styles.secondaryButton} ${styles.filterRowToggle}`.trim()}
            onClick={handleCollapseToggle}
            aria-expanded={!isCollapsed}
            aria-controls="transactions-filter-row-content"
          >
            <span>{collapseLabel}</span>
            {isCollapsed ? <FiChevronDown aria-hidden /> : <FiChevronUp aria-hidden />}
          </button>
        ) : null}
      </div>
      <div
        id="transactions-filter-row-content"
        className={styles.filterRowContent}
        data-open={!isCompact || !isCollapsed ? 'true' : 'false'}
      >
        <div className={styles.filterRowGroup}>
          <div className={styles.filterRowField}>
            <DropdownWithSearch
              id={DROPDOWN_IDS.person}
              label="People"
              isOpen={openDropdown === DROPDOWN_IDS.person}
              onToggle={handleToggle}
              options={personOptions}
              searchValue={filterSearchValues.person}
              onSearchChange={(value) => onFilterSearchChange('person', value)}
              onSelectOption={(value) => handleSelect('person', value)}
              selectedValue={filters.person ?? 'all'}
              placeholder="Any person"
              optionFormatter={personLabelFormatter}
            />
          </div>
          <div className={styles.filterRowField}>
            <DropdownWithSearch
              id={DROPDOWN_IDS.account}
              label="Accounts"
              isOpen={openDropdown === DROPDOWN_IDS.account}
              onToggle={handleToggle}
              options={accountOptions}
              searchValue={filterSearchValues.account}
              onSearchChange={(value) => onFilterSearchChange('account', value)}
              onSelectOption={(value) => handleSelect('account', value)}
              selectedValue={filters.account ?? 'all'}
              placeholder="Any account"
              optionFormatter={accountLabelFormatter}
            />
          </div>
          <div className={styles.filterRowField}>
            <DropdownWithSearch
              id={DROPDOWN_IDS.category}
              label="Categories"
              isOpen={openDropdown === DROPDOWN_IDS.category}
              onToggle={handleToggle}
              options={categoryOptions}
              searchValue={filterSearchValues.category}
              onSearchChange={(value) => onFilterSearchChange('category', value)}
              onSelectOption={(value) => handleSelect('category', value)}
              selectedValue={filters.category ?? 'all'}
              placeholder="Any category"
              optionFormatter={categoryLabelFormatter}
            />
          </div>
          <div className={styles.filterRowField}>
            <DropdownWithSearch
              id={DROPDOWN_IDS.shop}
              label="Shop"
              isOpen={openDropdown === DROPDOWN_IDS.shop}
              onToggle={handleToggle}
              options={shopOptions}
              searchValue={filterSearchValues.shop}
              onSearchChange={(value) => onFilterSearchChange('shop', value)}
              onSelectOption={(value) => handleSelect('shop', value)}
              selectedValue={filters.shop ?? 'all'}
              placeholder="Any shop"
              optionFormatter={shopLabelFormatter}
            />
          </div>
          <div className={styles.filterRowField}>
            <DropdownWithSearch
              id={DROPDOWN_IDS.type}
              label="Type"
              isOpen={openDropdown === DROPDOWN_IDS.type}
              onToggle={handleToggle}
              options={typeOptions}
              searchValue={filterSearchValues.type}
              onSearchChange={(value) => onFilterSearchChange('type', value)}
              onSelectOption={(value) => handleSelect('type', value)}
              selectedValue={filters.type ?? 'all'}
              placeholder="Any type"
              optionFormatter={typeLabelFormatter}
            />
          </div>
        </div>
        <div className={styles.filterRowGroup}>
          <div className={`${styles.filterRowField} ${styles.filterRowFieldStretch}`.trim()}>
            <DropdownWithSearch
              id={DROPDOWN_IDS.debtTags}
              label="Debt tags"
              isOpen={openDropdown === DROPDOWN_IDS.debtTags}
              onToggle={handleToggle}
              options={debtTagOptions}
              searchValue={filterSearchValues.debtTags}
              onSearchChange={(value) => onFilterSearchChange('debtTags', value)}
              onSelectOption={(value) => {
                onToggleDebtTag(value);
                if (value === 'all') {
                  setOpenDropdown(null);
                }
              }}
              selectedValues={filters.debtTags}
              multi
              placeholder="Any debt tag"
              renderValue={(_, fallback) =>
                Array.isArray(filters.debtTags) && filters.debtTags.length > 0
                  ? `${filters.debtTags.length} selected`
                  : fallback
              }
            />
          </div>
          <div className={`${styles.filterRowField} ${styles.filterRowAmount}`.trim()}>
            <DropdownSimple
              id={DROPDOWN_IDS.amountOperator}
              label="Amount"
              isOpen={openDropdown === DROPDOWN_IDS.amountOperator}
              onToggle={handleToggle}
              options={amountOperatorOptions}
              value={filters.amountOperator ?? 'all'}
              onSelect={handleAmountOperatorChange}
              placeholder="Any amount"
              optionFormatter={(value) =>
                value === 'all' ? 'Any amount' : amountOperatorLabelLookup.get(value) ?? value
              }
            />
            <label htmlFor="transactions-filter-amount-value" className={styles.filterRowInputLabel}>
              <span className={styles.modalLabel}>Amount value</span>
              <input
                id="transactions-filter-amount-value"
                type="number"
                inputMode="decimal"
                step="0.01"
                className={`${styles.modalControl} ${styles.filterRowInput}`.trim()}
                value={filters.amountValue}
                onChange={(event) => onAmountValueChange(event.target.value)}
                placeholder="Enter amount"
                disabled={filters.amountOperator === 'is-null' || !filters.amountOperator}
              />
            </label>
          </div>
          <div className={`${styles.filterRowField} ${styles.filterRowDateGroup}`.trim()}>
            <div className={styles.filterRowDateInputs}>
              <DropdownSimple
                id={DROPDOWN_IDS.year}
                label="Year"
                isOpen={openDropdown === DROPDOWN_IDS.year}
                onToggle={handleToggle}
                options={yearOptionsWithAll}
                value={filters.year ?? 'all'}
                onSelect={(value) => handleSelect('year', value)}
                placeholder="Any year"
                optionFormatter={(value) => (value === 'all' ? 'Any year' : value)}
              />
              <DropdownSimple
                id={DROPDOWN_IDS.month}
                label="Month"
                isOpen={openDropdown === DROPDOWN_IDS.month}
                onToggle={handleToggle}
                options={monthValueOptions}
                value={filters.month ?? 'all'}
                onSelect={(value) => handleSelect('month', value)}
                placeholder="Any month"
                optionFormatter={(value) =>
                  value === 'all' ? 'Any month' : MONTH_OPTIONS.find((option) => option.value === value)?.label ?? value
                }
              />
            </div>
            <button
              type="button"
              className={`${styles.secondaryButton} ${styles.filterRowClearDate}`.trim()}
              onClick={() => {
                onClearDate();
                setOpenDropdown(null);
              }}
            >
              Clear date
            </button>
          </div>
          <div className={`${styles.filterRowField} ${styles.filterRowNotes}`.trim()}>
            <label htmlFor="transactions-filter-notes" className={styles.filterRowInputLabel}>
              <span className={styles.modalLabel}>Notes contains</span>
              <input
                id="transactions-filter-notes"
                type="text"
                className={`${styles.modalControl} ${styles.filterRowInput}`.trim()}
                value={filters.notes}
                onChange={(event) => onSelectFilter('notes', event.target.value)}
                placeholder="e.g. refund"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

export type { FilterRowProps, FilterValues as TransactionsFilterValues };
