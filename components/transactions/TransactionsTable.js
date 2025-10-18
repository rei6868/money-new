import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FiChevronDown,
  FiEdit2,
  FiFilter,
  FiMoreHorizontal,
  FiTrash2,
  FiUser,
  FiTag,
  FiXCircle,
  FiRefreshCw,
} from 'react-icons/fi';

import styles from '../../styles/TransactionsHistory.module.css';
import { formatAmount, formatPercent } from '../../lib/numberFormat';
import { TRANSACTION_COLUMN_DEFINITIONS } from './transactionColumns';

const definitionMap = new Map(
  TRANSACTION_COLUMN_DEFINITIONS.map((definition) => [definition.id, definition]),
);

const STICKY_COLUMN_BUFFER = 252; // checkbox (72px) + actions column (180px) baseline

function getColumnDefinition(columnId) {
  return definitionMap.get(columnId);
}

function TotalBackCell({ transaction }) {
  const totalBack = formatAmount(transaction.totalBack);
  const percentBack = Number(transaction.percentBack ?? 0);
  const fixedBack = Number(transaction.fixedBack ?? 0);
  const amount = Number(transaction.amount ?? 0);
  const hasPercent = percentBack > 0;
  const hasFixed = fixedBack > 0;
  const canShowFormula =
    Number(transaction.totalBack ?? 0) > 0 && hasPercent && hasFixed && amount > 0;
  const formulaText = `${formatAmount(amount)}×${formatPercent(percentBack)} + ${formatAmount(
    fixedBack,
  )}`;

  return (
    <div className={styles.totalBackCell} title={canShowFormula ? formulaText : undefined}>
      <span className={styles.totalBackValue}>{totalBack}</span>
      {canShowFormula ? <span className={styles.totalBackFormula}>{formulaText}</span> : null}
    </div>
  );
}

const columnRenderers = {
  date: (txn) => txn.date ?? '—',
  type: (txn, stylesRef) => (
    <span
      className={
        txn.type === 'Income'
          ? `${stylesRef.pill} ${stylesRef.pillIncome}`
          : `${stylesRef.pill} ${stylesRef.pillExpense}`
      }
    >
      {txn.type}
    </span>
  ),
  account: (txn) => txn.account ?? '—',
  shop: (txn) => txn.shop ?? '—',
  notes: (txn) => txn.notes ?? '—',
  amount: (txn) => formatAmount(txn.amount),
  percentBack: (txn) => formatPercent(txn.percentBack),
  fixedBack: (txn) => formatAmount(txn.fixedBack),
  totalBack: (txn) => <TotalBackCell transaction={txn} />,
  finalPrice: (txn) => formatAmount(txn.finalPrice),
  debtTag: (txn) => txn.debtTag ?? '—',
  cycleTag: (txn) => txn.cycleTag ?? '—',
  category: (txn) => txn.category ?? '—',
  linkedTxn: (txn) => txn.linkedTxn ?? '—',
  owner: (txn) => txn.owner ?? '—',
  id: (txn) => txn.id ?? '—',
};

function renderCellContent(columnId, transaction) {
  const renderer = columnRenderers[columnId];
  if (!renderer) {
    return transaction[columnId] ?? '—';
  }
  return renderer(transaction, styles);
}

function computeMinWidth(columns) {
  return columns.reduce((total, column) => {
    const definition = getColumnDefinition(column.id);
    const minWidth = column.width || definition?.minWidth || 120;
    return total + minWidth;
  }, 0);
}

const QUICK_FILTER_CONFIG = {
  category: { type: 'single', icon: FiTag, label: 'Category' },
  owner: { type: 'single', icon: FiUser, label: 'People' },
  type: { type: 'multi', icon: FiFilter, label: 'Type' },
  debtTag: { type: 'multi', icon: FiTag, label: 'Debt Tag' },
};

const TOTAL_FIELDS = new Map([
  ['amount', (summary) => formatAmount(summary.amount)],
  ['finalPrice', (summary) => formatAmount(summary.finalPrice)],
  ['totalBack', (summary) => formatAmount(summary.totalBack)],
]);

export function TransactionsTable({
  transactions,
  selectedIds,
  onSelectRow,
  onSelectAll,
  selectionSummary,
  onOpenAdvanced,
  visibleColumns,
  pagination,
  sortState,
  onSort,
  quickFilters,
  quickFilterOptions,
  onQuickFilterChange,
}) {
  const selectionSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allSelected = transactions.length > 0 && transactions.every((txn) => selectionSet.has(txn.id));
  const isIndeterminate = selectionSet.size > 0 && !allSelected;
  const headerCheckboxRef = useRef(null);
  const [activeActionId, setActiveActionId] = useState(null);
  const closeActionTimer = useRef(null);
  const [openFilterId, setOpenFilterId] = useState(null);
  const [filterSearch, setFilterSearch] = useState('');
  const filterPopoverRef = useRef(null);

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  useEffect(() => () => {
    if (closeActionTimer.current) {
      clearTimeout(closeActionTimer.current);
    }
  }, []);

  useEffect(() => {
    if (!openFilterId) {
      return undefined;
    }

    const handleOutsideClick = (event) => {
      if (filterPopoverRef.current && !filterPopoverRef.current.contains(event.target)) {
        setOpenFilterId(null);
        setFilterSearch('');
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [openFilterId]);

  const minTableWidth = useMemo(() => computeMinWidth(visibleColumns), [visibleColumns]);

  const handleActionAreaEnter = (id) => {
    if (closeActionTimer.current) {
      clearTimeout(closeActionTimer.current);
      closeActionTimer.current = null;
    }
    setActiveActionId(id);
  };

  const handleActionAreaLeave = () => {
    if (closeActionTimer.current) {
      clearTimeout(closeActionTimer.current);
    }
    closeActionTimer.current = setTimeout(() => {
      setActiveActionId(null);
    }, 80);
  };

  const handleFilterToggle = (columnId) => {
    setOpenFilterId((prev) => {
      if (prev === columnId) {
        setFilterSearch('');
        return null;
      }
      setFilterSearch('');
      return columnId;
    });
  };

  const handleFilterSearchChange = (event) => {
    setFilterSearch(event.target.value);
  };

  const handleClearFilter = (columnId) => {
    const config = QUICK_FILTER_CONFIG[columnId];
    if (!config) {
      return;
    }
    if (config.type === 'multi') {
      onQuickFilterChange(columnId, []);
    } else {
      onQuickFilterChange(columnId, '');
    }
  };

  const renderFilterOptions = (columnId) => {
    const config = QUICK_FILTER_CONFIG[columnId];
    if (!config) {
      return null;
    }
    const options = quickFilterOptions[columnId] ?? [];
    const value = quickFilters[columnId] ?? (config.type === 'multi' ? [] : '');
    const loweredSearch = filterSearch.trim().toLowerCase();
    const filteredOptions = options.filter((option) =>
      option.toLowerCase().includes(loweredSearch),
    );

    if (config.type === 'single') {
      return (
        <ul className={styles.filterList} role="listbox">
          {filteredOptions.map((option) => {
            const isSelected = value === option;
            return (
              <li key={option}>
                <button
                  type="button"
                  className={`${styles.filterOptionButton} ${
                    isSelected ? styles.filterOptionButtonActive : ''
                  }`}
                  onClick={() => {
                    onQuickFilterChange(columnId, isSelected ? '' : option);
                    setOpenFilterId(null);
                    setFilterSearch('');
                  }}
                  role="option"
                  aria-selected={isSelected}
                  data-testid={`transactions-filter-${columnId}-${option}`}
                >
                  {option}
                </button>
              </li>
            );
          })}
        </ul>
      );
    }

    return (
      <ul className={styles.filterList} role="listbox" aria-multiselectable>
        {filteredOptions.map((option) => {
          const isSelected = value.includes(option);
          return (
            <li key={option}>
              <label className={`${styles.filterCheckboxLabel} ${
                isSelected ? styles.filterCheckboxLabelActive : ''
              }`}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {
                    const next = isSelected
                      ? value.filter((item) => item !== option)
                      : [...value, option];
                    onQuickFilterChange(columnId, next);
                  }}
                  className={styles.filterCheckbox}
                  data-testid={`transactions-filter-${columnId}-toggle-${option}`}
                />
                <span>{option}</span>
              </label>
            </li>
          );
        })}
      </ul>
    );
  };

  const renderFilterBadges = (columnId) => {
    const config = QUICK_FILTER_CONFIG[columnId];
    if (!config) {
      return null;
    }
    const value = quickFilters[columnId];

    if (config.type === 'multi') {
      if (!value || value.length === 0) {
        return null;
      }
      return value.map((item) => (
        <span key={item} className={styles.filterBadge} data-testid={`filter-badge-${columnId}-${item}`}>
          {item}
        </span>
      ));
    }

    if (!value) {
      return null;
    }
    return (
      <span className={styles.filterBadge} data-testid={`filter-badge-${columnId}`}>
        {value}
      </span>
    );
  };

  const handleScroll = () => {
    setOpenFilterId(null);
    setFilterSearch('');
  };

  return (
    <section className={styles.tableCard} aria-label="Transactions history table">
      <div
        className={styles.tableScroll}
        data-testid="transactions-table-container"
        onScroll={handleScroll}
      >
        <table className={styles.table} style={{ minWidth: `${minTableWidth + STICKY_COLUMN_BUFFER}px` }}>
          <thead>
            <tr>
              <th
                scope="col"
                className={`${styles.headerCell} ${styles.stickyLeft} ${styles.stickyLeftEdge} ${styles.checkboxCell}`}
              >
                <input
                  ref={headerCheckboxRef}
                  type="checkbox"
                  aria-label="Select all transactions"
                  checked={allSelected}
                  onChange={(event) => onSelectAll(event.target.checked)}
                  data-testid="transaction-select-all"
                />
              </th>
              {visibleColumns.map((column) => {
                const definition = getColumnDefinition(column.id);
                const alignClass = definition?.align === 'right' ? styles.headerAlignRight : '';
                const isSorted = sortState?.column === column.id;
                const ariaSort = isSorted ? (sortState.direction === 'asc' ? 'ascending' : 'descending') : 'none';
                const IconComponent = QUICK_FILTER_CONFIG[column.id]?.icon ?? FiFilter;
                return (
                  <th
                    key={column.id}
                    scope="col"
                    className={`${styles.headerCell} ${alignClass}`}
                    aria-sort={ariaSort}
                    style={{
                      minWidth: `${Math.max(definition?.minWidth ?? 120, column.width)}px`,
                      width: `${column.width}px`,
                    }}
                  >
                    <button
                      type="button"
                      className={styles.headerSortButton}
                      onClick={() => onSort(column.id)}
                      data-testid={`transactions-sort-${column.id}`}
                    >
                      <span className={styles.headerContent}>{definition?.label ?? column.id}</span>
                      <FiChevronDown
                        aria-hidden
                        className={`${styles.sortIcon} ${
                          isSorted
                            ? sortState.direction === 'asc'
                              ? styles.sortIconAsc
                              : styles.sortIconDesc
                            : styles.sortIconIdle
                        }`}
                      />
                    </button>
                    {QUICK_FILTER_CONFIG[column.id] ? (
                      <div className={styles.headerFilterBar}>
                        <button
                          type="button"
                          className={`${styles.filterTrigger} ${
                            (QUICK_FILTER_CONFIG[column.id].type === 'multi'
                            ? (quickFilters[column.id] ?? []).length > 0
                            : Boolean(quickFilters[column.id]))
                              ? styles.filterTriggerActive
                              : ''
                          }`}
                          onClick={() => handleFilterToggle(column.id)}
                          aria-haspopup="dialog"
                          aria-expanded={openFilterId === column.id}
                          data-testid={`transactions-quick-filter-${column.id}`}
                        >
                          <IconComponent aria-hidden />
                        </button>
                        <div className={styles.filterBadges}>{renderFilterBadges(column.id)}</div>
                      </div>
                    ) : null}
                    {openFilterId === column.id ? (
                      <div className={styles.filterPopover} ref={filterPopoverRef} role="dialog">
                        {QUICK_FILTER_CONFIG[column.id]?.type === 'single' ? (
                          <div className={styles.filterSearchRow}>
                            <input
                              type="search"
                              value={filterSearch}
                              onChange={handleFilterSearchChange}
                              className={styles.filterSearchInput}
                              placeholder={`Search ${QUICK_FILTER_CONFIG[column.id].label}`}
                              data-testid={`transactions-quick-filter-search-${column.id}`}
                            />
                          </div>
                        ) : null}
                        <div className={styles.filterOptionsWrapper}>{renderFilterOptions(column.id)}</div>
                        <div className={styles.filterFooter}>
                          <button
                            type="button"
                            className={styles.filterClearButton}
                            onClick={() => handleClearFilter(column.id)}
                            data-testid={`transactions-quick-filter-clear-${column.id}`}
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </th>
                );
              })}
              <th
                scope="col"
                className={`${styles.headerCell} ${styles.stickyRight} ${styles.stickyRightEdge} ${styles.actionsCell}`}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody style={{ minWidth: `${minTableWidth + STICKY_COLUMN_BUFFER}px` }}>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 2} className={styles.emptyState} data-testid="transactions-empty-state">
                  No transactions match the current search or filters.
                </td>
              </tr>
            ) : (
              transactions.map((txn) => {
                const isSelected = selectionSet.has(txn.id);
                const rowClass = `${styles.row} ${isSelected ? styles.rowSelected : ''}`;

                return (
                  <tr key={txn.id} className={rowClass} data-testid={`transaction-row-${txn.id}`}>
                    <td
                      className={`${styles.cell} ${styles.checkboxCell} ${styles.stickyLeft} ${styles.stickyLeftEdge}`}
                      data-testid={`transaction-select-cell-${txn.id}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(event) => onSelectRow(txn.id, event.target.checked)}
                        aria-label={`Select transaction ${txn.id}`}
                        data-testid={`transaction-select-${txn.id}`}
                      />
                    </td>
                    {visibleColumns.map((column) => {
                      const definition = getColumnDefinition(column.id);
                      const alignClass = definition?.align === 'right' ? styles.cellAlignRight : '';
                      return (
                        <td
                          key={column.id}
                          className={`${styles.cell} ${alignClass}`}
                          style={{
                            minWidth: `${Math.max(definition?.minWidth ?? 120, column.width)}px`,
                            width: `${column.width}px`,
                          }}
                          title={typeof txn[column.id] === 'string' ? txn[column.id] : undefined}
                        >
                          <div className={styles.cellText}>{renderCellContent(column.id, txn)}</div>
                        </td>
                      );
                    })}
                    <td
                      className={`${styles.cell} ${styles.actionsCell} ${styles.stickyRight} ${styles.stickyRightEdge}`}
                      data-testid={`transaction-actions-${txn.id}`}
                      onMouseEnter={() => handleActionAreaEnter(txn.id)}
                      onFocus={() => handleActionAreaEnter(txn.id)}
                      onMouseLeave={handleActionAreaLeave}
                      onBlur={handleActionAreaLeave}
                    >
                      <div className={styles.actionWrapper}>
                        <button
                          type="button"
                          className={styles.moreActionsButton}
                          aria-label={`Show actions for ${txn.id}`}
                          aria-haspopup="menu"
                          aria-expanded={activeActionId === txn.id}
                          data-testid={`transaction-more-${txn.id}`}
                          onMouseEnter={() => handleActionAreaEnter(txn.id)}
                          onFocus={() => handleActionAreaEnter(txn.id)}
                        >
                          <FiMoreHorizontal aria-hidden />
                        </button>
                        {activeActionId === txn.id ? (
                          <div className={styles.actionsPopover} role="menu">
                            <button
                              type="button"
                              className={styles.actionsPopoverItem}
                              onClick={() => onOpenAdvanced({ mode: 'edit', transaction: txn })}
                              data-testid={`transaction-popover-edit-${txn.id}`}
                              role="menuitem"
                            >
                              <FiEdit2 aria-hidden />
                              Edit transaction
                            </button>
                            <button
                              type="button"
                              className={`${styles.actionsPopoverItem} ${styles.actionsPopoverDanger}`}
                              onClick={() => onOpenAdvanced({ mode: 'delete', transaction: txn })}
                              data-testid={`transaction-popover-delete-${txn.id}`}
                              role="menuitem"
                            >
                              <FiTrash2 aria-hidden />
                              Delete transaction
                            </button>
                            <div className={styles.actionsNestedGroup}>
                              <span className={styles.actionsNestedLabel}>More actions</span>
                              <div className={styles.actionsNestedList} role="menu">
                                <button
                                  type="button"
                                  className={styles.actionsPopoverItem}
                                  onClick={() => onOpenAdvanced({ mode: 'advanced', transaction: txn, action: 'cancel' })}
                                  data-testid={`transaction-popover-cancel-${txn.id}`}
                                  role="menuitem"
                                >
                                  <FiXCircle aria-hidden />
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  className={styles.actionsPopoverItem}
                                  onClick={() => onOpenAdvanced({ mode: 'advanced', transaction: txn, action: 'partial-repay' })}
                                  data-testid={`transaction-popover-partial-${txn.id}`}
                                  role="menuitem"
                                >
                                  <FiRefreshCw aria-hidden />
                                  Partial repay
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
            {selectionSummary.count > 0 ? (
              <tr className={`${styles.row} ${styles.totalRow}`}>
                <td
                  className={`${styles.cell} ${styles.checkboxCell} ${styles.stickyLeft} ${styles.stickyLeftEdge} ${styles.totalCell}`}
                  data-testid="transactions-total-row-label"
                >
                  Selected totals
                </td>
                {visibleColumns.map((column) => {
                  const definition = getColumnDefinition(column.id);
                  const alignClass = definition?.align === 'right' ? styles.cellAlignRight : '';
                  const formatter = TOTAL_FIELDS.get(column.id);
                  return (
                    <td
                      key={column.id}
                      className={`${styles.cell} ${styles.totalCell} ${alignClass}`}
                      style={{
                        minWidth: `${Math.max(definition?.minWidth ?? 120, column.width)}px`,
                        width: `${column.width}px`,
                      }}
                    >
                      <div className={styles.cellText}>
                        {formatter ? formatter(selectionSummary) : '—'}
                      </div>
                    </td>
                  );
                })}
                <td
                  className={`${styles.cell} ${styles.actionsCell} ${styles.stickyRight} ${styles.stickyRightEdge} ${styles.totalCell}`}
                />
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className={styles.paginationBar} data-testid="transactions-pagination">
        <div className={styles.pageSizeGroup}>
          <label htmlFor="transactions-page-size">Rows per page</label>
          <select
            id="transactions-page-size"
            className={styles.pageSizeSelect}
            value={pagination.pageSize}
            onChange={(event) => pagination.onPageSizeChange(Number(event.target.value))}
          >
            {pagination.pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.paginationControls}>
          <button
            type="button"
            className={styles.paginationButton}
            onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
            disabled={pagination.currentPage === 1}
            aria-label="Previous page"
          >
            Prev
          </button>
          <span className={styles.paginationStatus}>
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          <button
            type="button"
            className={styles.paginationButton}
            onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
            disabled={pagination.currentPage === pagination.totalPages}
            aria-label="Next page"
          >
            Next
          </button>
        </div>
      </div>

    </section>
  );
}
