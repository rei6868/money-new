import type { MouseEvent } from 'react';
import { FiX } from 'react-icons/fi';

import styles from './FilterLine.module.css';
import type { FilterBadgeProps } from './types';

export function FilterBadge({
  filter,
  columnLabel,
  operatorLabel,
  valueLabel,
  onClick,
  onRemove,
}: FilterBadgeProps) {
  const handleBadgeClick = () => {
    onClick?.();
  };

  const handleRemove = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onRemove?.();
  };

  return (
    <div className={styles.badge}>
      <button
        type="button"
        className={styles.badgeMain}
        onClick={handleBadgeClick}
        disabled={!onClick}
      >
        <span className={styles.badgeLabel}>{columnLabel ?? filter.columnId}</span>
        {operatorLabel ? <span className={styles.badgeSeparator}>·</span> : null}
        {operatorLabel ? <span className={styles.badgeOperator}>{operatorLabel}</span> : null}
        {valueLabel ? <span className={styles.badgeValue}>{valueLabel}</span> : null}
      </button>
      <button
        type="button"
        className={styles.badgeRemove}
        onClick={handleRemove}
        aria-label={`Remove ${columnLabel ?? filter.columnId} filter`}
      >
        <FiX aria-hidden />
        <span className={styles.srOnly}>Remove filter</span>
      </button>
    </div>
  );
}

export default FilterBadge;
