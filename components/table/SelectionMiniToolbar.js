import React from 'react';

import styles from './TableBase.module.css';

export function SelectionMiniToolbar({
  count = 0,
  onDelete,
  onCancel,
  className,
}) {
  if (!count || count <= 0) {
    return null;
  }

  const handleDelete = () => {
    onDelete?.();
  };

  const handleCancel = () => {
    onCancel?.();
  };

  const toolbarClassName = [styles.selectionToolbar, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={toolbarClassName} role="status" aria-live="polite">
      <div className={styles.selectionToolbarInfo}>
        <span className={styles.selectionToolbarCount}>{count}</span>
        <span className={styles.selectionToolbarLabel}>selected</span>
      </div>
      <div className={styles.selectionToolbarActions}>
        <button
          type="button"
          className={`${styles.selectionToolbarButton} ${styles.selectionToolbarDanger}`.trim()}
          onClick={handleDelete}
        >
          Delete
        </button>
        <button
          type="button"
          className={styles.selectionToolbarButton}
          onClick={handleCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default SelectionMiniToolbar;
