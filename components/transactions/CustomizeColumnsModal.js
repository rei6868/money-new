import { useEffect, useMemo, useRef, useState } from 'react';
import { FiMove, FiRotateCcw, FiX } from 'react-icons/fi';
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
  const [draggingId, setDraggingId] = useState(null);
  const itemRefs = useRef(new Map());
  const [columnQuery, setColumnQuery] = useState('');
  const dragItemIdRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setDraftColumns(columns);
      setDraggingId(null);
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
  const handleFormatChange = (columnId) => (event) => {
    const { value } = event.target;
    setDraftColumns((prev) =>
      prev.map((column) => (column.id === columnId ? { ...column, format: value } : column)),
    );
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
    event.dataTransfer.setData('text/plain', String(columnId));
    dragItemIdRef.current = columnId;
  };

  const handleDragOver = (event) => {
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
  const reorderColumns = (sourceId, targetId) => {
    if (!sourceId || sourceId === targetId) {
      return;
    }
    updateColumnsWithAnimation((prev) => {
      const fromIndex = prev.findIndex((column) => column.id === fromId);
      if (fromIndex === -1 || fromIndex === prev.length - 1) {
        return prev;
      }
      const next = [...prev];
      const fromIndex = next.findIndex((column) => column.id === sourceId);
      const toIndex = targetId
        ? next.findIndex((column) => column.id === targetId)
        : next.length;

      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
        return prev;
      }

      const [moved] = next.splice(fromIndex, 1);
      next.push(moved);
      next.splice(toIndex, 0, moved);
      return next;
    });
    setDraggingId(null);
  };

  const handleDrop = (targetId) => (event) => {
    handleDragOver(event);
    const sourceId = event.dataTransfer.getData('text/plain') || dragItemIdRef.current;
    reorderColumns(sourceId, targetId);
    dragItemIdRef.current = null;
  };

  const handleDropToEnd = (event) => {
    handleDragOver(event);
    const sourceId = event.dataTransfer.getData('text/plain') || dragItemIdRef.current;
    reorderColumns(sourceId, null);
    dragItemIdRef.current = null;
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

          <ul
            className={styles.columnsList}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleListDrop}
          >
            {draftColumns.map((column) => {
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
          <ul className={styles.columnsList} onDragOver={handleDragOver} onDrop={handleDropToEnd}>
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
                  onDragOver={handleDragOver}
                  onDrop={handleDrop(column.id)}
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

                    {definition.formatOptions ? (
                      <label
                        htmlFor={`column-format-${column.id}`}
                        className={styles.columnFormatGroup}
                      >
                        <span className={styles.columnFormatLabel}>Format</span>
                        <select
                          id={`column-format-${column.id}`}
                          value={column.format ?? definition.defaultFormat ?? ''}
                          onChange={handleFormatChange(column.id)}
                          className={styles.columnFormatSelect}
                          data-testid={`transactions-customize-format-${column.id}`}
                        >
                          {definition.formatOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </label>
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
