import styles from './TableBase.module.css';
import { resolveColumnSizing, SELECTION_COLUMN_WIDTH } from './tableUtils';

function classNames(...values) {
  return values.filter(Boolean).join(' ');
}

function getCellValue(row, column) {
  if (!column) {
    return undefined;
  }
  if (typeof column.accessor === 'function') {
    return column.accessor(row);
  }
  const key = column.accessor ?? column.field ?? column.id;
  return key ? row?.[key] : undefined;
}

export function TableBaseBody({
  rows,
  columns,
  selectable = false,
  selection = new Set(),
  onToggleRow,
  getRowId,
  showHiddenColumns = false,
  isColumnReorderMode = false,
  renderEmptyState,
  emptyState,
  rowProps,
  onRowClick,
  onRowDoubleClick,
}) {
  const displayedColumns = Array.isArray(columns)
    ? showHiddenColumns
      ? columns
      : columns.filter((column) => column.hidden !== true)
    : [];

  const resolvedRows = Array.isArray(rows) ? rows : [];

  if (resolvedRows.length === 0) {
    const colSpan = displayedColumns.length + (selectable ? 1 : 0);
    return (
      <tbody>
        <tr className={styles.emptyRow}>
          <td className={styles.bodyCell} colSpan={Math.max(1, colSpan)}>
            {renderEmptyState ? (
              renderEmptyState()
            ) : (
              <div className={styles.emptyState}>{emptyState ?? 'No records to display.'}</div>
            )}
          </td>
        </tr>
      </tbody>
    );
  }

  return (
    <tbody>
      {resolvedRows.map((row, rowIndex) => {
        const rowId = getRowId ? getRowId(row, rowIndex) : row?.id ?? rowIndex;
        const isSelected = selection.has(rowId);
        const toggleRow = (checked = !isSelected) => {
          onToggleRow?.(rowId, checked);
        };

        const providedRowProps = rowProps?.({ row, rowIndex, rowId, isSelected }) ?? {};
        const {
          className: providedRowClassName,
          style: providedRowStyle,
          onClick: providedOnClick,
          onDoubleClick: providedOnDoubleClick,
          ...restRowProps
        } = providedRowProps;

        const rowClassName = classNames(
          styles.bodyRow,
          isSelected ? styles.rowSelected : null,
          onRowClick ? styles.rowClickable : null,
          providedRowClassName,
        );

        const handleRowClick = (event) => {
          providedOnClick?.(event);
          if (event.defaultPrevented) {
            return;
          }
          onRowClick?.(row, { rowId, rowIndex, event });
        };

        const handleRowDoubleClick = (event) => {
          providedOnDoubleClick?.(event);
          if (event.defaultPrevented) {
            return;
          }
          onRowDoubleClick?.(row, { rowId, rowIndex, event });
        };

        return (
          <tr
            key={rowId ?? rowIndex}
            className={rowClassName}
            style={providedRowStyle}
            onClick={onRowClick || providedOnClick ? handleRowClick : providedOnClick}
            onDoubleClick={
              onRowDoubleClick || providedOnDoubleClick
                ? handleRowDoubleClick
                : providedOnDoubleClick
            }
            {...restRowProps}
          >
            {selectable ? (
              <td
                className={classNames(styles.bodyCell, styles.selectionCell)}
                style={{
                  minWidth: `${SELECTION_COLUMN_WIDTH}px`,
                  width: `${SELECTION_COLUMN_WIDTH}px`,
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(event) => toggleRow(event.target.checked)}
                  aria-label={`Select row ${rowIndex + 1}`}
                />
              </td>
            ) : null}
            {displayedColumns.map((column) => {
              const { minWidth, width } = resolveColumnSizing(column);
              const alignClass =
                column.align === 'right'
                  ? styles.cellAlignRight
                  : column.align === 'center'
                  ? styles.cellAlignCenter
                  : '';
              const isHidden = column.hidden === true;
              const cellContext = {
                row,
                rowIndex,
                column,
                value: getCellValue(row, column),
                rowId,
                isSelected,
                toggleRow,
              };
              const cellProps = column.getCellProps?.(cellContext) ?? {};
              const {
                className: providedCellClassName,
                style: providedCellStyle,
                children: providedChildren,
                ...restCellProps
              } = cellProps;
              const content =
                providedChildren ??
                (typeof column.renderCell === 'function'
                  ? column.renderCell(cellContext)
                  : cellContext.value ?? column.placeholder ?? '—');
              const cellClassName = classNames(
                styles.bodyCell,
                alignClass,
                column.sticky === 'left' ? styles.stickyLeft : null,
                column.sticky === 'right' ? styles.stickyRight : null,
                isHidden && showHiddenColumns && isColumnReorderMode ? styles.hiddenColumnCell : null,
                column.className,
                providedCellClassName,
              );

              return (
                <td
                  key={column.id}
                  className={cellClassName}
                  style={{
                    minWidth: `${minWidth}px`,
                    width: `${width}px`,
                    ...providedCellStyle,
                  }}
                  aria-hidden={
                    isHidden && showHiddenColumns && isColumnReorderMode ? 'true' : undefined
                  }
                  {...restCellProps}
                >
                  {content}
                </td>
              );
            })}
          </tr>
        );
      })}
    </tbody>
  );
}
