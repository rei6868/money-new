import styles from '../table/TableBase.module.css';

export type MiniToolbarProps = {
  selectedCount: number;
  onDelete?: () => void;
  onCancel?: () => void;
};

export function MiniToolbar({ selectedCount, onDelete, onCancel }: MiniToolbarProps) {
  if (!selectedCount || selectedCount <= 0) {
    return null;
  }

  return (
    <div className={styles.selectionToolbarDock} role="status" aria-live="polite">
      <div className={styles.selectionToolbar}>
        <div className={styles.selectionToolbarInfo}>
          <span className={styles.selectionToolbarCount}>{selectedCount}</span>
          <span className={styles.selectionToolbarLabel}>selected</span>
        </div>
        <div className={styles.selectionToolbarActions}>
          <button
            type="button"
            className={`${styles.selectionToolbarButton} ${styles.selectionToolbarDanger}`.trim()}
            onClick={onDelete}
          >
            Delete
          </button>
          <button
            type="button"
            className={styles.selectionToolbarButton}
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default MiniToolbar;
