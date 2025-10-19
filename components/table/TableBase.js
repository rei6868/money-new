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
  sortState = [],
  onSortChange,
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
  const [pendingColumnVisibility, setPendingColumnVisibility] = useState(new Map());
  const previousReorderModeRef = useRef(isColumnReorderMode);

  const definitionMap = useDefinitionMap(columnDefinitions);
  const actionRegistry = useActionMenuRegistry();

  const selectionSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allSelected =
    transactions.length > 0 && transactions.every((txn) => selectionSet.has(txn.id));
  const isIndeterminate = selectionSet.size > 0 && !allSelected;

  const sortLookup = useMemo(() => {
    const lookup = new Map();
    sortState?.forEach((item, index) => {
      lookup.set(item.id, { ...item, index });
    });
    return lookup;
  }, [sortState]);

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

  const minTableWidth = useMemo(
    () => computeMinWidth(displayColumns, definitionMap),
    [displayColumns, definitionMap],
  );

  const baseVisibility = useMemo(() => {
    const map = new Map();
    allColumns.forEach((column) => {
      map.set(column.id, column.visible !== false);
    });
    return map;
  }, [allColumns]);

  useEffect(() => {
    if (!isColumnReorderMode) {
      setPendingColumnVisibility((current) => (current.size > 0 ? new Map() : current));
      return;
    }

    setPendingColumnVisibility((current) => {
      if (current.size === 0) {
        return new Map(baseVisibility);
      }

      let changed = false;
      const next = new Map(current);
      baseVisibility.forEach((value, key) => {
        if (!next.has(key)) {
          next.set(key, value);
          changed = true;
        }
      });
      next.forEach((_, key) => {
        if (!baseVisibility.has(key)) {
          next.delete(key);
          changed = true;
        }
      });

      return changed ? next : current;
    });
  }, [isColumnReorderMode, baseVisibility]);

  const effectiveVisibility = useMemo(() => {
    if (isColumnReorderMode && pendingColumnVisibility.size > 0) {
      return pendingColumnVisibility;
    }
    return baseVisibility;
  }, [isColumnReorderMode, pendingColumnVisibility, baseVisibility]);

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  useEffect(() => {
    return () => {
      if (actionMenuCloseTimer.current) {
        clearTimeout(actionMenuCloseTimer.current);
      }
    };
  }, []);

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

  const visibleColumnIds = useMemo(
    () => visibleColumns.map((column) => column.id),
    [visibleColumns],
  );

  const applyPendingVisibility = useCallback(() => {
    if (pendingColumnVisibility.size === 0) {
      return;
    }
    pendingColumnVisibility.forEach((nextVisible, columnId) => {
      const currentVisible = baseVisibility.get(columnId);
      if (currentVisible !== nextVisible) {
        onColumnVisibilityChange?.(columnId, nextVisible);
      }
    });
  }, [pendingColumnVisibility, baseVisibility, onColumnVisibilityChange]);

  useEffect(() => {
    if (previousReorderModeRef.current && !isColumnReorderMode) {
      if (pendingColumnVisibility.size > 0) {
        applyPendingVisibility();
        setPendingColumnVisibility(new Map());
      }
    }
    previousReorderModeRef.current = isColumnReorderMode;
  }, [isColumnReorderMode, applyPendingVisibility, pendingColumnVisibility]);

  useEffect(() => {
    if (isColumnReorderMode) {
      setOpenActionId(null);
      setOpenActionSubmenu(null);
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
    () =>
      allColumns.reduce(
        (count, column) => (effectiveVisibility.get(column.id) !== false ? count + 1 : count),
        0,
      ),
    [allColumns, effectiveVisibility],
  );

  const toggleableColumns = useMemo(
    () => allColumns.filter((column) => column.id !== 'notes'),
    [allColumns],
  );

  const toggleableVisibleCount = useMemo(
    () =>
      toggleableColumns.reduce(
        (count, column) => (effectiveVisibility.get(column.id) !== false ? count + 1 : count),
        0,
      ),
    [toggleableColumns, effectiveVisibility],
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
      if (isColumnReorderMode) {
        setPendingColumnVisibility((current) => {
          const next = current.size > 0 ? new Map(current) : new Map(baseVisibility);
          toggleableColumns.forEach((column) => {
            next.set(column.id, checked);
          });
          return next;
        });
        return;
      }

      toggleableColumns.forEach((column) => {
        const isVisible = baseVisibility.get(column.id);
        if (isVisible !== checked) {
          onColumnVisibilityChange?.(column.id, checked);
        }
      });
    },
    [isColumnReorderMode, toggleableColumns, onColumnVisibilityChange, baseVisibility],
  );

  const handleResetColumnsClick = useCallback(() => {
    if (!onColumnReset) {
      return;
    }
    onColumnReset();
    setPendingColumnVisibility(new Map());
  }, [onColumnReset]);

  const handleCustomizeDone = useCallback(() => {
    applyPendingVisibility();
    setPendingColumnVisibility(new Map());
    onColumnReorderExit?.();
  }, [applyPendingVisibility, onColumnReorderExit]);

  const selectedCount = selectionSet.size;
  const selectionLabel = selectedCount
    ? `${selectedCount} selected · Amount ${formatAmountWithTrailing(selectionSummary.amount)}`
    : null;

  const handleActionTriggerEnter = useCallback((transactionId) => {
    if (isColumnReorderMode) {
      return;
    }
    if (actionMenuCloseTimer.current) {
      clearTimeout(actionMenuCloseTimer.current);
      actionMenuCloseTimer.current = null;
    }
    setOpenActionId(transactionId);
  }, [isColumnReorderMode]);

  const handleActionTriggerLeave = useCallback(() => {
    if (isColumnReorderMode) {
      return;
    }
    if (actionMenuCloseTimer.current) {
      clearTimeout(actionMenuCloseTimer.current);
    }
    actionMenuCloseTimer.current = setTimeout(() => {
      setOpenActionId(null);
      setOpenActionSubmenu(null);
    }, 100);
  }, [isColumnReorderMode]);

  const handleActionFocus = useCallback((transactionId) => {
    if (isColumnReorderMode) {
      return;
    }
    setOpenActionId(transactionId);
  }, [isColumnReorderMode]);

  const handleActionBlur = useCallback((event) => {
    if (isColumnReorderMode) {
      return;
    }
    const nextFocus = event?.relatedTarget;
    if (nextFocus && event.currentTarget.contains(nextFocus)) {
      return;
    }
    actionMenuCloseTimer.current = setTimeout(() => {
      setOpenActionId(null);
      setOpenActionSubmenu(null);
    }, 100);
  }, [isColumnReorderMode]);

  const handleAction = useCallback(
    (payload) => () => {
      if (isColumnReorderMode) {
        return;
      }
      if (!payload) {
        setOpenActionId(null);
        setOpenActionSubmenu(null);
        return;
      }
      onOpenAdvanced?.(payload);
      setOpenActionId(null);
      setOpenActionSubmenu(null);
    },
    [onOpenAdvanced, isColumnReorderMode],
  );

  const handleSubmenuEnter = useCallback((submenuId) => () => {
    if (isColumnReorderMode) {
      return;
    }
    setOpenActionSubmenu(submenuId);
  }, [isColumnReorderMode]);
  return (
    <section
      className={styles.tableCard}
      aria-label={tableTitle}
      style={{ '--transactions-font-scale': fontScale }}
    >
      {toolbarSlot}
      {isColumnReorderMode ? (
        <div className={styles.customizeToolbar}>
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
              onClick={handleResetColumnsClick}
              data-testid="transactions-columns-reset"
            >
              <FiRefreshCw aria-hidden />
              Reset
            </button>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleCustomizeDone}
              data-testid="transactions-columns-done"
            >
              Done
            </button>
          </div>
        </div>
      ) : null}
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
                  {selectionLabel ? (
                    <div
                      className={styles.selectionSummaryInline}
                      data-testid="transactions-selection-summary"
                    >
                      {selectionLabel}
                    </div>
                  ) : null}
                </div>
              </th>
              <TableBaseHeader
                columns={displayColumns}
                definitionMap={definitionMap}
                sortLookup={sortLookup}
                sortState={sortState}
                onSortToggle={(columnId, event) => {
                  if (!onSortChange) {
                    return;
                  }
                  const isMulti = event.shiftKey || event.metaKey || event.ctrlKey;
                  onSortChange(columnId, { multi: isMulti });
                }}
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
                <span className={styles.actionsHeaderLabel}>
                  Actions
                </span>
              </th>
            </tr>
          {isColumnReorderMode ? (
            <tr className={styles.customizeRow}>
              <th
                className={`${styles.customizeCell} ${styles.stickyLeft} ${styles.checkboxCell} ${styles.stickyLeftNoShadow}`}
                style={{
                  minWidth: `${CHECKBOX_COLUMN_WIDTH}px`,
                  width: `${CHECKBOX_COLUMN_WIDTH}px`,
                }}
                aria-hidden="true"
              >
                <div className={styles.customizePlaceholder} aria-hidden="true" />
              </th>
              {displayColumns.map((column) => {
                const definition = definitionMap.get(column.id);
                const label = definition?.label ?? column.id;
                const minWidth = Math.max(definition?.minWidth ?? 120, column.width);
                const isVisible = effectiveVisibility.get(column.id) !== false;
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
                  const nextVisible = event.target.checked;
                  if (isColumnReorderMode) {
                    setPendingColumnVisibility((current) => {
                      const next = current.size > 0 ? new Map(current) : new Map(baseVisibility);
                      next.set(column.id, nextVisible);
                      return next;
                    });
                    return;
                  }
                  onColumnVisibilityChange?.(column.id, nextVisible);
                };

                return (
                  <th
                    key={`customize-${column.id}`}
                    className={`${styles.customizeCell} ${
                      isVisible ? styles.customizeCellVisible : styles.customizeCellDimmed
                    }`.trim()}
                    style={{
                      minWidth: `${minWidth}px`,
                      width: `${column.width}px`,
                    }}
                    scope="col"
                  >
                    <div className={styles.customizeColumnContent}>
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
                  </th>
                );
              })}
              <th
                className={`${styles.customizeCell} ${styles.stickyRight} ${styles.actionsHeader}`}
                style={{
                  minWidth: `${ACTIONS_COLUMN_WIDTH}px`,
                  width: `${ACTIONS_COLUMN_WIDTH}px`,
                }}
                aria-hidden="true"
              >
                <div className={styles.customizePlaceholder} aria-hidden="true" />
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
        </table>
      </div>
      {pagination ? <div className={styles.paginationBar}>{pagination.render()}</div> : null}
    </section>
  );
}
