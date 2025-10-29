import { FiFilter, FiList, FiXCircle } from 'react-icons/fi';

import styles from './table-selection.module.css';

export type SelectionToolbarProps = {
  selectedCount: number;
  onDelete?: () => void;
  onDeselectAll?: () => void;
  onToggleShowSelected?: () => void;
  isShowingSelectedOnly?: boolean;
};

export function SelectionToolbar({
  selectedCount,
  onDelete,
  onDeselectAll,
  onToggleShowSelected,
  isShowingSelectedOnly = false,
}: SelectionToolbarProps) {
  if (!selectedCount || selectedCount <= 0) {
    return null;
  }

  const toggleLabel = isShowingSelectedOnly ? 'Show all rows' : 'Show selected rows';
  const ToggleIcon = isShowingSelectedOnly ? FiList : FiFilter;

  return (
    <div className={styles.selectionToolbarDock} role="status" aria-live="polite">
      <div className={styles.selectionToolbar}>
        <div className={styles.selectionToolbarInfo}>
          <span className={styles.selectionToolbarCount}>{selectedCount}</span>
          <span className={styles.selectionToolbarLabel}>selected</span>
        </div>
        <div className={styles.selectionToolbarActions}>
          {onToggleShowSelected ? (
            <button
              type="button"
              className={styles.selectionToolbarButton}
              onClick={onToggleShowSelected}
              data-active={isShowingSelectedOnly ? 'true' : 'false'}
              aria-pressed={isShowingSelectedOnly ? 'true' : 'false'}
              title={toggleLabel}
            >
              <span className={styles.selectionToolbarButtonIcon} aria-hidden>
                <ToggleIcon />
              </span>
              <span>{toggleLabel}</span>
            </button>
          ) : null}
          {onDeselectAll ? (
            <button
              type="button"
              className={styles.selectionToolbarButton}
              onClick={onDeselectAll}
              title="Deselect all rows"
            >
              <span className={styles.selectionToolbarButtonIcon} aria-hidden>
                <FiXCircle />
              </span>
              <span>Deselect all</span>
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              className={`${styles.selectionToolbarButton} ${styles.selectionToolbarDanger}`.trim()}
              onClick={onDelete}
              title="Delete selected rows"
            >
              Delete
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default SelectionToolbar;
