import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FiArrowLeft,
  FiArrowRight,
  FiCreditCard,
  FiFilter,
  FiRefreshCw,
  FiTag,
  FiUser,
  FiX,
} from 'react-icons/fi';

import styles from '../../styles/TransactionsHistory.module.css';
import { formatAmountWithTrailing } from '../../lib/numberFormat';
import {
  CHECKBOX_COLUMN_WIDTH,
  STICKY_COLUMN_BUFFER,
  computeMinWidth,
  useDefinitionMap,
} from './tableUtils';
import { useQuickFilterRegistry } from './TableQuickFilter';
import { useActionMenuRegistry } from './TableActions';
import { TableBaseHeader } from './TableBaseHeader';
import { TableBaseBody } from './TableBaseBody';

const QUICK_FILTER_META = {
  type: {
    field: 'types',
    label: 'Type',
    multi: true,
    optionsKey: 'types',
    icon: <FiFilter aria-hidden />,
  },
  account: {
    field: 'accounts',
    label: 'Account',
    multi: true,
    optionsKey: 'accounts',
    icon: <FiCreditCard aria-hidden />,
  },
  owner: {
    field: 'person',
    label: 'People',
    multi: false,
    optionsKey: 'people',
    icon: <FiUser aria-hidden />,
  },
  category: {
    field: 'category',
    label: 'Category',
    multi: false,
    optionsKey: 'categories',
    icon: <FiFilter aria-hidden />,
  },
  debtTag: {
    field: 'debtTags',
    label: 'Debt Tag',
    multi: true,
    optionsKey: 'debtTags',
    icon: <FiTag aria-hidden />,
  },
};

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
  quickFilters = {},
  quickFilterOptions = {},
  onQuickFilterChange,
  onQuickFilterToggle,
  onQuickFilterSearch,
  toolbarSlot,
  tableTitle = 'Transactions history table',
  allColumns = [],
  isColumnReorderMode = false,
  onColumnVisibilityChange,
  onColumnOrderChange,
  onColumnReset,
  onColumnReorderExit,
}) {
  const [openQuickFilter, setOpenQuickFilter] = useState(null);
  const [quickFilterSearch, setQuickFilterSearch] = useState({});
  const [openActionId, setOpenActionId] = useState(null);
  const [openActionSubmenu, setOpenActionSubmenu] = useState(null);
  const [isSubmenuFlipped, setIsSubmenuFlipped] = useState(false);
  const [activeDropTarget, setActiveDropTarget] = useState(null);
  const previousQuickFilterRef = useRef(null);
  const actionMenuCloseTimer = useRef(null);
  const headerCheckboxRef = useRef(null);
  const dragSourceRef = useRef(null);

  const definitionMap = useDefinitionMap(columnDefinitions);
  const quickFilterRegistry = useQuickFilterRegistry();
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

  const minTableWidth = useMemo(
    () => computeMinWidth(visibleColumns, definitionMap),
    [visibleColumns, definitionMap],
  );

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  useEffect(() => {
    if (!openQuickFilter) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      const anchorNode = quickFilterRegistry.getAnchor(openQuickFilter);
      const contentNode = quickFilterRegistry.getContent(openQuickFilter);
      if (anchorNode?.contains(event.target) || contentNode?.contains(event.target)) {
        return;
      }
      setOpenQuickFilter(null);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [openQuickFilter, quickFilterRegistry]);

  useEffect(() => {
    const previous = previousQuickFilterRef.current;
    if (previous && previous !== openQuickFilter) {
      setQuickFilterSearch((searchState) => {
        if (!searchState[previous]) {
          return searchState;
        }
        const nextState = { ...searchState };
        delete nextState[previous];
        return nextState;
      });
    }
    previousQuickFilterRef.current = openQuickFilter;
  }, [openQuickFilter]);

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

  const handleQuickFilterToggle = useCallback(
    (columnId) => {
      setOpenQuickFilter((current) => {
        const next = current === columnId ? null : columnId;
        onQuickFilterToggle?.(columnId, next !== null);
        return next;
      });
    },
    [onQuickFilterToggle],
  );

  const handleQuickFilterClear = useCallback(
    (columnId) => {
      const meta = QUICK_FILTER_META[columnId];
      if (!meta) {
        return;
      }
      if (meta.multi) {
        onQuickFilterChange?.(meta.field, []);
      } else {
        onQuickFilterChange?.(meta.field, 'all');
      }
      setOpenQuickFilter(null);
    },
    [onQuickFilterChange],
  );

  const handleQuickFilterSelect = useCallback(
    (columnId, option) => {
      const meta = QUICK_FILTER_META[columnId];
      if (!meta) {
        return;
      }
      if (meta.multi) {
        const currentValues = new Set(Array.isArray(quickFilters[meta.field]) ? quickFilters[meta.field] : []);
        if (currentValues.has(option)) {
          currentValues.delete(option);
        } else {
          currentValues.add(option);
        }
        onQuickFilterChange?.(meta.field, Array.from(currentValues));
      } else {
        onQuickFilterChange?.(meta.field, option);
        setOpenQuickFilter(null);
      }
    },
    [quickFilters, onQuickFilterChange],
  );

  const handleQuickFilterSearch = useCallback(
    (columnId, value) => {
      setQuickFilterSearch((state) => ({ ...state, [columnId]: value }));
      onQuickFilterSearch?.(columnId, value);
    },
    [onQuickFilterSearch],
  );

  const quickFilterMeta = useMemo(() => {
    const map = {};
    Object.entries(QUICK_FILTER_META).forEach(([columnId, meta]) => {
      map[columnId] = {
        ...meta,
        getValue: () => quickFilters[meta.field],
        getAnchor: () => quickFilterRegistry.getAnchor(columnId),
      };
    });
    return map;
  }, [quickFilters, quickFilterRegistry]);

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
    () => allColumns.filter((column) => column.visible).length,
    [allColumns],
  );

  const selectedCount = selectionSet.size;
  const selectionLabel = selectedCount
    ? `${selectedCount} selected · Amount ${formatAmountWithTrailing(selectionSummary.amount)}`
    : null;

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
    <section className={styles.tableCard} aria-label={tableTitle}>
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
                columns={visibleColumns}
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
                onQuickFilterClear={handleQuickFilterClear}
                onQuickFilterToggle={handleQuickFilterToggle}
                onQuickFilterSelect={handleQuickFilterSelect}
                quickFilterOptions={quickFilterOptions}
                quickFilterMeta={quickFilterMeta}
                openQuickFilter={openQuickFilter}
                quickFilterSearch={quickFilterSearch}
                onQuickFilterSearch={handleQuickFilterSearch}
                registerQuickFilterAnchor={quickFilterRegistry.registerAnchor}
                registerQuickFilterContent={quickFilterRegistry.registerContent}
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
                <span className={styles.actionsHeaderLabel} title="Actions">
                  Actions
                </span>
              </th>
            </tr>
          {isColumnReorderMode ? (
            <tr className={styles.customizeRow}>
              <th colSpan={visibleColumns.length + 2} className={styles.customizeCell}>
                <div className={styles.customizeControls}>
                  <div className={styles.customizeActions}>
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
                  <div
                    className={styles.customizeToggleGrid}
                    role="group"
                    aria-label="Toggle column visibility"
                  >
                    {allColumns.map((column) => {
                      const definition = definitionMap.get(column.id);
                      const label = definition?.label ?? column.id;
                      const isVisible = column.visible !== false;
                      const visibleIndex = visibleColumnIds.indexOf(column.id);
                      const canToggle = !(isVisible && visibleColumnCount <= 1);
                      const canMoveLeft = isVisible && visibleIndex > 0;
                      const canMoveRight =
                        isVisible && visibleIndex > -1 && visibleIndex < visibleColumnIds.length - 1;

                      const handleVisibilityChange = (event) => {
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
                  </div>
                </div>
              </th>
            </tr>
          ) : null}
          </thead>
          <TableBaseBody
            transactions={transactions}
            visibleColumns={visibleColumns}
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
          />
        </table>
      </div>
      {pagination ? <div className={styles.paginationBar}>{pagination.render()}</div> : null}
    </section>
  );
}
