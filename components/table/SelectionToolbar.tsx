import { FiFilter, FiList, FiTrash2, FiXCircle } from 'react-icons/fi';

import styles from './table-selection.module.css';

export type SelectionToolbarProps = {
  selectedCount: number;
  onDelete?: () => void;
  onDeselectAll?: () => void;
  onToggleShowSelected?: () => void;
  isShowingSelectedOnly?: boolean;
  variant?: 'floating' | 'inline';
  className?: string;
};

export function SelectionToolbar({
  selectedCount,
  onDelete,
  onDeselectAll,
  onToggleShowSelected,
  isShowingSelectedOnly = false,
  variant = 'floating',
  className,
}: SelectionToolbarProps) {
  if (!selectedCount || selectedCount <= 0) {
    return null;
  }

  if (variant === 'inline') {
    const inlineClassName = [styles.inlineCount, className].filter(Boolean).join(' ');
    return <span className={inlineClassName}>{selectedCount} selected</span>;
  }

  const toggleLabel = isShowingSelectedOnly ? 'Show all rows' : 'Show selected rows';
  const toggleVisibleLabel = isShowingSelectedOnly ? 'Show All' : 'Show Selected';
  const ToggleIcon = isShowingSelectedOnly ? FiList : FiFilter;
  const deselectLabel = 'Deselect all rows';
  const deleteLabel = 'Delete selected rows';

  const dockClassName = [styles.selectionToolbarDock, className].filter(Boolean).join(' ');

  return (
    <div className={dockClassName} role="status" aria-live="polite">
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
              aria-label={toggleLabel}
              title={toggleLabel}
            >
              <span className={styles.selectionToolbarButtonIcon} aria-hidden="true">
                <ToggleIcon aria-hidden="true" focusable="false" />
              </span>
              <span className={styles.selectionToolbarButtonLabel}>{toggleVisibleLabel}</span>
            </button>
          ) : null}
          {onDeselectAll ? (
            <button
              type="button"
              className={styles.selectionToolbarButton}
              onClick={onDeselectAll}
              aria-label={deselectLabel}
              title={deselectLabel}
            >
              <span className={styles.selectionToolbarButtonIcon} aria-hidden="true">
                <FiXCircle aria-hidden="true" focusable="false" />
              </span>
              <span className={styles.selectionToolbarButtonLabel}>Deselect</span>
            </button>
          ) : null}
          <button
            type="button"
            className={`${styles.selectionToolbarButton} ${styles.selectionToolbarDanger}`.trim()}
            onClick={onDelete}
            aria-label={deleteLabel}
            title={deleteLabel}
          >
            <span className={styles.selectionToolbarButtonIcon} aria-hidden="true">
              <FiTrash2 aria-hidden="true" focusable="false" />
            </span>
            <span className={styles.selectionToolbarButtonLabel}>Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default SelectionToolbar;
