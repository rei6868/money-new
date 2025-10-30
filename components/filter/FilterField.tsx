import styles from './FilterLine.module.css';
import FilterInput from './FilterInput';
import type { FilterFieldProps } from './types';

export function FilterField({
  filter,
  column,
  operator,
  columns,
  onColumnChange,
  onOperatorChange,
  onValueChange,
  onRemove,
  loadValueOptions,
}: FilterFieldProps) {
  return (
    <div className={styles.filterCard}>
      <div className={styles.filterHeader}>
        <div className={styles.filterTitle}>{column?.label ?? 'Select column'}</div>
        <button type="button" onClick={onRemove} aria-label="Remove filter">
          ✕
        </button>
      </div>
      {column?.helperText ? <small>{column.helperText}</small> : null}
      <div className={styles.filterControls}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Column</span>
          <select value={filter.columnId} onChange={(event) => onColumnChange(event.target.value)}>
            {columns.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Operator</span>
          <select
            value={filter.operatorId}
            onChange={(event) => onOperatorChange(event.target.value)}
            disabled={!column}
          >
            {(column?.operators ?? []).map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 200px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Value</span>
          <FilterInput
            columnId={filter.columnId}
            operator={operator}
            value={filter.value}
            onChange={onValueChange}
            loadValueOptions={loadValueOptions}
          />
        </label>
      </div>
    </div>
  );
}

export default FilterField;
