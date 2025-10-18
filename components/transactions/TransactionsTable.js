import { useEffect, useMemo, useRef, useState } from 'react';
import { FiChevronDown, FiChevronUp, FiEdit2, FiMoreHorizontal, FiTrash2, FiX } from 'react-icons/fi';

import styles from '../../styles/TransactionsHistory.module.css';
import { formatAmount, formatAmountWithTrailing, formatPercent } from '../../lib/numberFormat';
import { TRANSACTION_COLUMN_DEFINITIONS } from './transactionColumns';

const ACTION_MENU_CLOSE_DELAY = 160;

const QUICK_FILTER_CONFIG = {
  category: { type: 'single', label: 'Category' },
  owner: { type: 'single', label: 'People' },
  type: { type: 'multi', label: 'Type' },
  debtTag: { type: 'multi', label: 'Debt Tag' },
};

function getAmountToneClass(type) {
  if (type === 'Income') {
    return styles.amountIncome;
  }
  if (type === 'Transfer') {
    return styles.amountTransfer;
  }
  return styles.amountExpense;
}

function renderCellContent(column, transaction) {
  switch (column.id) {
    case 'date':
      return transaction.displayDate ?? transaction.date ?? '—';
    case 'type':
    case 'account':
    case 'shop':
    case 'notes':
    case 'debtTag':
    case 'cycleTag':
    case 'category':
    case 'linkedTxn':
    case 'owner':
    case 'id':
      return transaction[column.id] ?? '—';
    case 'amount': {
      const numeric = Math.abs(Number(transaction.amount ?? 0));
      const toneClass = getAmountToneClass(transaction.type);
      return (
        <span className={`${styles.amountValue} ${toneClass}`} data-testid={`transaction-amount-${transaction.id}`}>
          {formatAmount(numeric)}
        </span>
      );
    }
    case 'percentBack':
      return formatPercent(transaction.percentBack);
    case 'fixedBack':
      return formatAmount(transaction.fixedBack);
    case 'totalBack': {
      const amount = Number(transaction.amount ?? 0);
      const percentBack = Number(transaction.percentBack ?? 0);
      const fixedBack = Number(transaction.fixedBack ?? 0);
      const totalBack = Number(transaction.totalBack ?? 0);
      const showFormula = amount > 0 && percentBack > 0 && fixedBack > 0 && totalBack > 0;
      const formula = `${formatAmount(amount)}×${formatPercent(percentBack)} + ${formatAmount(fixedBack)}`;
      return (
        <div className={styles.totalBackCell} title={showFormula ? formula : undefined}>
          <span className={styles.totalBackValue}>{formatAmount(totalBack)}</span>
          {showFormula ? <span className={styles.totalBackFormula}>{formula}</span> : null}
        </div>
      );
    }
    case 'finalPrice':
      return formatAmount(transaction.finalPrice);
    default:
      return transaction[column.id] ?? '—';
  }
}

function SortIcon({ direction }) {
  if (direction === 'asc') {
    return <FiChevronUp className={`${styles.sortIcon} ${styles.sortIconAsc}`} aria-hidden />;
  }
  if (direction === 'desc') {
    return <FiChevronDown className={`${styles.sortIcon} ${styles.sortIconDesc}`} aria-hidden />;
  }
  return <FiChevronUp className={`${styles.sortIcon} ${styles.sortIconIdle}`} aria-hidden />;
}

function QuickFilterBadge({ label, value, onRemove }) {
  return (
    <span className={styles.filterBadge}>
      {label}: {value}
      <button type="button" className={styles.filterBadgeDismiss} onClick={onRemove} aria-label={`Remove filter ${label}`}>
        <FiX aria-hidden />
      </button>
    </span>
  );
}

export function TransactionsTable({
  transactions,
  selectedIds,
  onSelectRow,
  onSelectAll,
  selectionSummary = { count: 0, amount: 0, finalPrice: 0, totalBack: 0 },
  onOpenAdvanced,
  columnDefinitions = [],
  visibleColumns = [],
  pagination,
  sortState = [],
  onSortChange,
  quickFilters,
  quickFilterOptions,
  onQuickFilterChange,
}) {
  const effectiveDefinitions = columnDefinitions.length > 0 ? columnDefinitions : TRANSACTION_COLUMN_DEFINITIONS;
  const definitionMap = useMemo(
    () => new Map(effectiveDefinitions.map((definition) => [definition.id, definition])),
    [effectiveDefinitions],
  );

  const resolvedColumns = useMemo(() => {
    const source = visibleColumns.length > 0
      ? visibleColumns
      : effectiveDefinitions.map((definition, index) => ({
          ...definition,
          order: index,
          visible: definition.defaultVisible !== false,
          width: definition.defaultWidth ?? definition.minWidth ?? 120,
        }));

    return source
      .filter((column) => column.visible !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((column) => {
        const definition = definitionMap.get(column.id) ?? {};
        return {
          ...definition,
          ...column,
          label: column.label ?? definition.label ?? column.id,
          align: column.align ?? definition.align ?? 'left',
          width: column.width ?? definition.defaultWidth ?? definition.minWidth ?? 120,
        };
      });
  }, [visibleColumns, effectiveDefinitions, definitionMap]);

  const minTableWidth = useMemo(
    () =>
      resolvedColumns.reduce((total, column) => {
        const definition = definitionMap.get(column.id);
        const minWidth = column.width ?? definition?.minWidth ?? 120;
        return total + minWidth;
      }, 0),
    [resolvedColumns, definitionMap],
  );

  const selectionSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const headerCheckboxRef = useRef(null);
  const [activeActionId, setActiveActionId] = useState(null);
  const closeActionTimer = useRef(null);

  useEffect(() => {
    if (!headerCheckboxRef.current) {
      return;
    }
    const isIndeterminate = selectionSet.size > 0 && selectionSet.size < transactions.length;
    headerCheckboxRef.current.indeterminate = isIndeterminate;
  }, [selectionSet, transactions]);

  useEffect(
    () => () => {
      if (closeActionTimer.current) {
        clearTimeout(closeActionTimer.current);
      }
    },
    [],
  );

  const sortLookup = useMemo(() => {
    const lookup = new Map();
    sortState.forEach((entry, index) => {
      lookup.set(entry.id, { ...entry, index });
    });
    return lookup;
  }, [sortState]);

  const handleSortClick = (columnId) => (event) => {
    if (!onSortChange) {
      return;
    }
    const isMulti = event.shiftKey || event.metaKey || event.ctrlKey;
    onSortChange(columnId, { multi: isMulti });
  };

  const handleSelectAllChange = (event) => {
    onSelectAll(event.target.checked);
  };

  const handleRowCheckboxChange = (transactionId) => (event) => {
    onSelectRow(transactionId, event.target.checked);
  };

  const handleRequestCloseActions = () => {
    if (closeActionTimer.current) {
      clearTimeout(closeActionTimer.current);
    }
    closeActionTimer.current = setTimeout(() => {
      setActiveActionId(null);
    }, ACTION_MENU_CLOSE_DELAY);
  };

  const handleImmediateCloseActions = () => {
    if (closeActionTimer.current) {
      clearTimeout(closeActionTimer.current);
    }
    setActiveActionId(null);
  };

  const handleQuickFilterSelect = (filterId, value) => {
    const config = QUICK_FILTER_CONFIG[filterId];
    if (!config) {
      return;
    }
    if (config.type === 'multi') {
      const previous = new Set(quickFilters?.[filterId] ?? []);
      if (previous.has(value)) {
        previous.delete(value);
      } else {
        previous.add(value);
      }
      onQuickFilterChange(filterId, Array.from(previous));
      return;
    }
    onQuickFilterChange(filterId, value);
  };

  const handleClearBadge = (filterId, value) => {
    const config = QUICK_FILTER_CONFIG[filterId];
    if (!config) {
      return;
    }
    if (config.type === 'multi') {
      const previous = new Set(quickFilters?.[filterId] ?? []);
      previous.delete(value);
      onQuickFilterChange(filterId, Array.from(previous));
      return;
    }
    onQuickFilterChange(filterId, '');
  };

  const quickFilterBadges = useMemo(() => {
    if (!quickFilters) {
      return [];
    }
    return Object.entries(quickFilters).flatMap(([key, value]) => {
      if (!value || (Array.isArray(value) && value.length === 0)) {
        return [];
      }
      const label = QUICK_FILTER_CONFIG[key]?.label ?? key;
      if (Array.isArray(value)) {
        return value.map((item) => ({ key: `${key}:${item}`, filterId: key, label, value: item }));
      }
      return [{ key, filterId: key, label, value }];
    });
  }, [quickFilters]);

  return (
    <div className={styles.tableCard}>
      <div className={styles.quickFilterHeader}>
        <div className={styles.filterBadges}>
          {quickFilterBadges.map((badge) => (
            <QuickFilterBadge
              key={badge.key}
              label={badge.label}
              value={badge.value}
              onRemove={() => handleClearBadge(badge.filterId, badge.value)}
            />
          ))}
        </div>
        <div className={styles.selectionSummary}>
          <span>{selectionSummary.count} selected</span>
          <span>Amount {formatAmountWithTrailing(selectionSummary.amount)}</span>
          <span>Final {formatAmountWithTrailing(selectionSummary.finalPrice)}</span>
          <span>Back {formatAmountWithTrailing(selectionSummary.totalBack)}</span>
        </div>
      </div>

      <div className={styles.tableScroll}>
        <table className={styles.table} style={{ minWidth: `${minTableWidth}px` }}>
          <thead>
            <tr>
              <th className={`${styles.headerCell} ${styles.stickyLeft}`} scope="col">
                <div className={styles.headerContent}>
                  <input
                    ref={headerCheckboxRef}
                    type="checkbox"
                    checked={transactions.length > 0 && selectionSet.size === transactions.length}
                    onChange={handleSelectAllChange}
                    aria-label="Select all transactions"
                  />
                </div>
              </th>
              <th className={`${styles.headerCell} ${styles.stickyLeft}`} scope="col">
                <div className={styles.headerContent}>
                  Actions
                </div>
              </th>
              {resolvedColumns.map((column) => {
                const sortMeta = sortLookup.get(column.id);
                return (
                  <th key={column.id} className={styles.headerCell} style={{ width: column.width }} scope="col">
                    <button
                      type="button"
                      className={styles.headerSortButton}
                      onClick={handleSortClick(column.id)}
                    >
                      <span className={styles.headerContent}>{column.label}</span>
                      <SortIcon direction={sortMeta?.direction} />
                    </button>
                    {quickFilterOptions?.[column.id] ? (
                      <div className={styles.headerFilterBar}>
                        <div className={styles.quickFilterList}>
                          {(() => {
                            const options = quickFilterOptions[column.id] ?? [];
                            const config = QUICK_FILTER_CONFIG[column.id];
                            const currentValue = quickFilters?.[column.id];
                            if (config?.type === 'multi') {
                              return options.map((option) => {
                                const isChecked = Array.isArray(currentValue)
                                  ? currentValue.includes(option)
                                  : false;
                                return (
                                  <label key={option} className={styles.quickFilterOption}>
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => handleQuickFilterSelect(column.id, option)}
                                    />
                                    {option}
                                  </label>
                                );
                              });
                            }
                            return (
                              <select
                                className={styles.quickFilterSelect}
                                value={typeof currentValue === 'string' ? currentValue : ''}
                                onChange={(event) => handleQuickFilterSelect(column.id, event.target.value)}
                              >
                                <option value="">All</option>
                                {options.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            );
                          })()}
                        </div>
                      </div>
                    ) : null}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => {
              const isSelected = selectionSet.has(transaction.id);
              return (
                <tr
                  key={transaction.id}
                  className={`${styles.row} ${isSelected ? styles.rowSelected : ''}`}
                >
                  <td className={`${styles.cell} ${styles.stickyLeft}`}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={handleRowCheckboxChange(transaction.id)}
                      aria-label={`Select transaction ${transaction.id}`}
                    />
                  </td>
                  <td className={`${styles.cell} ${styles.stickyLeft}`}>
                    <div className={styles.actionsMenu}>
                      <button
                        type="button"
                        className={`${styles.actionsTriggerButton} ${activeActionId === transaction.id ? styles.actionsTriggerButtonActive : ''}`}
                        onClick={() => setActiveActionId((prev) => (prev === transaction.id ? null : transaction.id))}
                        onBlur={handleRequestCloseActions}
                        aria-haspopup="menu"
                        aria-expanded={activeActionId === transaction.id}
                        aria-label={`Open quick actions for ${transaction.id}`}
                      >
                        <FiMoreHorizontal aria-hidden />
                      </button>
                      {activeActionId === transaction.id ? (
                        <div className={`${styles.actionsMenuList} ${styles.actionsMenuOpen}`} role="menu">
                          <button
                            type="button"
                            className={styles.actionsMenuItem}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              onOpenAdvanced?.({ mode: 'edit', transaction });
                              handleImmediateCloseActions();
                            }}
                          >
                            <FiEdit2 aria-hidden /> Edit
                          </button>
                          <button
                            type="button"
                            className={`${styles.actionsMenuItem} ${styles.actionsMenuDanger}`}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              onOpenAdvanced?.({ mode: 'delete', transaction });
                              handleImmediateCloseActions();
                            }}
                          >
                            <FiTrash2 aria-hidden /> Delete
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </td>
                  {resolvedColumns.map((column) => {
                    const content = renderCellContent(column, transaction);
                    const alignClass = column.align === 'right' ? styles.cellAlignRight : '';
                    return (
                      <td key={column.id} className={`${styles.cell} ${alignClass}`} style={{ width: column.width }}>
                        <span className={styles.cellText}>{content}</span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pagination ? (
        <div className={styles.paginationBar}>
          <div className={styles.paginationMeta}>
            Page {pagination.currentPage} of {pagination.totalPages}
          </div>
          <div className={styles.paginationControls}>
            <button
              type="button"
              className={styles.paginationButton}
              onClick={() => pagination.onPageChange?.(Math.max(1, pagination.currentPage - 1))}
              disabled={pagination.currentPage <= 1}
            >
              Prev
            </button>
            <button
              type="button"
              className={styles.paginationButton}
              onClick={() => pagination.onPageChange?.(Math.min(pagination.totalPages, pagination.currentPage + 1))}
              disabled={pagination.currentPage >= pagination.totalPages}
            >
              Next
            </button>
            <select
              className={styles.paginationSelect}
              value={pagination.pageSize}
              onChange={(event) => pagination.onPageSizeChange?.(Number(event.target.value))}
            >
              {pagination.pageSizeOptions?.map((option) => (
                <option key={option} value={option}>
                  {option} / page
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}
    </div>
  );
}
