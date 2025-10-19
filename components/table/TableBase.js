import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiArrowLeft, FiArrowRight, FiRefreshCw } from 'react-icons/fi';

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
const CUSTOMIZE_COLUMN_MIN_WIDTH = 160;

export function TableBase({
  transactions,
  selectedIds,
  onSelectRow,
  onSelectAll,
  selectionSummary = { count: 0, amount: 0, finalPrice: 0, totalBack: 0 },
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
  onColumnReset,
  onColumnReorderExit,
  fontScale = 1,
}) {
  const [openActionId, setOpenActionId] = useState(null);
  const [openActionSubmenu, setOpenActionSubmenu] = useState(null);
  const [isSubmenuFlipped, setIsSubmenuFlipped] = useState(false);
  const [activeDropTarget, setActiveDropTarget] = useState(null);
  const actionMenuCloseTimer = useRef(null);
  const headerCheckboxRef = useRef(null);
  const dragSourceRef = useRef(null);
  const columnSelectAllRef = useRef(null);

  const definitionMap = useDefinitionMap(columnDefinitions);
  const actionRegistry = useActionMenuRegistry();

  const selectionSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allSelected =
    transactions.length > 0 && transactions.every((txn) => selectionSet.has(txn.id));
  const isIndeterminate = selectionSet.size > 0 && !allSelected;
  const shouldShowTotals = selectionSet.size > 1;
  const totalSelectionCount = selectionSummary?.count ?? selectionSet.size;

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

  const totalLabelColumnId = useMemo(() => {
    if (!displayColumns || displayColumns.length === 0) {
      return null;
    }
    const shopColumn = displayColumns.find((column) => column.id === 'shop');
    if (shopColumn) {
      return shopColumn.id;
    }
    return displayColumns[0]?.id ?? null;
  }, [displayColumns]);

  const formattedTotals = useMemo(
    () => ({
      amount: formatAmountWithTrailing(selectionSummary?.amount ?? 0),
      totalBack: formatAmountWithTrailing(selectionSummary?.totalBack ?? 0),
      finalPrice: formatAmountWithTrailing(selectionSummary?.finalPrice ?? 0),
    }),
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

  const customizeGridTemplateColumns = useMemo(() => {
    if (!isColumnReorderMode) {
      return null;
    }
    const resolvedColumns = [
      CHECKBOX_COLUMN_WIDTH,
      ...displayColumns.map((column) => {
        const definition = definitionMap.get(column.id);
        const preferredWidth = Math.max(column.width ?? 0, definition?.minWidth ?? 0);
        return Math.max(preferredWidth, CUSTOMIZE_COLUMN_MIN_WIDTH);
      }),
      ACTIONS_COLUMN_WIDTH,
    ];
    return resolvedColumns.map((width) => `${width}px`).join(' ');
  }, [isColumnReorderMode, displayColumns, definitionMap]);

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

  const handleColumnNudge = useCallback(
    (columnId, direction) => {
      const order = [...visibleColumnIds];
      const index = order.indexOf(columnId);
      if (index === -1) {
        return;
      }
      const nextIndex =
        direction === 'left' ? Math.max(index - 1, 0) : Math.min(index + 1, order.length - 1);
      if (nextIndex === index) {
        return;
      }
      order.splice(index, 1);
      order.splice(nextIndex, 0, columnId);
      onColumnOrderChange?.(order);
    },
    [visibleColumnIds, onColumnOrderChange],
  );

  const visibleColumnCount = useMemo(
    () => allColumns.filter((column) => column.visible !== false).length,
    [allColumns],
  );

  const toggleableColumns = useMemo(
    () => allColumns.filter((column) => column.id !== 'notes'),
    [allColumns],
  );

  const toggleableVisibleCount = useMemo(
    () => toggleableColumns.filter((column) => column.visible !== false).length,
    [toggleableColumns],
  );

  const allToggleableCount = toggleableColumns.length;
  const allToggleableVisible =
    allToggleableCount > 0 && toggleableVisibleCount === allToggleableCount;
  const someToggleableVisible =
    toggleableVisibleCount > 0 && toggleableVisibleCount < allToggleableCount;

  useEffect(() => {
    if (columnSelectAllRef.current) {
      columnSelectAllRef.current.indeterminate =
        someToggleableVisible && !allToggleableVisible;
    }
  }, [someToggleableVisible, allToggleableVisible]);

  const handleToggleAllColumns = useCallback(
    (checked) => {
      toggleableColumns.forEach((column) => {
        const isVisible = column.visible !== false;
        if (checked !== isVisible) {
          onColumnVisibilityChange?.(column.id, checked);
        }
      });
    },
    [onColumnVisibilityChange, toggleableColumns],
  );

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
          <thead>
            <tr>
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
                    checked={allSelected}
                    onChange={(event) => onSelectAll?.(event.target.checked)}
                    data-testid="transaction-select-all"
                  />
                </div>
              </th>
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
              />
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
              <tr className={styles.customizeRow}>
                <th colSpan={displayColumns.length + 2} className={styles.customizeCell}>
                  <div className={styles.customizeControls}>
                    <div className={styles.customizeToolbarRow}>
                      <label className={styles.customizeSelectAll}>
                        <input
                          ref={columnSelectAllRef}
                          type="checkbox"
                          checked={allToggleableVisible}
                          onChange={(event) => handleToggleAllColumns(event.target.checked)}
                          aria-label="Select or deselect all columns except Notes"
                        />
                        <span>All columns (excl. Notes)</span>
                      </label>
                      <div className={styles.customizeToolbarActions}>
                        <button
                          type="button"
                          className={styles.secondaryButton}
                          onClick={() => onColumnReset?.()}
                          data-testid="transactions-columns-reset"
                        >
                          <FiRefreshCw aria-hidden />
                          Reset
                        </button>
                        <button
                          type="button"
                          className={styles.primaryButton}
                          onClick={() => onColumnReorderExit?.()}
                          data-testid="transactions-columns-done"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                    <div
                      className={styles.customizeToggleGrid}
                      role="group"
                      aria-label="Toggle column visibility"
                      style={
                        customizeGridTemplateColumns
                          ? { gridTemplateColumns: customizeGridTemplateColumns }
                          : undefined
                      }
                    >
                      <div className={styles.customizeToggleSpacer} aria-hidden="true" />
                      {displayColumns.map((column) => {
                        const definition = definitionMap.get(column.id);
                        const label = definition?.label ?? column.id;
                        const isVisible = column.visible !== false;
                        const visibleIndex = visibleColumnIds.indexOf(column.id);
                        const isToggleable = column.id !== 'notes';
                        const canToggle = isToggleable && !(isVisible && visibleColumnCount <= 1);
                        const canMoveLeft = isVisible && visibleIndex > 0;
                        const canMoveRight =
                          isVisible && visibleIndex > -1 && visibleIndex < visibleColumnIds.length - 1;

                        const handleVisibilityChange = (event) => {
                          if (!isToggleable) {
                            return;
                          }
                          onColumnVisibilityChange?.(column.id, event.target.checked);
                        };

                        return (
                          <div
                            key={`customize-${column.id}`}
                            className={`${styles.customizeToggle} ${
                              isVisible ? styles.customizeToggleVisible : styles.customizeToggleHidden
                            }`}
                          >
                            <label className={styles.customizeToggleLabel}>
                              <input
                                type="checkbox"
                                checked={isVisible}
                                onChange={handleVisibilityChange}
                                disabled={!canToggle}
                                data-testid={`transactions-columns-toggle-${column.id}`}
                              />
                              <span>{label}</span>
                            </label>
                            <div className={styles.customizeToggleActions}>
                              <button
                                type="button"
                                className={styles.customizeNudgeButton}
                                onClick={() => handleColumnNudge(column.id, 'left')}
                                disabled={!canMoveLeft}
                                aria-label={`Move ${label} column left`}
                                title={canMoveLeft ? 'Move left' : undefined}
                              >
                                <FiArrowLeft aria-hidden />
                              </button>
                              <button
                                type="button"
                                className={styles.customizeNudgeButton}
                                onClick={() => handleColumnNudge(column.id, 'right')}
                                disabled={!canMoveRight}
                                aria-label={`Move ${label} column right`}
                                title={canMoveRight ? 'Move right' : undefined}
                              >
                                <FiArrowRight aria-hidden />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      <div className={styles.customizeToggleSpacer} aria-hidden="true" />
                    </div>
                  </div>
                </th>
              </tr>
            ) : null}
          </thead>
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
          {shouldShowTotals ? (
            <tfoot>
              <tr className={styles.totalRow}>
                <td
                  className={`${styles.bodyCell} ${styles.totalRowCell} ${styles.stickyLeft} ${styles.checkboxCell}`}
                  style={{
                    minWidth: `${CHECKBOX_COLUMN_WIDTH}px`,
                    width: `${CHECKBOX_COLUMN_WIDTH}px`,
                  }}
                >
                  <span className={styles.totalRowSelection}>{totalSelectionCount} selected</span>
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
                  const value = formattedTotals[column.id];
                  const isLabelCell = column.id === totalLabelColumnId;
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
                      {isLabelCell ? (
                        <span className={styles.totalRowLabel}>Total</span>
                      ) : value !== undefined ? (
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
