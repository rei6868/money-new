import { useLayoutEffect, useMemo, useRef, useState } from 'react';

import styles from '../../styles/TransactionsHistory.module.css';
import { Tooltip } from '../ui/Tooltip';
import {
  ACTIONS_COLUMN_WIDTH,
  CHECKBOX_COLUMN_WIDTH,
  STICKY_COLUMN_BUFFER,
  resolveColumnSortType,
} from './tableUtils';

function SortIcon({ direction, dataType }) {
  const isActive = direction === 'asc' || direction === 'desc';
  const iconClassName = `${styles.sortIcon} ${isActive ? styles.sortIconActive : ''}`.trim();
  const arrowClassName = `${styles.sortIconArrow} ${
    direction === 'desc' ? styles.sortIconArrowDesc : ''
  } ${direction ? '' : styles.sortIconArrowIdle}`.trim();

  const glyphClassName =
    dataType === 'number' ? styles.sortIconDigits : styles.sortIconLetters;

  return (
    <span className={iconClassName} aria-hidden="true">
      <span className={glyphClassName}>
        {dataType === 'number' ? (
          <>
            <span>0</span>
            <span>9</span>
          </>
        ) : (
          <>
            <span>a</span>
            <span>z</span>
          </>
        )}
      </span>
      <span className={arrowClassName} />
    </span>
  );
}

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
  sortState,
  onSortChange,
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
    const isSorted = sortState?.columnId === column.id && sortState.direction;
    const sortDirection = isSorted ? sortState.direction : null;
    const sortType = resolveColumnSortType(column.id, definition);
    const iconType = sortType === 'number' || sortType === 'date' ? 'number' : 'string';
    const tooltipContent = isSorted
      ? sortDirection === 'asc'
        ? 'Sorted Ascending'
        : 'Sorted Descending'
      : `Sort by ${headerTitle}`;
    const ariaSort = sortDirection === 'asc' ? 'ascending' : sortDirection === 'desc' ? 'descending' : 'none';
    const sortButtonClassName = `${styles.headerSortButton} ${
      sortDirection ? styles.headerSortActive : ''
    }`.trim();

    const handleSortClick = () => {
      if (isColumnReorderMode) {
        return;
      }
      const nextDirection =
        sortDirection === 'asc' ? 'desc' : sortDirection === 'desc' ? null : 'asc';
      onSortChange?.(column.id, nextDirection);
    };

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
        aria-sort={ariaSort}
      >
        <div className={styles.headerShell}>
          <span className={styles.headerStaticLabel}>
            <span className={styles.headerLabelText}>{headerTitle}</span>
          </span>
          <Tooltip content={tooltipContent}>
            <button
              type="button"
              className={sortButtonClassName}
              onClick={handleSortClick}
              disabled={isColumnReorderMode}
              aria-label={tooltipContent}
            >
              <SortIcon direction={sortDirection ?? undefined} dataType={iconType} />
            </button>
          </Tooltip>
        </div>
      </th>
    );
  };

  const renderToggleCell = (column) => {
    const definition = definitionMap.get(column.id);
    const headerTitle = definition?.label ?? column.id;
    const isVisible = column.visible !== false;
    const totalVisibleColumns = visibleIdSet.size;
    const isToggleable = column.id !== 'notes';
    const isLastVisible = isVisible && totalVisibleColumns <= 1;
    const isInteractive = isToggleable && !isLastVisible;

    const baseClass = `${styles.columnToggleHeaderCell} ${
      isVisible ? styles.columnToggleVisible : styles.columnToggleHidden
    }`;

    const handleToggleChange = (event) => {
      if (!isInteractive) {
        event.preventDefault();
        return;
      }
      onColumnVisibilityChange?.(column.id, event.target.checked);
    };

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
            data-disabled={isInteractive ? undefined : 'true'}
          >
            <input
              type="checkbox"
              checked={isVisible}
              onChange={handleToggleChange}
              aria-label={`Show or hide ${headerTitle} column`}
              aria-disabled={isInteractive ? undefined : 'true'}
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
          aria-label="Actions"
          className={`${styles.headerCell} ${styles.actionsHeader} ${styles.stickyRight}`}
          style={{
            left: `${CHECKBOX_COLUMN_WIDTH}px`,
            minWidth: `${STICKY_COLUMN_BUFFER - CHECKBOX_COLUMN_WIDTH}px`,
            width: `${STICKY_COLUMN_BUFFER - CHECKBOX_COLUMN_WIDTH}px`,
          }}
        />
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
