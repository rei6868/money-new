import { useMemo } from 'react';
import { FiX } from 'react-icons/fi';

import ReusableDropdown from '../common/ReusableDropdown';
import styles from './FilterLine.module.css';
import FilterInput from './FilterInput';
import type { FilterColumn, FilterFieldProps, FilterOperator } from './types';

const mapColumnsToOptions = (columns: FilterColumn[]) =>
  columns.map((item) => ({
    value: item.id,
    label: item.label,
  }));

const mapOperatorsToOptions = (operators: FilterOperator[] | undefined) =>
  (operators ?? []).map((item) => ({
    value: item.id,
    label: item.label,
  }));

export function FilterField({
  filter,
  column,
  operator,
  columns,
  availableColumns,
  onColumnChange,
  onOperatorChange,
  onValueChange,
  onRemove,
  onApply,
  onCancel,
  loadValueOptions,
}: FilterFieldProps) {
  const columnOptions = useMemo(
    () => mapColumnsToOptions(availableColumns.length ? availableColumns : columns),
    [availableColumns, columns],
  );

  const operatorOptions = useMemo(
    () => mapOperatorsToOptions(column?.operators),
    [column?.operators],
  );

  const showValueInput = Boolean(operator && operator.valueInput !== 'none');

  return (
    <div className={styles.fieldCard}>
      <div className={styles.fieldHeader}>
        <div className={styles.fieldTitleGroup}>
          <div className={styles.fieldTitle}>{column?.label ?? 'Choose a column'}</div>
          {column?.helperText ? (
            <div className={styles.fieldHelper}>{column.helperText}</div>
          ) : null}
        </div>
        <button
          type="button"
          className={styles.fieldCloseButton}
          onClick={onRemove}
          aria-label="Remove filter"
        >
          <FiX aria-hidden />
        </button>
      </div>

      <div className={styles.fieldControls}>
        <div className={styles.fieldControl}>
          <span className={styles.controlLabel}>Column</span>
          <ReusableDropdown
            value={filter.columnId}
            onChange={(value) => {
              if (Array.isArray(value)) {
                return;
              }
              onColumnChange(value);
            }}
            options={columnOptions}
            placeholder="Select column"
            className={styles.dropdownControl}
          />
        </div>
        <div className={styles.fieldControl}>
          <span className={styles.controlLabel}>Operator</span>
          <ReusableDropdown
            value={filter.operatorId}
            onChange={(value) => {
              if (Array.isArray(value)) {
                return;
              }
              onOperatorChange(value);
            }}
            options={operatorOptions}
            placeholder={column ? 'Select operator' : 'Choose column first'}
            className={styles.dropdownControl}
            disabled={!column || operatorOptions.length === 0}
          />
        </div>
        <div className={styles.fieldControl}>
          <span className={styles.controlLabel}>Value</span>
          {showValueInput ? (
            <FilterInput
              columnId={filter.columnId}
              operator={operator}
              value={filter.value}
              onChange={onValueChange}
              loadValueOptions={loadValueOptions}
            />
          ) : (
            <div className={styles.emptyValue}>
              {operator ? 'No value needed for this operator' : 'Select an operator to continue'}
            </div>
          )}
        </div>
      </div>

      <div className={styles.fieldFooter}>
        <button type="button" className={styles.secondaryButton} onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className={styles.primaryButton} onClick={onApply}>
          Apply
        </button>
      </div>
    </div>
  );
}

export default FilterField;
