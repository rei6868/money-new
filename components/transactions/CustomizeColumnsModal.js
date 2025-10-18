import { useEffect, useMemo, useState } from 'react';
import { FiMove, FiRotateCcw, FiX } from 'react-icons/fi';

import styles from '../../styles/TransactionsHistory.module.css';

export function CustomizeColumnsModal({
  isOpen,
  columns,
  onClose,
  onApply,
  onReset,
  columnDefinitions = [],
}) {
  const [draftColumns, setDraftColumns] = useState(columns);

  useEffect(() => {
    if (isOpen) {
      setDraftColumns(columns);
    }
  }, [isOpen, columns]);

  const definitionMap = useMemo(
    () => new Map(columnDefinitions.map((definition) => [definition.id, definition])),
    [columnDefinitions],
  );

  if (!isOpen) {
    return null;
  }

  const handleToggleVisible = (columnId) => (event) => {
    const { checked } = event.target;
    setDraftColumns((prev) =>
      prev.map((column) =>
        column.id === columnId ? { ...column, visible: checked } : column,
      ),
    );
  };

  const handleWidthChange = (columnId) => (event) => {
    const nextWidth = Number(event.target.value);
    setDraftColumns((prev) =>
      prev.map((column) =>
        column.id === columnId
          ? { ...column, width: Number.isNaN(nextWidth) ? column.width : nextWidth }
          : column,
      ),
    );
  };

  const handleDragStart = (index) => (event) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (index) => (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (index) => (event) => {
    event.preventDefault();
    const fromIndex = Number(event.dataTransfer.getData('text/plain'));
    if (Number.isNaN(fromIndex) || fromIndex === index) {
      return;
    }

    setDraftColumns((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(index, 0, moved);
      return next;
    });
  };

  const handleApply = () => {
    onApply(draftColumns.map((column, order) => ({ ...column, order })));
  };

  const handleReset = () => {
    onReset();
  };

  return (
    <div
      className={styles.modalOverlay}
      role="dialog"
      aria-modal="true"
      data-testid="transactions-customize-columns"
    >
      <div className={`${styles.modalContent} ${styles.columnsModal}`}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Customize Columns</h2>
          <button
            type="button"
            className={styles.iconButton}
            onClick={onClose}
            aria-label="Close column customization"
          >
            <FiX aria-hidden />
          </button>
        </div>

        <div className={styles.modalBody}>
          <p className={styles.modalDescription}>
            Drag to reorder, adjust width, and choose which transaction fields are visible.
          </p>

          <ul className={styles.columnsList}>
            {draftColumns.map((column, index) => {
              const definition = definitionMap.get(column.id);
              if (!definition) {
                return null;
              }

              return (
                <li
                  key={column.id}
                  className={styles.columnRow}
                  draggable
                  onDragStart={handleDragStart(index)}
                  onDragOver={handleDragOver(index)}
                  onDrop={handleDrop(index)}
                >
                  <span className={styles.columnDragHandle} aria-hidden>
                    <FiMove />
                  </span>
                  <label className={styles.columnLabel} htmlFor={`column-visible-${column.id}`}>
                    <input
                      type="checkbox"
                      id={`column-visible-${column.id}`}
                      checked={column.visible}
                      onChange={handleToggleVisible(column.id)}
                      className={styles.columnCheckbox}
                    />
                    <span>{definition.label}</span>
                  </label>
                  <div className={styles.columnWidthGroup}>
                    <label htmlFor={`column-width-${column.id}`} className={styles.columnWidthLabel}>
                      Width
                    </label>
                    <input
                      id={`column-width-${column.id}`}
                      type="number"
                      min={definition.minWidth}
                      className={styles.columnWidthInput}
                      value={column.width}
                      onChange={handleWidthChange(column.id)}
                    />
                    <span className={styles.columnWidthUnit}>px</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={handleReset}
            data-testid="transactions-customize-reset"
          >
            <FiRotateCcw aria-hidden /> Reset
          </button>
          <button
            type="button"
            className={styles.modalApply}
            onClick={handleApply}
            data-testid="transactions-customize-apply"
          >
            Apply changes
          </button>
        </div>
      </div>
    </div>
  );
}
