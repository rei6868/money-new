import { useEffect, useMemo, useState } from 'react';
import { FiMove, FiRotateCcw, FiSearch, FiX } from 'react-icons/fi';

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
  const [columnQuery, setColumnQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      setDraftColumns(columns);
      setColumnQuery('');
    }
  }, [isOpen, columns]);

  const definitionMap = useMemo(
    () => new Map(columnDefinitions.map((definition) => [definition.id, definition])),
    [columnDefinitions],
  );

  const filteredColumns = useMemo(() => {
    const lowered = columnQuery.trim().toLowerCase();
    if (!lowered) {
      return draftColumns;
    }
    return draftColumns.filter((column) => {
      const definition = definitionMap.get(column.id);
      const label = definition?.label ?? column.id;
      return label.toLowerCase().includes(lowered);
    });
  }, [columnQuery, draftColumns, definitionMap]);

  if (!isOpen) {
    return null;
  }

  const handleToggleVisible = (columnId) => {
    setDraftColumns((prev) =>
      prev.map((column) =>
        column.id === columnId ? { ...column, visible: column.visible !== false ? false : true } : column,
      ),
    );
  };

  const handleWidthChange = (columnId, value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return;
    }
    setDraftColumns((prev) =>
      prev.map((column) => (column.id === columnId ? { ...column, width: numeric } : column)),
    );
  };

  const moveColumn = (columnId, direction) => {
    setDraftColumns((prev) => {
      const index = prev.findIndex((column) => column.id === columnId);
      if (index === -1) {
        return prev;
      }
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= prev.length) {
        return prev;
      }
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return next.map((column, order) => ({ ...column, order }));
    });
  };

  const handleApply = () => {
    onApply?.(draftColumns.map((column, index) => ({ ...column, order: index })));
  };

  return (
    <div className={styles.columnsOverlay} role="dialog" aria-modal="true">
      <div className={styles.columnsPopover}>
        <div className={styles.columnsHeader}>
          <h2 className={styles.modalTitle}>Customize columns</h2>
          <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Close customize columns">
            <FiX aria-hidden />
          </button>
        </div>

        <div className={styles.columnsSearchRow}>
          <div className={styles.columnsSearchField}>
            <FiSearch className={styles.columnsSearchIcon} aria-hidden />
            <input
              type="search"
              className={styles.columnsSearchInput}
              placeholder="Find a column"
              value={columnQuery}
              onChange={(event) => setColumnQuery(event.target.value)}
            />
          </div>
          <button type="button" className={styles.secondaryButton} onClick={onReset}>
            <FiRotateCcw aria-hidden /> Reset
          </button>
        </div>

        <div className={styles.columnsListWrap}>
          <ul className={styles.columnsList}>
            {filteredColumns.map((column, index) => {
              const definition = definitionMap.get(column.id) ?? {};
              const label = definition.label ?? column.id;
              const minWidth = definition.minWidth ?? 80;
              return (
                <li key={column.id} className={styles.columnRow}>
                  <span className={styles.columnDragHandle}>
                    <FiMove aria-hidden />
                  </span>
                  <div className={styles.columnMainControls}>
                    <label className={styles.columnLabel}>
                      <input
                        type="checkbox"
                        className={styles.columnCheckbox}
                        checked={column.visible !== false}
                        onChange={() => handleToggleVisible(column.id)}
                      />
                      {label}
                    </label>
                    <div className={styles.columnFormatGroup}>
                      <span className={styles.columnFormatLabel}>Width</span>
                      <input
                        type="number"
                        min={minWidth}
                        value={Math.round(column.width ?? minWidth)}
                        onChange={(event) => handleWidthChange(column.id, event.target.value)}
                      />
                    </div>
                  </div>
                  <div className={styles.columnWidthGroup}>
                    <span className={styles.columnWidthValue}>#{index + 1}</span>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={() => moveColumn(column.id, -1)}
                      aria-label={`Move ${label} up`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={() => moveColumn(column.id, 1)}
                      aria-label={`Move ${label} down`}
                    >
                      ↓
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className={styles.columnsFooter}>
          <button type="button" className={styles.modalApply} onClick={handleApply}>
            Apply changes
          </button>
        </div>
      </div>
    </div>
  );
}
