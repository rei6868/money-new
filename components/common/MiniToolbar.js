import { FiTrash2, FiX } from 'react-icons/fi';
import styles from '../../styles/MiniToolbar.module.css';

export default function MiniToolbar({
  selectedCount = 0,
  onDelete,
  onCancel,
}) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className={styles.toolbar} data-testid="mini-toolbar">
      <span className={styles.count} data-testid="mini-toolbar-count">
        {selectedCount} selected
      </span>
      <div className={styles.actions}>
        {onDelete && (
          <button
            type="button"
            className={styles.actionButton}
            data-action="delete"
            onClick={onDelete}
            aria-label={`Delete ${selectedCount} selected item${selectedCount !== 1 ? 's' : ''}`}
          >
            <FiTrash2 aria-hidden />
            <span>Delete</span>
          </button>
        )}
        {onCancel && (
          <button
            type="button"
            className={styles.actionButton}
            data-action="cancel"
            onClick={onCancel}
            aria-label="Clear selection"
          >
            <FiX aria-hidden />
            <span>Cancel</span>
          </button>
        )}
      </div>
    </div>
  );
}

