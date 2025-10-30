import { useState } from 'react';
import styles from './FilterLine.module.css';
import type { AddFilterMenuProps, FilterColumn } from './types';

function ColumnButton({ column, onClick }: { column: FilterColumn; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={styles.addButton}>
      {column.icon}
      <span>{column.label}</span>
    </button>
  );
}

export function AddFilterMenu({ columns, onSelect, label }: AddFilterMenuProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!columns.length) {
    return null;
  }

  const handleSelect = (column: FilterColumn) => {
    onSelect(column);
    setIsExpanded(false);
  };

  return (
    <div>
      <button
        type="button"
        className={styles.addButton}
        onClick={() => setIsExpanded((value) => !value)}
        aria-expanded={isExpanded}
      >
        <span>＋</span>
        <span>{label ?? 'Add filter'}</span>
      </button>
      {isExpanded && (
        <div className={styles.badgeRow} style={{ marginTop: 8 }}>
          {columns.map((column) => (
            <ColumnButton key={column.id} column={column} onClick={() => handleSelect(column)} />
          ))}
        </div>
      )}
    </div>
  );
}

export default AddFilterMenu;
