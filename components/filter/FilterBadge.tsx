import styles from './FilterLine.module.css';
import type { FilterBadgeProps } from './types';

export function FilterBadge({ filter, columnLabel, operatorLabel, valueLabel, onClick }: FilterBadgeProps) {
  return (
    <button
      type="button"
      className={`${styles.addButton} ${styles.collapsedBadge}`}
      onClick={onClick}
    >
      <span>{columnLabel ?? filter.columnId}</span>
      <span>·</span>
      <span>{operatorLabel ?? filter.operatorId}</span>
      {valueLabel ? <span>“{valueLabel}”</span> : null}
    </button>
  );
}

export default FilterBadge;
