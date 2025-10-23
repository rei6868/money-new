import { useMemo } from 'react';

import styles from './TableBase.module.css';
import { resolveColumnSizing, resolveColumnSortType, SELECTION_COLUMN_WIDTH } from './tableUtils';

function classNames(...values) {
  return values.filter(Boolean).join(' ');
}

function SortIcon({ direction, dataType }) {
  const arrowClassName = classNames(
    styles.sortIconArrow,
    direction === 'desc' ? styles.sortIconArrowDesc : null,
    direction ? null : styles.sortIconArrowIdle,
  );
  const glyphClassName = classNames(
    styles.sortIconGlyph,
    dataType === 'number' ? styles.sortIconDigits : null,
  );

  return (
    <span className={styles.sortIcon} aria-hidden="true">
      <span className={glyphClassName}>{dataType === 'number' ? '09' : 'AZ'}</span>
      <span className={arrowClassName} />
    </span>
  );
}

export function TableBaseHeader({
  columns,
  selectable = false,
  allSelected = false,
  isIndeterminate = false,
  onToggleAll,
  headerCheckboxRef,
  sortState,
  onSortChange,
  showHiddenColumns = false,
  isColumnReorderMode = false,
  activeDropTarget,
  onColumnDragStart,
  onColumnDragEnter,
  onColumnDragOver,
  onColumnDrop,
  onColumnDragEnd,
}) {
  const renderedColumns = useMemo(() => {
    if (!Array.isArray(columns)) {
      return [];
    }
    if (showHiddenColumns) {
      return columns;
    }
    return columns.filter((column) => column.hidden !== true);
  }, [columns, showHiddenColumns]);

  const handleToggleAll = (event) => {
    onToggleAll?.(event.target.checked);
  };

  return (
    <thead>
      <tr>
        {selectable ? (
          <th
            scope="col"
            className={classNames(styles.headerCell, styles.selectionCell)}
            style={{
              minWidth: `${SELECTION_COLUMN_WIDTH}px`,
              width: `${SELECTION_COLUMN_WIDTH}px`,
            }}
          >
            <div className={styles.headerContent}>
              <span className={styles.headerLabel}>
                <span className={styles.headerLabelText}>Select</span>
              </span>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={handleToggleAll}
                aria-label="Select all rows"
                ref={headerCheckboxRef}
                data-indeterminate={isIndeterminate ? 'true' : undefined}
              />
            </div>
          </th>
        ) : null}
        {renderedColumns.map((column) => {
          const { minWidth, width } = resolveColumnSizing(column);
          const alignClass =
            column.align === 'right'
              ? styles.headerAlignRight
              : column.align === 'center'
              ? styles.headerAlignCenter
              : '';
          const isHidden = column.hidden === true;
          const isDropping = isColumnReorderMode && activeDropTarget === column.id;
          const sortable = column.sortable !== false && typeof onSortChange === 'function';
          const isSorted = sortState?.columnId === column.id && sortState.direction;
          const sortDirection = isSorted ? sortState.direction : null;
          const sortType = resolveColumnSortType(column);
          const headerClassName = classNames(
            styles.headerCell,
            alignClass,
            column.sticky === 'left' ? styles.stickyLeft : null,
            column.sticky === 'right' ? styles.stickyRight : null,
            isHidden && showHiddenColumns ? styles.hiddenColumnHeader : null,
            isColumnReorderMode && sortable !== false ? styles.reorderActive : null,
            isDropping ? styles.reorderTarget : null,
            column.headerClassName,
          );
          const label = column.header ?? column.label ?? column.id;
          const headerProps = typeof column.getHeaderProps === 'function'
            ? column.getHeaderProps({ column, sortDirection, isSorted })
            : column.headerProps;

          const handleSortClick = () => {
            if (!sortable) {
              return;
            }
            const nextDirection =
              sortDirection === 'asc' ? 'desc' : sortDirection === 'desc' ? null : 'asc';
            onSortChange?.(column.id, nextDirection);
          };

          const renderHeader = () => {
            if (typeof column.renderHeader === 'function') {
              return column.renderHeader({ column, sortDirection, sortType, isSorted });
            }

            const buttonClassName = classNames(
              styles.sortButton,
              sortDirection ? styles.sortButtonActive : null,
            );

            return (
              <div className={styles.headerContent}>
                <span className={styles.headerLabel}>
                  <span className={styles.headerLabelText}>{label}</span>
                </span>
                {sortable ? (
                  <button
                    type="button"
                    className={buttonClassName}
                    onClick={handleSortClick}
                    disabled={isColumnReorderMode}
                    aria-label={
                      sortDirection === 'asc'
                        ? `Sorted ascending by ${label}`
                        : sortDirection === 'desc'
                        ? `Sorted descending by ${label}`
                        : `Sort by ${label}`
                    }
                  >
                    <SortIcon direction={sortDirection ?? undefined} dataType={sortType === 'number' ? 'number' : 'string'} />
                  </button>
                ) : null}
              </div>
            );
          };

          return (
            <th
              key={column.id}
              scope="col"
              className={headerClassName}
              style={{ minWidth: `${minWidth}px`, width: `${width}px` }}
              draggable={isColumnReorderMode && column.disableReorder !== true}
              onDragStart={
                isColumnReorderMode && onColumnDragStart && column.disableReorder !== true
                  ? onColumnDragStart(column.id)
                  : undefined
              }
              onDragEnter={
                isColumnReorderMode && onColumnDragEnter
                  ? onColumnDragEnter(column.id)
                  : undefined
              }
              onDragOver={isColumnReorderMode ? onColumnDragOver : undefined}
              onDragEnd={isColumnReorderMode ? onColumnDragEnd : undefined}
              onDrop={
                isColumnReorderMode && onColumnDrop ? onColumnDrop(column.id) : undefined
              }
              aria-sort={
                sortDirection === 'asc'
                  ? 'ascending'
                  : sortDirection === 'desc'
                  ? 'descending'
                  : 'none'
              }
              {...headerProps}
            >
              {renderHeader()}
            </th>
          );
        })}
      </tr>
    </thead>
  );
}
