import { useEffect, useMemo, useRef, useState } from 'react';
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
  const dragItemIdRef = useRef(null);
  const [dragState, setDragState] = useState({ draggingId: null, overId: null, placement: 'after' });

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

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

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
        column.id === columnId && !Number.isNaN(nextWidth)
          ? { ...column, width: nextWidth }
          : column,
      ),
    );
  };

  const handleFormatChange = (columnId) => (event) => {
    const { value } = event.target;
    setDraftColumns((prev) =>
      prev.map((column) => (column.id === columnId ? { ...column, format: value } : column)),
    );
  };

  const moveColumn = (columnsList, sourceId, targetId, placement = 'before') => {
    if (!sourceId || sourceId === targetId) {
      return columnsList;
    }

    const next = [...columnsList];
    const fromIndex = next.findIndex((column) => column.id === sourceId);

    if (fromIndex === -1) {
      return columnsList;
    }

    const [moved] = next.splice(fromIndex, 1);

    if (!targetId) {
      next.push(moved);
    } else {
      const toIndex = next.findIndex((column) => column.id === targetId);
      if (toIndex === -1) {
        next.push(moved);
      } else {
        const insertIndex = placement === 'after' ? toIndex + 1 : toIndex;
        const boundedIndex = Math.min(Math.max(insertIndex, 0), next.length);
        next.splice(boundedIndex, 0, moved);
      }
    }

    const isSameOrder =
      next.length === columnsList.length &&
      next.every((column, index) => column.id === columnsList[index].id);

    return isSameOrder ? columnsList : next;
  };

  const handleDragStart = (columnId) => (event) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(columnId));
    dragItemIdRef.current = columnId;
    setDragState({ draggingId: columnId, overId: columnId, placement: 'before' });
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (columnId) => (event) => {
    handleDragOver(event);
    const sourceId = dragItemIdRef.current;
    if (!sourceId) {
      return;
    }
    if (!columnId) {
      setDragState({ draggingId: sourceId, overId: null, placement: 'after' });
      return;
    }
    if (sourceId === columnId) {
      setDragState({ draggingId: sourceId, overId: columnId, placement: 'after' });
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const isBefore = event.clientY - rect.top < rect.height / 2;
    setDragState({
      draggingId: sourceId,
      overId: columnId,
      placement: isBefore ? 'before' : 'after',
    });
  };

  const handleDragEnd = () => {
    dragItemIdRef.current = null;
    setDragState({ draggingId: null, overId: null, placement: 'after' });
  };

  const handleDrop = (targetId) => (event) => {
    handleDragOver(event);
    const sourceId = event.dataTransfer.getData('text/plain') || dragItemIdRef.current;
    if (!sourceId) {
      return;
    }
    if (sourceId === targetId) {
      handleDragEnd();
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const placement = event.clientY - rect.top < rect.height / 2 ? 'before' : 'after';
    setDraftColumns((prev) => moveColumn(prev, sourceId, targetId, placement));
    handleDragEnd();
  };

  const handleDropToEnd = (event) => {
    handleDragOver(event);
    const sourceId = event.dataTransfer.getData('text/plain') || dragItemIdRef.current;
    if (!sourceId) {
      return;
    }
    setDraftColumns((prev) => moveColumn(prev, sourceId, null, 'after'));
    handleDragEnd();
  };

  const handleApply = () => {
    onApply(
      draftColumns.map((column, order) => ({
        ...column,
        order,
      })),
    );
  };

  const handleReset = () => {
    onReset();
  };

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className={styles.columnsOverlay}
      role="presentation"
      onMouseDown={handleOverlayClick}
      data-testid="transactions-customize-columns"
    >
      <div
        className={styles.columnsPopover}
        role="dialog"
        aria-modal="true"
        aria-label="Customize columns"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={styles.columnsHeader}>
          <h2 className={styles.modalTitle}>Customize Columns</h2>
          <button
            type="button"
            className={styles.iconButton}
            onClick={onClose}
            aria-label="Close column customization"
            data-testid="transactions-customize-close"
          >
            <FiX aria-hidden />
          </button>
        </div>

        <p className={styles.modalDescription}>
          Drag to reorder, adjust width, and quickly filter the columns you need.
        </p>

        <div className={styles.columnsSearchRow}>
          <div className={styles.columnsSearchField}>
            <FiSearch aria-hidden className={styles.columnsSearchIcon} />
            <input
              type="search"
              value={columnQuery}
              onChange={(event) => setColumnQuery(event.target.value)}
              placeholder="Search columns"
              className={styles.columnsSearchInput}
              aria-label="Search columns"
              data-testid="transactions-customize-search"
            />
          </div>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={handleReset}
            data-testid="transactions-customize-reset"
          >
            <FiRotateCcw aria-hidden /> Reset
          </button>
        </div>

        <div className={styles.columnsListWrap}>
          <ul
            className={styles.columnsList}
            data-drop-tail={
              dragState.draggingId && dragState.overId === null ? 'true' : undefined
            }
            onDragOver={handleDragOver}
            onDrop={handleDropToEnd}
            onDragEnter={handleDragEnter(null)}
          >
            {filteredColumns.map((column) => {
              const definition = definitionMap.get(column.id);
              if (!definition) {
                return null;
              }

              const sliderMin = definition.minWidth ?? 120;
              const sliderMax = Math.max(
                definition.maxWidth ?? 640,
                definition.defaultWidth ?? sliderMin,
                column.width ?? sliderMin,
              );
              const presetOptions = Array.isArray(definition.formatOptions)
                ? definition.formatOptions
                : [];
              const hasCustomFormatOption =
                Boolean(column.format) && !presetOptions.includes(column.format);

              const isDragging = dragState.draggingId === column.id;
              const isOver =
                dragState.overId === column.id && dragState.draggingId !== column.id;
              const rowClass = [
                styles.columnRow,
                isDragging ? styles.columnRowDragging : '',
                isOver ? styles.columnRowPreview : '',
              ]
                .filter(Boolean)
                .join(' ');
              const previewPosition = isOver ? dragState.placement : undefined;

              return (
                <li
                  key={column.id}
                  className={rowClass}
                  data-preview-position={previewPosition}
                  draggable
                  onDragStart={handleDragStart(column.id)}
                  onDragEnter={handleDragEnter(column.id)}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop(column.id)}
                  onDragEnd={handleDragEnd}
                  data-testid={`transactions-customize-row-${column.id}`}
                >
                  <span className={styles.columnDragHandle} aria-hidden>
                    <FiMove />
                  </span>
                  <div className={styles.columnMainControls}>
                    <label className={styles.columnLabel} htmlFor={`column-visible-${column.id}`}>
                      <input
                        type="checkbox"
                        id={`column-visible-${column.id}`}
                        checked={column.visible}
                        onChange={handleToggleVisible(column.id)}
                        className={styles.columnCheckbox}
                        data-testid={`transactions-column-visible-${column.id}`}
                      />
                      <span>{definition.label}</span>
                    </label>

                    {presetOptions.length > 0 ? (
                      <div className={styles.columnFormatGroup}>
                        <label
                          htmlFor={`column-format-${column.id}`}
                          className={styles.columnFormatControl}
                        >
                          <span className={styles.columnFormatLabel}>Format</span>
                          <select
                            id={`column-format-${column.id}`}
                            value={column.format ?? definition.defaultFormat ?? ''}
                            onChange={handleFormatChange(column.id)}
                            className={styles.columnFormatSelect}
                            data-testid={`transactions-customize-format-${column.id}`}
                          >
                            {presetOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                            {hasCustomFormatOption ? (
                              <option value={column.format}>{`Custom (${column.format})`}</option>
                            ) : null}
                          </select>
                        </label>
                        {definition.dataType === 'date' ? (
                          <label
                            htmlFor={`column-format-custom-${column.id}`}
                            className={styles.columnFormatControl}
                          >
                            <span className={styles.columnFormatLabel}>Custom</span>
                            <input
                              id={`column-format-custom-${column.id}`}
                              type="text"
                              value={column.format ?? definition.defaultFormat ?? ''}
                              onChange={handleFormatChange(column.id)}
                              placeholder="DD/MM/YY"
                              className={styles.columnFormatInput}
                              data-testid={`transactions-customize-format-${column.id}-custom`}
                            />
                          </label>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <div className={styles.columnWidthGroup}>
                    <span className={styles.columnWidthValue}>{column.width}px</span>
                    <input
                      id={`column-width-${column.id}`}
                      type="range"
                      min={sliderMin}
                      max={sliderMax}
                      step={4}
                      value={column.width}
                      onChange={handleWidthChange(column.id)}
                      className={styles.columnWidthSlider}
                      aria-label={`Adjust width for ${definition.label}`}
                      data-testid={`transactions-customize-width-${column.id}`}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className={styles.columnsFooter}>
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
