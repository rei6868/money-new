import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import styles from './TableBase.module.css';
import { TableBaseHeader } from './TableBaseHeader';
import { TableBaseBody } from './TableBaseBody';
import { computeMinWidth, SELECTION_COLUMN_WIDTH } from './tableUtils';

function classNames(...values) {
  return values.filter(Boolean).join(' ');
}

function resolveRowId(row, index, getRowId) {
  if (typeof getRowId === 'function') {
    return getRowId(row, index);
  }
  if (row && typeof row === 'object' && 'id' in row) {
    return row.id;
  }
  return index;
}

function resolvePaginationContent(pagination) {
  if (!pagination) {
    return null;
  }
  if (typeof pagination === 'function') {
    return pagination();
  }
  if (typeof pagination.render === 'function') {
    return pagination.render();
  }
  return pagination;
}

export function TableBase({
  columns = [],
  rows = [],
  getRowId,
  selectable = false,
  selectedRowIds,
  defaultSelectedRowIds = [],
  onSelectionChange,
  toolbarSlot,
  pagination,
  sortState,
  onSortChange,
  className,
  ariaLabel = 'Data table',
  showHiddenColumns = false,
  isColumnReorderMode = false,
  onColumnOrderChange,
  fontScale = 1,
  renderEmptyState,
  emptyState,
  rowProps,
  onRowClick,
  onRowDoubleClick,
  renderFooter,
}) {
  const headerCheckboxRef = useRef(null);
  const dragSourceRef = useRef(null);
  const [activeDropTarget, setActiveDropTarget] = useState(null);
  const isSelectionControlled = selectedRowIds !== undefined;

  const normalizedRows = useMemo(() => (Array.isArray(rows) ? rows : []), [rows]);
  const normalizedColumns = useMemo(() => (Array.isArray(columns) ? columns : []), [columns]);

  const rowIds = useMemo(
    () => normalizedRows.map((row, index) => resolveRowId(row, index, getRowId)),
    [normalizedRows, getRowId],
  );

  const [internalSelection, setInternalSelection] = useState(() => new Set(defaultSelectedRowIds));

  useEffect(() => {
    if (!selectable) {
      setInternalSelection(new Set());
    }
  }, [selectable]);

  useEffect(() => {
    if (!selectable || isSelectionControlled) {
      return;
    }
    setInternalSelection((prev) => {
      const validIds = new Set(rowIds);
      const next = new Set();
      prev.forEach((id) => {
        if (validIds.has(id)) {
          next.add(id);
        }
      });
      return next;
    });
  }, [rowIds, selectable, isSelectionControlled]);

  const selectionSet = useMemo(() => {
    if (!selectable) {
      return new Set();
    }
    const source = isSelectionControlled ? selectedRowIds ?? [] : Array.from(internalSelection);
    return new Set(source);
  }, [selectable, isSelectionControlled, selectedRowIds, internalSelection]);

  const allSelected =
    selectable && rowIds.length > 0 && rowIds.every((id) => selectionSet.has(id));
  const isIndeterminate = selectable && selectionSet.size > 0 && !allSelected;

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  const setSelection = useCallback(
    (updater) => {
      if (!selectable) {
        return;
      }
      const base = new Set(selectionSet);
      const nextBase =
        typeof updater === 'function' ? updater(new Set(base)) ?? base : new Set(updater);
      const normalized = nextBase instanceof Set ? nextBase : new Set(nextBase);
      if (!isSelectionControlled) {
        setInternalSelection(new Set(normalized));
      }
      onSelectionChange?.(Array.from(normalized));
    },
    [selectable, selectionSet, isSelectionControlled, onSelectionChange],
  );

  const handleToggleRow = useCallback(
    (rowId, checked) => {
      setSelection((current) => {
        if (checked) {
          current.add(rowId);
        } else {
          current.delete(rowId);
        }
        return current;
      });
    },
    [setSelection],
  );

  const handleToggleAll = useCallback(
    (checked) => {
      if (!selectable) {
        return;
      }
      if (!checked) {
        setSelection(new Set());
        return;
      }
      const next = new Set();
      rowIds.forEach((id) => {
        next.add(id);
      });
      setSelection(next);
    },
    [selectable, rowIds, setSelection],
  );

  const displayedColumns = useMemo(() => {
    if (showHiddenColumns) {
      return normalizedColumns;
    }
    return normalizedColumns.filter((column) => column.hidden !== true);
  }, [normalizedColumns, showHiddenColumns]);

  const displayColumnIds = useMemo(
    () => displayedColumns.map((column) => column.id),
    [displayedColumns],
  );

  const tableMinWidth = useMemo(() => {
    const baseWidth = computeMinWidth(displayedColumns);
    return baseWidth + (selectable ? SELECTION_COLUMN_WIDTH : 0);
  }, [displayedColumns, selectable]);

  useEffect(() => {
    if (!isColumnReorderMode) {
      dragSourceRef.current = null;
      setActiveDropTarget(null);
    }
  }, [isColumnReorderMode]);

  const handleColumnDragStart = useCallback(
    (columnId) => (event) => {
      if (!isColumnReorderMode) {
        return;
      }
      dragSourceRef.current = columnId;
      setActiveDropTarget(columnId);
      if (event?.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        try {
          event.dataTransfer.setData('text/plain', columnId);
        } catch (error) {
          // ignore
        }
      }
    },
    [isColumnReorderMode],
  );

  const handleColumnDragEnter = useCallback(
    (columnId) => (event) => {
      if (!isColumnReorderMode || dragSourceRef.current === null) {
        return;
      }
      event?.preventDefault?.();
      if (columnId !== activeDropTarget) {
        setActiveDropTarget(columnId);
      }
    },
    [isColumnReorderMode, activeDropTarget],
  );

  const handleColumnDragOver = useCallback(
    (event) => {
      if (!isColumnReorderMode || dragSourceRef.current === null) {
        return;
      }
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
    },
    [isColumnReorderMode],
  );

  const handleColumnDrop = useCallback(
    (columnId) => (event) => {
      if (!isColumnReorderMode) {
        return;
      }
      event.preventDefault();
      const sourceId = dragSourceRef.current;
      dragSourceRef.current = null;
      setActiveDropTarget(null);
      if (!sourceId || sourceId === columnId) {
        return;
      }
      const sourceIndex = displayColumnIds.indexOf(sourceId);
      const targetIndex = displayColumnIds.indexOf(columnId);
      if (sourceIndex === -1 || targetIndex === -1) {
        return;
      }
      const nextOrder = [...displayColumnIds];
      nextOrder.splice(sourceIndex, 1);
      nextOrder.splice(targetIndex, 0, sourceId);
      onColumnOrderChange?.(nextOrder);
    },
    [isColumnReorderMode, displayColumnIds, onColumnOrderChange],
  );

  const handleColumnDragEnd = useCallback(() => {
    dragSourceRef.current = null;
    setActiveDropTarget(null);
  }, []);

  const containerClassName = classNames(styles.container, className);
  const paginationContent = resolvePaginationContent(pagination);

  const footerContent = renderFooter?.({
    columns: displayedColumns,
    allColumns: normalizedColumns,
    rows: normalizedRows,
    selection: selectionSet,
    allSelected,
  });

  return (
    <section
      className={containerClassName}
      aria-label={ariaLabel}
      style={{ '--table-font-scale': fontScale }}
    >
      {toolbarSlot ? <div className={styles.toolbar}>{toolbarSlot}</div> : null}
      <div className={styles.scroll}>
        <table className={styles.table} style={{ '--table-min-width': `${tableMinWidth}px` }}>
          <TableBaseHeader
            columns={normalizedColumns}
            selectable={selectable}
            allSelected={allSelected}
            isIndeterminate={isIndeterminate}
            onToggleAll={handleToggleAll}
            headerCheckboxRef={headerCheckboxRef}
            sortState={sortState}
            onSortChange={onSortChange}
            showHiddenColumns={showHiddenColumns}
            isColumnReorderMode={isColumnReorderMode}
            activeDropTarget={activeDropTarget}
            onColumnDragStart={handleColumnDragStart}
            onColumnDragEnter={handleColumnDragEnter}
            onColumnDragOver={handleColumnDragOver}
            onColumnDrop={handleColumnDrop}
            onColumnDragEnd={handleColumnDragEnd}
          />
          <TableBaseBody
            rows={normalizedRows}
            columns={normalizedColumns}
            selectable={selectable}
            selection={selectionSet}
            onToggleRow={handleToggleRow}
            getRowId={getRowId}
            showHiddenColumns={showHiddenColumns}
            isColumnReorderMode={isColumnReorderMode}
            renderEmptyState={renderEmptyState}
            emptyState={emptyState}
            rowProps={rowProps}
            onRowClick={onRowClick}
            onRowDoubleClick={onRowDoubleClick}
          />
          {footerContent ? <tfoot className={styles.footer}>{footerContent}</tfoot> : null}
        </table>
      </div>
      {paginationContent ? <div className={styles.paginationBar}>{paginationContent}</div> : null}
    </section>
  );
}
