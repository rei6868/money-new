import { useEffect, useMemo, useRef, useState } from 'react';
import { FiMove, FiRotateCcw, FiX } from 'react-icons/fi';

import styles from '../../styles/TransactionsHistory.module.css';
import { TRANSACTION_COLUMN_DEFINITIONS } from './transactionColumns';

export function CustomizeColumnsModal({ isOpen, columns, onClose, onApply, onReset }) {
  const [draftColumns, setDraftColumns] = useState(columns);
  const [draggingId, setDraggingId] = useState(null);
  const itemRefs = useRef(new Map());

  useEffect(() => {
    if (isOpen) {
      setDraftColumns(columns);
      setDraggingId(null);
    }
  }, [isOpen, columns]);

  const definitionMap = useMemo(
    () =>
      new Map(
        TRANSACTION_COLUMN_DEFINITIONS.map((definition) => [definition.id, definition]),
      ),
    [],
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

  const measurePositions = (columnsList) => {
    const positions = new Map();
    columnsList.forEach((column) => {
      const node = itemRefs.current.get(column.id);
      if (node) {
        positions.set(column.id, node.getBoundingClientRect());
      }
    });
    return positions;
  };

  const animateToPositions = (previousPositions, columnsList) => {
    columnsList.forEach((column) => {
      const element = itemRefs.current.get(column.id);
      const previous = previousPositions.get(column.id);
      if (!element || !previous) {
        return;
      }

      const nextRect = element.getBoundingClientRect();
      const deltaX = previous.left - nextRect.left;
      const deltaY = previous.top - nextRect.top;
      if (deltaX === 0 && deltaY === 0) {
        return;
      }

      element.animate(
        [
          { transform: `translate(${deltaX}px, ${deltaY}px)` },
          { transform: 'translate(0, 0)' },
        ],
        {
          duration: 180,
          easing: 'ease-out',
        },
      );
    });
  };

  const updateColumnsWithAnimation = (updater) => {
    setDraftColumns((prev) => {
      const next = updater(prev);
      if (next === prev) {
        return prev;
      }

      const previousPositions = measurePositions(prev);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          animateToPositions(previousPositions, next);
        });
      });

      return next;
    });
  };

  const reorderById = (columnsList, fromId, toId) => {
    if (!fromId || !toId || fromId === toId) {
      return columnsList;
    }
    const fromIndex = columnsList.findIndex((column) => column.id === fromId);
    const toIndex = columnsList.findIndex((column) => column.id === toId);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
      return columnsList;
    }
    const next = [...columnsList];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    return next;
  };

  const handleDragStart = (columnId) => (event) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', columnId);
    setDraggingId(columnId);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
  };

  const handleDragOver = (columnId) => (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const fromId = event.dataTransfer.getData('text/plain') || draggingId;
    updateColumnsWithAnimation((prev) => reorderById(prev, fromId, columnId));
  };

  const handleDrop = (columnId) => (event) => {
    event.preventDefault();
    const fromId = event.dataTransfer.getData('text/plain');
    updateColumnsWithAnimation((prev) => reorderById(prev, fromId, columnId));
    setDraggingId(null);
  };

  const handleListDrop = (event) => {
    event.preventDefault();
    const fromId = event.dataTransfer.getData('text/plain');
    if (!fromId) {
      setDraggingId(null);
      return;
    }
    updateColumnsWithAnimation((prev) => {
      const fromIndex = prev.findIndex((column) => column.id === fromId);
      if (fromIndex === -1 || fromIndex === prev.length - 1) {
        return prev;
      }
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.push(moved);
      return next;
    });
    setDraggingId(null);
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

          <ul
            className={styles.columnsList}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleListDrop}
          >
            {draftColumns.map((column) => {
              const definition = definitionMap.get(column.id);
              if (!definition) {
                return null;
              }

              return (
                <li
                  key={column.id}
                  className={`${styles.columnRow} ${
                    draggingId === column.id ? styles.columnRowDragging : ''
                  }`}
                  draggable
                  onDragStart={handleDragStart(column.id)}
                  onDragOver={handleDragOver(column.id)}
                  onDrop={handleDrop(column.id)}
                  onDragEnd={handleDragEnd}
                  data-column-id={column.id}
                  ref={(node) => {
                    if (node) {
                      itemRefs.current.set(column.id, node);
                    } else {
                      itemRefs.current.delete(column.id);
                    }
                  }}
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
