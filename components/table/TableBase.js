import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import styles from './TableBase.module.css';
import { formatAmountWithTrailing } from '../../lib/numberFormat';
import {
  ACTIONS_COLUMN_WIDTH,
  CHECKBOX_COLUMN_WIDTH,
  STICKY_COLUMN_BUFFER,
  computeMinWidth,
  resolveColumnSizing,
  useDefinitionMap,
} from './tableUtils';
import { useActionMenuRegistry } from './TableActions';
import { TableBaseHeader } from './TableBaseHeader';
import { TableBaseBody } from './TableBaseBody';

function useMergedRefs(...refs) {
  return useCallback(
    (node) => {
      refs.forEach((ref) => {
        if (!ref) {
          return;
        }
        if (typeof ref === 'function') {
          ref(node);
        } else {
          // eslint-disable-next-line no-param-reassign
          ref.current = node;
        }
      });
    },
    [refs],
  );
}

function normalizeTotals(selectionSummary) {
  const mapValue = (value) => {
    if (value === null || value === undefined) {
      return null;
    }
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return null;
    }
    return formatAmountWithTrailing(numeric);
  };

  return {
    amount: mapValue(selectionSummary?.amount),
    totalBack: mapValue(selectionSummary?.totalBack),
    finalPrice: mapValue(selectionSummary?.finalPrice),
    count: Number(selectionSummary?.count ?? 0),
  };
}

function usePaginationMode({ scrollRef, tableRef, isEnabled }) {
  const [mode, setMode] = useState('sticky');

  useLayoutEffect(() => {
    if (!isEnabled) {
      setMode('hidden');
      return undefined;
    }

    const scrollEl = scrollRef.current;
    const tableEl = tableRef.current;
    if (!scrollEl || !tableEl || typeof ResizeObserver === 'undefined') {
      setMode('sticky');
      return undefined;
    }

    const updateMode = () => {
      const hasOverflow = scrollEl.scrollHeight - scrollEl.clientHeight > 2;
      setMode(hasOverflow ? 'sticky' : 'inline');
    };

    updateMode();

    const observer = new ResizeObserver(updateMode);
    observer.observe(scrollEl);
    observer.observe(tableEl);

    return () => observer.disconnect();
  }, [scrollRef, tableRef, isEnabled]);

  return mode;
}

const TableBaseInner = (
  {
    tableScrollRef,
    transactions,
    selectedIds,
    onSelectRow,
    onSelectAll,
    selectionSummary = null,
    onOpenAdvanced,
    columnDefinitions = [],
    visibleColumns,
    pagination,
    toolbarSlot,
    tableTitle = 'Transactions history table',
    allColumns = [],
    isColumnReorderMode = false,
    onColumnVisibilityChange,
    onColumnOrderChange,
    fontScale = 1,
    sortState,
    onSortChange,
    isShowingSelectedOnly = false,
    isFetching = false,
  },
  forwardedRef,
) => {
  const [openActionId, setOpenActionId] = useState(null);
  const [openActionSubmenu, setOpenActionSubmenu] = useState(null);
  const [isSubmenuFlipped, setIsSubmenuFlipped] = useState(false);
  const [activeDropTarget, setActiveDropTarget] = useState(null);

  const actionMenuCloseTimer = useRef(null);
  const headerCheckboxRef = useRef(null);
  const dragSourceRef = useRef(null);
  const internalScrollRef = useRef(null);
  const tableRef = useRef(null);

  const mergedScrollRef = useMergedRefs(internalScrollRef, tableScrollRef);
  useImperativeHandle(forwardedRef, () => internalScrollRef.current);

  const definitionMap = useDefinitionMap(columnDefinitions);
  const actionRegistry = useActionMenuRegistry();

  const selectionSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allSelected =
    transactions.length > 0 && transactions.every((txn) => selectionSet.has(txn.id));
  const isIndeterminate = selectionSet.size > 0 && !allSelected;
  const totals = useMemo(() => normalizeTotals(selectionSummary), [selectionSummary]);
  const selectionCount = Number(selectionSummary?.count ?? selectionSet.size);
  const shouldShowTotals = selectionCount > 0;

  const displayColumns = useMemo(
    () => (isColumnReorderMode ? allColumns : visibleColumns),
    [isColumnReorderMode, allColumns, visibleColumns],
  );

  const hiddenColumnIds = useMemo(
    () =>
      new Set(
        allColumns.filter((column) => column.visible === false).map((column) => column.id),
      ),
    [allColumns],
  );

  const columnDescriptors = useMemo(
    () =>
      displayColumns.map((column) => {
        const definition = definitionMap.get(column.id);
        const sizing = resolveColumnSizing(column, definition);
        const align = definition?.align ?? 'left';
        return {
          id: column.id,
          column,
          definition,
          minWidth: sizing.minWidth,
          width: sizing.width,
          align,
        };
      }),
    [displayColumns, definitionMap],
  );

  const reorderableColumnIds = useMemo(
    () => columnDescriptors.map((descriptor) => descriptor.id),
    [columnDescriptors],
  );

  const activeVisibleColumnIds = useMemo(
    () => visibleColumns.map((column) => column.id),
    [visibleColumns],
  );

  const tableMinWidth = useMemo(() => {
    const minWidth = computeMinWidth(displayColumns, definitionMap);
    return Math.max(minWidth + STICKY_COLUMN_BUFFER, 0);
  }, [displayColumns, definitionMap]);

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  useEffect(() => {
    if (!openActionId) {
      setIsSubmenuFlipped(false);
      return undefined;
    }

    const menuNode = actionRegistry.getMenu(openActionId);
    if (!menuNode) {
      setIsSubmenuFlipped(false);
      return undefined;
    }

    const update = () => {
      const rect = menuNode.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const shouldFlip = rect.left + rect.width + 220 > viewportWidth - 16;
      setIsSubmenuFlipped(shouldFlip);
    };

    update();
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
    };
  }, [openActionId, actionRegistry]);

  useEffect(() => () => {
    if (actionMenuCloseTimer.current) {
      clearTimeout(actionMenuCloseTimer.current);
    }
  }, []);

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
          // Ignore
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
      const order = reorderableColumnIds;
      const sourceIndex = order.indexOf(sourceId);
      const targetIndex = order.indexOf(columnId);
      if (sourceIndex === -1 || targetIndex === -1) {
        return;
      }
      const nextOrder = [...order];
      nextOrder.splice(sourceIndex, 1);
      nextOrder.splice(targetIndex, 0, sourceId);
      onColumnOrderChange?.(nextOrder);
    },
    [isColumnReorderMode, reorderableColumnIds, onColumnOrderChange],
  );

  const handleColumnDragEnd = useCallback(() => {
    dragSourceRef.current = null;
    setActiveDropTarget(null);
  }, []);

  const handleActionTriggerEnter = useCallback((transactionId) => {
    if (actionMenuCloseTimer.current) {
      clearTimeout(actionMenuCloseTimer.current);
      actionMenuCloseTimer.current = null;
    }
    setOpenActionId(transactionId);
  }, []);

  const handleActionTriggerLeave = useCallback(() => {
    if (actionMenuCloseTimer.current) {
      clearTimeout(actionMenuCloseTimer.current);
    }
    actionMenuCloseTimer.current = setTimeout(() => {
      setOpenActionId(null);
      setOpenActionSubmenu(null);
    }, 120);
  }, []);

  const handleActionFocus = useCallback((transactionId) => {
    setOpenActionId(transactionId);
  }, []);

  const handleActionBlur = useCallback((event) => {
    const nextFocus = event?.relatedTarget;
    if (nextFocus && event.currentTarget.contains(nextFocus)) {
      return;
    }
    actionMenuCloseTimer.current = setTimeout(() => {
      setOpenActionId(null);
      setOpenActionSubmenu(null);
    }, 120);
  }, []);

  const handleAction = useCallback(
    (payload) => () => {
      if (payload) {
        onOpenAdvanced?.(payload);
      }
      setOpenActionId(null);
      setOpenActionSubmenu(null);
    },
    [onOpenAdvanced],
  );

  const handleSubmenuEnter = useCallback((submenuId) => () => {
    setOpenActionSubmenu(submenuId);
  }, []);

  const paginationMode = usePaginationMode({
    scrollRef: internalScrollRef,
    tableRef,
    isEnabled: Boolean(pagination),
  });

  const shouldRenderPagination = pagination && paginationMode !== 'hidden';

  return (
    <section
      className={styles.tableCard}
      aria-label={tableTitle}
      style={{ '--transactions-font-scale': fontScale }}
    >
      {toolbarSlot}
      <div className={styles.tableShell}>
        <div
          ref={mergedScrollRef}
          className={styles.tableScroll}
          data-testid="transactions-table-container"
        >
          <table
            ref={tableRef}
            className={styles.table}
            style={{ '--table-min-width': `${tableMinWidth}px` }}
          >
            <TableBaseHeader
              columns={columnDescriptors}
              definitionMap={definitionMap}
              isColumnReorderMode={isColumnReorderMode}
              activeDropTarget={activeDropTarget}
              onColumnDragStart={handleColumnDragStart}
              onColumnDragEnter={handleColumnDragEnter}
              onColumnDragOver={handleColumnDragOver}
              onColumnDrop={handleColumnDrop}
              onColumnDragEnd={handleColumnDragEnd}
              allSelected={allSelected}
              isIndeterminate={isIndeterminate}
              onSelectAll={onSelectAll}
              headerCheckboxRef={headerCheckboxRef}
              onColumnVisibilityChange={onColumnVisibilityChange}
              visibleColumnIds={activeVisibleColumnIds}
              sortState={sortState}
              onSortChange={onSortChange}
              isFetching={isFetching}
              transactions={transactions}
            />
            <TableBaseBody
              transactions={transactions}
              columns={columnDescriptors}
              selectionSet={selectionSet}
              onSelectRow={onSelectRow}
              actionRegistry={actionRegistry}
              openActionId={openActionId}
              openActionSubmenu={openActionSubmenu}
              onActionTriggerEnter={handleActionTriggerEnter}
              onActionTriggerLeave={handleActionTriggerLeave}
              onActionFocus={handleActionFocus}
              onActionBlur={handleActionBlur}
              onAction={handleAction}
              onSubmenuEnter={handleSubmenuEnter}
              registerActionMenu={actionRegistry.registerMenu}
              isSubmenuFlipped={isSubmenuFlipped}
              hiddenColumnIds={hiddenColumnIds}
              isColumnReorderMode={isColumnReorderMode}
              isShowingSelectedOnly={isShowingSelectedOnly}
            />
            {shouldShowTotals ? (
              <tfoot>
                <tr className={styles.totalRow}>
                  <td
                    className={`${styles.bodyCell} ${styles.checkboxCell} ${styles.stickyLeft}`}
                    style={{
                      minWidth: `${CHECKBOX_COLUMN_WIDTH}px`,
                      width: `${CHECKBOX_COLUMN_WIDTH}px`,
                    }}
                  >
                    <div className={styles.checkboxCellInner}>
                      <span className={styles.totalLabel}>TOTAL</span>
                    </div>
                  </td>
                  {columnDescriptors.map((descriptor) => {
                    const { id, minWidth, width, align } = descriptor;
                    const value = totals[id];
                    const isHidden = hiddenColumnIds.has(id);
                    const cellClassName = [
                      styles.bodyCell,
                      styles.totalCell,
                      align === 'right'
                        ? styles.cellAlignRight
                        : align === 'center'
                        ? styles.cellAlignCenter
                        : '',
                      isHidden && isColumnReorderMode ? styles.bodyCellHidden : '',
                    ]
                      .filter(Boolean)
                      .join(' ');
                    return (
                      <td
                        key={`total-${id}`}
                        className={cellClassName}
                        style={{ minWidth: `${minWidth}px`, width: `${width}px` }}
                        aria-hidden={isHidden && isColumnReorderMode ? 'true' : undefined}
                      >
                        {value ? (
                          <span
                            className={
                              id === 'amount'
                                ? `${styles.totalValue} ${styles.totalAmount}`
                                : styles.totalValue
                            }
                          >
                            {value}
                          </span>
                        ) : null}
                      </td>
                    );
                  })}
                  <td
                    className={`${styles.bodyCell} ${styles.actionsCell}`}
                    style={{
                      minWidth: `${ACTIONS_COLUMN_WIDTH}px`,
                      width: `${ACTIONS_COLUMN_WIDTH}px`,
                    }}
                    aria-hidden="true"
                  />
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
        {isFetching ? (
          <div className={styles.loadingOverlay} role="status" aria-live="polite">
            <div className={styles.loadingSpinner} aria-hidden />
            <span className={styles.loadingLabel}>Refreshing data…</span>
          </div>
        ) : null}
        {shouldRenderPagination ? (
          <div
            className={`${styles.paginationBar} ${
              paginationMode === 'inline' ? styles.paginationInline : styles.paginationSticky
            }`}
          >
            {pagination.render({ selectedCount: selectionSet.size })}
          </div>
        ) : null}
      </div>
    </section>
  );
};

export const TableBase = forwardRef(TableBaseInner);
