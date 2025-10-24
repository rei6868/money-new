import { useLayoutEffect, useMemo, useRef, useState } from 'react';

import headerStyles from './TableBaseHeader.module.css';
import styles from './TableBase.module.css';
import { Tooltip } from '../ui/Tooltip';
import {
  ACTIONS_COLUMN_WIDTH,
  CHECKBOX_COLUMN_WIDTH,
  STICKY_COLUMN_BUFFER,
  resolveColumnSizing,
  resolveColumnSortType,
} from './tableUtils';

function SortIcon({ direction }) {
  const isActive = direction === 'asc' || direction === 'desc';
  const iconClassName = `${headerStyles.sortIcon} ${isActive ? headerStyles.sortIconActive : ''}`.trim();

  let icon;
  if (direction === 'asc') {
    icon = '↑';
  } else if (direction === 'desc') {
    icon = '↓';
  } else {
    icon = '↕';
  }

  return (
    <span className={iconClassName} aria-hidden="true">
      {icon}
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
        ? headerStyles.headerAlignRight
        : definition?.align === 'center'
        ? headerStyles.headerAlignCenter
        : '';
    const headerTitle = definition?.label ?? column.id;
    const isHidden = column.visible === false;
    const isDropping = isColumnReorderMode && activeDropTarget === column.id;
    const headerClassName = `${headerStyles.headerCell} ${alignClass} ${
      isColumnReorderMode ? headerStyles.headerReorderActive : ''
    } ${isDropping ? headerStyles.headerReorderTarget : ''} ${
      isHidden && isColumnReorderMode ? headerStyles.headerCellHidden : ''
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
    const sortButtonClassName = `${headerStyles.headerSortButton} ${
      sortDirection ? headerStyles.headerSortActive : ''
    }`.trim();

    // Toggle switch logic for customization mode
    const isVisible = column.visible !== false;
    const totalVisibleColumns = visibleIdSet.size;
    const isToggleable = column.id !== 'notes';
    const isLastVisible = isVisible && totalVisibleColumns <= 1;
    const isInteractive = isToggleable && !isLastVisible;

    const handleToggleChange = (event) => {
      if (!isInteractive) {
        event.preventDefault();
        return;
      }
      onColumnVisibilityChange?.(column.id, event.target.checked);
    };

    const { minWidth, width } = resolveColumnSizing(column, definition);

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
          minWidth: isColumnReorderMode ? 'max-content' : `${minWidth}px`,
          width: isColumnReorderMode ? 'auto' : `${width}px`,
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
        <div className={headerStyles.headerShell}>
          <div className={headerStyles.headerContent}>
            <span className={headerStyles.headerStaticLabel}>
              <span className={headerStyles.headerLabelText}>{headerTitle}</span>
            </span>
            {isColumnReorderMode && (
              <label
                className={headerStyles.columnToggleSwitch}
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
                <span className={headerStyles.columnToggleTrack}>
                  <span className={headerStyles.columnToggleThumb} />
                </span>
              </label>
            )}
          </div>
          <Tooltip content={tooltipContent}>
            <button
              type="button"
              className={sortButtonClassName}
              onClick={handleSortClick}
              disabled={isColumnReorderMode}
              aria-label={tooltipContent}
            >
              <SortIcon direction={sortDirection ?? undefined} />
            </button>
          </Tooltip>
        </div>
      </th>
    );
  };



  const headerStyle = isColumnReorderMode
    ? { '--table-header-main-height': `${mainHeaderHeight}px` }
    : undefined;

  return (
    <thead className={headerStyles.tableHeader} style={headerStyle}>
      <tr ref={headerRowRef}>
        <th
          scope="col"
          className={`${headerStyles.headerCell} ${styles.stickyLeft} ${styles.checkboxCell} ${styles.stickyLeftNoShadow}`}
          style={{
            minWidth: `${CHECKBOX_COLUMN_WIDTH}px`,
            width: `${CHECKBOX_COLUMN_WIDTH}px`,
          }}
        >
          <div className={headerStyles.headerCheckboxInner}>
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
          aria-label="Task"
          className={`${headerStyles.headerCell} ${headerStyles.actionsHeader} ${styles.stickyRight}`}
          style={{
            left: `${CHECKBOX_COLUMN_WIDTH}px`,
            minWidth: `${STICKY_COLUMN_BUFFER - CHECKBOX_COLUMN_WIDTH}px`,
            width: `${STICKY_COLUMN_BUFFER - CHECKBOX_COLUMN_WIDTH}px`,
          }}
        >
          <div className={headerStyles.headerShell}>
            <span className={headerStyles.headerStaticLabel}>
              <span className={headerStyles.headerLabelText}>Task</span>
            </span>
          </div>
        </th>
      </tr>

    </thead>
  );
}
