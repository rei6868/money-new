import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import styles from '../../styles/TransactionsHistory.module.css';
import { formatAmountWithTrailing } from '../../lib/numberFormat';
import {
  ACTIONS_COLUMN_WIDTH,
  CHECKBOX_COLUMN_WIDTH,
  STICKY_COLUMN_BUFFER,
  computeMinWidth,
  useDefinitionMap,
} from './tableUtils';
import { useActionMenuRegistry } from './TableActions';
import { TableBaseHeader } from './TableBaseHeader';
import { TableBaseBody } from './TableBaseBody';

const ACTION_SUBMENU_WIDTH = 220;

export function TableBase({
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
}) {
  const [openActionId, setOpenActionId] = useState(null);
  const [openActionSubmenu, setOpenActionSubmenu] = useState(null);
  const [isSubmenuFlipped, setIsSubmenuFlipped] = useState(false);
  const [activeDropTarget, setActiveDropTarget] = useState(null);
  const actionMenuCloseTimer = useRef(null);
  const headerCheckboxRef = useRef(null);
  const dragSourceRef = useRef(null);

  const definitionMap = useDefinitionMap(columnDefinitions);
  const actionRegistry = useActionMenuRegistry();

  const selectionSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allSelected =
    transactions.length > 0 && transactions.every((txn) => selectionSet.has(txn.id));
  const isIndeterminate = selectionSet.size > 0 && !allSelected;
  const totalSelectionCount = selectionSummary?.count ?? selectionSet.size;
  const shouldShowTotals = selectedIds.length > 0;

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

  const formattedTotals = useMemo(
    () => {
      if (!selectionSummary) {
        return {};
      }

      const normalizeValue = (value) => {
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
        amount: normalizeValue(selectionSummary.amount),
        totalBack: normalizeValue(selectionSummary.totalBack),
        finalPrice: normalizeValue(selectionSummary.finalPrice),
      };
    },
    [selectionSummary],
  );

  const minTableWidth = useMemo(
    () => computeMinWidth(displayColumns, definitionMap),
    [displayColumns, definitionMap],
  );

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
      const shouldFlip = rect.left + rect.width + ACTION_SUBMENU_WIDTH > viewportWidth - 16;
      setIsSubmenuFlipped(shouldFlip);
    };

    update();
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
    };
  }, [openActionId, actionRegistry]);

  useEffect(() => {
    if (!isColumnReorderMode) {
      dragSourceRef.current = null;
      setActiveDropTarget(null);
    }
  }, [isColumnReorderMode]);

  useEffect(() => {
    return () => {
      if (actionMenuCloseTimer.current) {
        clearTimeout(actionMenuCloseTimer.current);
      }
    };
  }, []);

  const visibleColumnIds = useMemo(
    () => visibleColumns.map((column) => column.id),
    [visibleColumns],
  );

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
          // Ignore failures in older browsers that disallow setData on plain text.
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
      const order = visibleColumnIds;
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
    [isColumnReorderMode, visibleColumnIds, onColumnOrderChange],
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
    }, 100);
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
    }, 100);
  }, []);

  const handleAction = useCallback(
    (payload) => () => {
      if (!payload) {
        setOpenActionId(null);
        setOpenActionSubmenu(null);
        return;
      }
      onOpenAdvanced?.(payload);
      setOpenActionId(null);
      setOpenActionSubmenu(null);
    },
    [onOpenAdvanced],
  );

  const handleSubmenuEnter = useCallback((submenuId) => () => {
    setOpenActionSubmenu(submenuId);
  }, []);

  return (
    <section
      className={styles.tableCard}
      aria-label={tableTitle}
      style={{ '--transactions-font-scale': fontScale }}
    >
      {toolbarSlot}
      <div className={styles.tableScroll} data-testid="transactions-table-container">
        <table className={styles.table} style={{ minWidth: `${minTableWidth + STICKY_COLUMN_BUFFER}px` }}>
          <TableBaseHeader
            columns={displayColumns}
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
            visibleColumnIds={visibleColumnIds}
            onColumnVisibilityChange={onColumnVisibilityChange}
            sortState={sortState}
            onSortChange={onSortChange}
          />
          <TableBaseBody
            transactions={transactions}
            columns={displayColumns}
            definitionMap={definitionMap}
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
          />
          {shouldShowTotals && console.log('Selection Summary in TableBase:', selectionSummary)}
          {shouldShowTotals ? (
            <tfoot>
              <tr className={styles.totalRow}>
                <td
                  className={`${styles.bodyCell} ${styles.totalRowCell} ${styles.stickyLeft} ${styles.checkboxCell}`}
                  style={{
                    minWidth: `${CHECKBOX_COLUMN_WIDTH}px`,
                    width: `${CHECKBOX_COLUMN_WIDTH}px`,
                  }}
                  title={
                    totalSelectionCount > 0
                      ? `${totalSelectionCount} selected`
                      : undefined
                  }
                >
                  <span className={styles.totalRowLeadLabel}>TOTAL</span>
                </td>
                {displayColumns.map((column) => {
                  const definition = definitionMap.get(column.id);
                  const alignClass =
                    definition?.align === 'right'
                      ? styles.cellAlignRight
                      : definition?.align === 'center'
                      ? styles.cellAlignCenter
                      : '';
                  const minWidth = Math.max(definition?.minWidth ?? 120, column.width);
                  const isHidden = hiddenColumnIds.has(column.id);
                  let value = null;
                  if (column.id === 'amount') {
                    value = formattedTotals.amount ?? null;
                  } else if (column.id === 'totalBack') {
                    value = formattedTotals.totalBack ?? null;
                  } else if (column.id === 'finalPrice') {
                    value = formattedTotals.finalPrice ?? null;
                  } else if (formattedTotals[column.id]) {
                    value = formattedTotals[column.id];
                  }
                  const cellClassName = `${styles.bodyCell} ${styles.totalRowCell} ${alignClass} ${
                    isHidden && isColumnReorderMode ? styles.bodyCellHidden : ''
                  }`.trim();

                  return (
                    <td
                      key={`total-${column.id}`}
                      className={cellClassName}
                      style={{
                        minWidth: `${minWidth}px`,
                        width: `${column.width}px`,
                      }}
                      aria-hidden={isHidden && isColumnReorderMode ? 'true' : undefined}
                    >
                      {value ? (
                        <span
                          className={
                            column.id === 'amount'
                              ? `${styles.totalRowValue} ${styles.totalRowAmount}`
                              : styles.totalRowValue
                          }
                        >
                          {value}
                        </span>
                      ) : null}
                    </td>
                  );
                })}
                <td
                  className={`${styles.bodyCell} ${styles.totalRowCell} ${styles.stickyRight}`}
                  style={{
                    left: `${CHECKBOX_COLUMN_WIDTH}px`,
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
      {pagination ? <div className={styles.paginationBar}>{pagination.render()}</div> : null}
    </section>
  );
}
