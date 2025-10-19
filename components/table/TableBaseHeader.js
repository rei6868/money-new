import styles from '../../styles/TransactionsHistory.module.css';

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
            onDragStart={
              isDraggable && onColumnDragStart ? onColumnDragStart(column.id) : undefined
            }
            onDragEnter={
              isColumnReorderMode && onColumnDragEnter ? onColumnDragEnter(column.id) : undefined
            }
            onDragOver={isColumnReorderMode ? onColumnDragOver : undefined}
            onDragEnd={isColumnReorderMode ? onColumnDragEnd : undefined}
            onDrop={
              isColumnReorderMode && onColumnDrop ? onColumnDrop(column.id) : undefined
            }
          >
            <div className={styles.headerShell}>
              <span className={styles.headerStaticLabel}>{headerTitle}</span>
            </div>
          </th>
        );
      })}
    </>
  );
}
