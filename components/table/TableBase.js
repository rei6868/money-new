import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiCreditCard, FiFilter, FiTag, FiUser } from 'react-icons/fi';

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

function InlineSelectionSummary({
  selectedCount,
  selectionSummary,
  onDeselectAll,
  onToggleShowSelected,
  isShowingSelectedOnly,
}) {
  if (selectedCount <= 0) {
    return null;
  }
  return (
    <div className={styles.selectionQuickActions} data-testid="transactions-selection-inline">
      <span className={styles.selectionQuickSummary}>
        {selectedCount} selected · Amount {formatAmountWithTrailing(selectionSummary.amount)}
      </span>
      <button
        type="button"
        className={styles.secondaryButton}
        onClick={onDeselectAll}
        data-testid="transactions-quick-deselect"
      >
        De-select
      </button>
      <button
        type="button"
        className={styles.secondaryButton}
        onClick={onToggleShowSelected}
        data-testid="transactions-quick-toggle"
      >
        {isShowingSelectedOnly ? 'Show all rows' : 'Show selected rows'}
      </button>
    </div>
  );
}

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
  isShowingSelectedOnly = false,
}) {
  const [openQuickFilter, setOpenQuickFilter] = useState(null);
  const [quickFilterSearch, setQuickFilterSearch] = useState({});
  const [openActionId, setOpenActionId] = useState(null);
  const [openActionSubmenu, setOpenActionSubmenu] = useState(null);
  const previousQuickFilterRef = useRef(null);
  const actionMenuCloseTimer = useRef(null);
  const headerCheckboxRef = useRef(null);

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

  const isTotalRowVisible = selectionSet.size > 0;
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
                <input
                  ref={headerCheckboxRef}
                  type="checkbox"
                  aria-label="Select all rows"
                  checked={allSelected}
                  onChange={(event) => onSelectAll?.(event.target.checked)}
                  data-testid="transaction-select-all"
                />
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
            totals={selectionSummary}
            isTotalsVisible={isTotalRowVisible}
          />
        </table>
      </div>
      {pagination ? <div className={styles.paginationBar}>{pagination.render()}</div> : null}
      <InlineSelectionSummary
        selectedCount={selectionSet.size}
        selectionSummary={selectionSummary}
        onDeselectAll={() => onSelectAll?.(false)}
        onToggleShowSelected={() => onOpenAdvanced?.({ mode: 'toggle-selected' })}
        isShowingSelectedOnly={isShowingSelectedOnly}
      />
    </section>
  );
}
