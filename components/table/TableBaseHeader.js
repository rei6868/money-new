import { useLayoutEffect, useMemo, useRef, useState } from 'react';

import styles from '../../styles/TransactionsHistory.module.css';
import {
  ACTIONS_COLUMN_WIDTH,
  CHECKBOX_COLUMN_WIDTH,
  STICKY_COLUMN_BUFFER,
} from './tableUtils';

export function TableBaseHeader({
  columns,
  definitionMap,
  isColumnReorderMode = false,
  activeDropTarget,
  onColumnDragStart,
  onColumnDragEnter,
  onColumnDragOver,
  onColumnDrop,
  onColumnDragEnd,
  allSelected = false,
  isIndeterminate = false,
  onSelectAll,
  headerCheckboxRef,
  visibleColumnIds = [],
  onColumnVisibilityChange,
}) {
  const headerRowRef = useRef(null);
  const [mainHeaderHeight, setMainHeaderHeight] = useState(0);

  useLayoutEffect(() => {
    if (!isColumnReorderMode || !headerRowRef.current) {
      return undefined;
    }

    const measure = () => {
      const rect = headerRowRef.current.getBoundingClientRect();
      setMainHeaderHeight(rect.height);
    };

    measure();
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('resize', measure);
    };
  }, [isColumnReorderMode, columns]);

  const visibleIdSet = useMemo(() => new Set(visibleColumnIds), [visibleColumnIds]);

  const renderHeaderCell = (column) => {
    const definition = definitionMap.get(column.id);
    const alignClass =
      definition?.align === 'right'
        ? styles.headerAlignRight
        : definition?.align === 'center'
        ? styles.headerAlignCenter
        : '';
    const headerTitle = definition?.label ?? column.id;
    const isHidden = column.visible === false;
    const isDropping = isColumnReorderMode && activeDropTarget === column.id;
    const headerClassName = `${styles.headerCell} ${alignClass} ${
      isColumnReorderMode ? styles.headerReorderActive : ''
    } ${isDropping ? styles.headerReorderTarget : ''} ${
      isHidden && isColumnReorderMode ? styles.headerCellHidden : ''
    }`.trim();
    const isDraggable = isColumnReorderMode && column.visible !== false;

    return (
      <th
        key={column.id}
        scope="col"
        className={headerClassName}
        style={{
          minWidth: `${Math.max(definition?.minWidth ?? 120, column.width)}px`,
          width: `${column.width}px`,
        }}
        draggable={isDraggable}
        onDragStart={isDraggable && onColumnDragStart ? onColumnDragStart(column.id) : undefined}
        onDragEnter={
          isColumnReorderMode && onColumnDragEnter ? onColumnDragEnter(column.id) : undefined
        }
        onDragOver={isColumnReorderMode ? onColumnDragOver : undefined}
        onDragEnd={isColumnReorderMode ? onColumnDragEnd : undefined}
        onDrop={isColumnReorderMode && onColumnDrop ? onColumnDrop(column.id) : undefined}
      >
        <div className={styles.headerShell}>
          <span className={styles.headerStaticLabel}>{headerTitle}</span>
        </div>
      </th>
    );
  };

  const renderToggleCell = (column) => {
    const definition = definitionMap.get(column.id);
    const headerTitle = definition?.label ?? column.id;
    const isVisible = visibleIdSet.has(column.id);
    const isToggleable = column.id !== 'notes';
    const totalVisibleColumns = visibleIdSet.size;
    const canToggle = isToggleable && !(isVisible && totalVisibleColumns <= 1);

    const baseClass = `${styles.columnToggleHeaderCell} ${
      isVisible ? styles.columnToggleVisible : styles.columnToggleHidden
    }`;

    return (
      <th
        key={`toggle-${column.id}`}
        scope="col"
        className={baseClass}
        style={{
          minWidth: `${Math.max(definition?.minWidth ?? 120, column.width)}px`,
          width: `${column.width}px`,
        }}
      >
        <div className={styles.columnToggleContent}>
          <label
            className={styles.columnToggleSwitch}
            title="Show/hide this column"
          >
            <input
              type="checkbox"
              checked={isVisible}
              onChange={(event) =>
                onColumnVisibilityChange?.(column.id, event.target.checked)
              }
              disabled={!canToggle}
              aria-label={`Show or hide ${headerTitle} column`}
              data-testid={`transactions-columns-toggle-${column.id}`}
            />
            <span className={styles.columnToggleTrack}>
              <span className={styles.columnToggleThumb} />
            </span>
          </label>
        </div>
      </th>
    );
  };

  const headerStyle = isColumnReorderMode
    ? { '--table-header-main-height': `${mainHeaderHeight}px` }
    : undefined;

  return (
    <thead className={styles.tableHeader} style={headerStyle}>
      <tr ref={headerRowRef}>
        <th
          scope="col"
          className={`${styles.headerCell} ${styles.stickyLeft} ${styles.checkboxCell} ${styles.stickyLeftNoShadow}`}
          style={{
            minWidth: `${CHECKBOX_COLUMN_WIDTH}px`,
            width: `${CHECKBOX_COLUMN_WIDTH}px`,
          }}
        >
          <div className={styles.headerCheckboxInner}>
            <input
              ref={headerCheckboxRef}
              type="checkbox"
              aria-label="Select all rows"
              aria-checked={isIndeterminate ? 'mixed' : allSelected ? 'true' : 'false'}
              checked={allSelected}
              onChange={(event) => onSelectAll?.(event.target.checked)}
              data-testid="transaction-select-all"
            />
          </div>
        </th>
        {columns.map((column) => renderHeaderCell(column))}
        <th
          scope="col"
          className={`${styles.headerCell} ${styles.actionsHeader} ${styles.stickyRight}`}
          style={{
            left: `${CHECKBOX_COLUMN_WIDTH}px`,
            minWidth: `${STICKY_COLUMN_BUFFER - CHECKBOX_COLUMN_WIDTH}px`,
            width: `${STICKY_COLUMN_BUFFER - CHECKBOX_COLUMN_WIDTH}px`,
          }}
        >
          <span className={styles.actionsHeaderLabel}>Actions</span>
        </th>
      </tr>
      {isColumnReorderMode ? (
        <tr className={styles.customizeHeaderRow}>
          <th
            aria-hidden="true"
            className={`${styles.columnToggleHeaderCell} ${styles.stickyLeft} ${styles.checkboxCell} ${styles.stickyLeftNoShadow}`}
            style={{
              minWidth: `${CHECKBOX_COLUMN_WIDTH}px`,
              width: `${CHECKBOX_COLUMN_WIDTH}px`,
            }}
          />
          {columns.map((column) => renderToggleCell(column))}
          <th
            aria-hidden="true"
            className={`${styles.columnToggleHeaderCell} ${styles.actionsHeader} ${styles.stickyRight}`}
            style={{
              left: `${CHECKBOX_COLUMN_WIDTH}px`,
              minWidth: `${ACTIONS_COLUMN_WIDTH}px`,
              width: `${ACTIONS_COLUMN_WIDTH}px`,
            }}
          />
        </tr>
      ) : null}
    </thead>
  );
}
