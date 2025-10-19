import styles from '../../styles/TransactionsHistory.module.css';

function SortIcon({ direction, dataType }) {
  const iconType = dataType === 'number' ? 'number' : 'text';
  const arrowClass = `${styles.sortIconArrow} ${
    direction === 'desc' ? styles.sortIconArrowDesc : ''
  }`.trim();
  const rootClass = `${styles.sortIcon} ${direction ? styles.sortIconActive : ''}`.trim();

  return (
    <span className={rootClass} aria-hidden>
      <span
        className={`${styles.sortIconGlyph} ${
          iconType === 'number' ? styles.sortIconDigits : styles.sortIconLetters
        }`.trim()}
      >
        {iconType === 'number' ? (
          <>
            <span>0</span>
            <span>9</span>
          </>
        ) : (
          <>
            <span>A</span>
            <span>Z</span>
          </>
        )}
      </span>
      <span className={arrowClass} />
    </span>
  );
}

export function TableBaseHeader({
  columns,
  definitionMap,
  sortLookup,
  sortState,
  onSortToggle,
  isColumnReorderMode = false,
  activeDropTarget,
  onColumnDragStart,
  onColumnDragEnter,
  onColumnDragOver,
  onColumnDrop,
  onColumnDragEnd,
}) {
  return (
    <>
      {columns.map((column) => {
        const definition = definitionMap.get(column.id);
        const alignClass =
          definition?.align === 'right'
            ? styles.headerAlignRight
            : definition?.align === 'center'
            ? styles.headerAlignCenter
            : '';
        const sortDescriptor = sortLookup.get(column.id);
        const isSorted = Boolean(sortDescriptor);
        const sortDirection = sortDescriptor?.direction ?? 'asc';
        const sortOrder = sortDescriptor ? sortDescriptor.index + 1 : null;
        const isSortable = definition?.sortable;
        const headerTitle = definition?.label ?? column.id;
        const isHidden = column.visible === false;
        const dataType = definition?.dataType === 'number' ? 'number' : 'text';
        const isDropping = isColumnReorderMode && activeDropTarget === column.id;
        const isSortDisabled = isColumnReorderMode;
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
            onDragStart={
              isDraggable && onColumnDragStart
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
              isColumnReorderMode && onColumnDrop
                ? onColumnDrop(column.id)
                : undefined
            }
          >
            <div className={styles.headerShell}>
              <span className={styles.headerStaticLabel}>{headerTitle}</span>
              {isSortable && onSortToggle ? (
                <button
                  type="button"
                  className={`${styles.headerSortButton} ${
                    isSorted ? styles.headerSortActive : ''
                  }`.trim()}
                  onClick={(event) => onSortToggle(column.id, event)}
                  data-testid={`transactions-sort-${column.id}`}
                  aria-label={`Sort by ${headerTitle}`}
                  disabled={isSortDisabled}
                >
                  <SortIcon
                    direction={isSorted ? sortDirection : undefined}
                    dataType={dataType}
                  />
                  {isSorted && sortState?.length > 1 ? (
                    <span className={styles.headerSortOrder}>{sortOrder}</span>
                  ) : null}
                </button>
              ) : null}
            </div>
          </th>
        );
      })}
    </>
  );
}
