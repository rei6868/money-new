import { useEffect, useMemo, useRef } from 'react';
import { FiEdit2, FiMoreHorizontal, FiTrash2 } from 'react-icons/fi';

import styles from '../../styles/TransactionsHistory.module.css';
import { formatAmount, formatAmountWithTrailing, formatPercent } from '../../lib/numberFormat';
import { TRANSACTION_COLUMN_DEFINITIONS } from './transactionColumns';

const definitionMap = new Map(
  TRANSACTION_COLUMN_DEFINITIONS.map((definition) => [definition.id, definition]),
);

const STICKY_COLUMN_BUFFER = 252; // checkbox (72px) + actions column (180px) baseline

const dateFormatters = {
  'DD/MM/YY': new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }),
  'MM/DD/YY': new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }),
};

function formatTransactionDate(value, format = 'DD/MM/YY') {
  if (!value) {
    return '—';
  }

  const dateValue = new Date(`${value}T00:00:00`);
  if (Number.isNaN(dateValue.getTime())) {
    return value;
  }

  if (format === 'YYYY-MM-DD') {
    const month = String(dateValue.getMonth() + 1).padStart(2, '0');
    const day = String(dateValue.getDate()).padStart(2, '0');
    return `${dateValue.getFullYear()}-${month}-${day}`;
  }

  const formatter = dateFormatters[format] ?? dateFormatters['DD/MM/YY'];
  return formatter.format(dateValue);
}

function getAmountToneClass(type) {
  if (type === 'Income') {
    return styles.amountIncome;
  }
  if (type === 'Transfer') {
    return styles.amountTransfer;
  }
  return styles.amountExpense;
}

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
  date: (txn, column) => formatTransactionDate(txn.date, column.format),
  type: (txn, _column, stylesRef) => (
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
  amount: (txn, column, stylesRef) => {
    const numeric = Math.abs(Number(txn.amount ?? 0));
    const toneClass = getAmountToneClass(txn.type);
    return (
      <span className={`${stylesRef.amountValue} ${toneClass}`} data-testid={`transaction-amount-${txn.id}`}>
        {formatAmount(numeric)}
      </span>
    );
  },
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

function renderCellContent(column, transaction) {
  const renderer = columnRenderers[column.id];
  if (!renderer) {
    return transaction[column.id] ?? '—';
  }
  return renderer(transaction, column, styles);
}

function computeMinWidth(columns) {
  return columns.reduce((total, column) => {
    const definition = getColumnDefinition(column.id);
    const minWidth = column.width || definition?.minWidth || 120;
    return total + minWidth;
  }, 0);
}

export function TransactionsTable({
  transactions,
  selectedIds,
  onSelectRow,
  onSelectAll,
  selectionSummary,
  onOpenAdvanced,
  visibleColumns,
  onDeselectAll,
  onToggleShowSelected,
  isShowingSelectedOnly,
  pagination,
}) {
  const selectionSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allSelected = transactions.length > 0 && transactions.every((txn) => selectionSet.has(txn.id));
  const isIndeterminate = selectionSet.size > 0 && !allSelected;
  const headerCheckboxRef = useRef(null);

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  const minTableWidth = useMemo(() => computeMinWidth(visibleColumns), [visibleColumns]);

  const totals = useMemo(
    () =>
      transactions.reduce(
        (acc, txn) => {
          const amount = Number(txn.amount) || 0;
          const finalPrice = Number(txn.finalPrice) || 0;
          const totalBack = Number(txn.totalBack) || 0;

          acc.amount += amount;
          acc.finalPrice += finalPrice;
          acc.totalBack += totalBack;
          return acc;
        },
        { amount: 0, finalPrice: 0, totalBack: 0 },
      ),
    [transactions],
  );

  return (
    <section className={styles.tableCard} aria-label="Transactions history table">
      <div className={styles.tableScroll} data-testid="transactions-table-container">
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
                return (
                  <th
                    key={column.id}
                    scope="col"
                    className={`${styles.headerCell} ${alignClass}`}
                    style={{
                      minWidth: `${Math.max(definition?.minWidth ?? 120, column.width)}px`,
                      width: `${column.width}px`,
                    }}
                  >
                    <span className={styles.headerContent}>{definition?.label ?? column.id}</span>
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
                          <div className={styles.cellText}>{renderCellContent(column, txn)}</div>
                        </td>
                      );
                    })}
                    <td
                      className={`${styles.cell} ${styles.actionsCell} ${styles.stickyRight} ${styles.stickyRightEdge}`}
                      data-testid={`transaction-actions-${txn.id}`}
                    >
                      <div className={styles.tableActionsGroup}>
                        <button
                          type="button"
                          className={`${styles.tableActionIconButton} ${styles.tooltipTrigger}`}
                          onClick={() => onOpenAdvanced({ mode: 'edit', transaction: txn })}
                          data-testid={`transaction-edit-${txn.id}`}
                          aria-label={`Edit ${txn.id}`}
                          data-tooltip="Edit"
                        >
                          <FiEdit2 aria-hidden />
                        </button>
                        <button
                          type="button"
                          className={`${styles.tableActionIconButton} ${styles.tableDangerIconButton} ${styles.tooltipTrigger}`}
                          onClick={() => onOpenAdvanced({ mode: 'delete', transaction: txn })}
                          data-testid={`transaction-delete-${txn.id}`}
                          aria-label={`Delete ${txn.id}`}
                          data-tooltip="Delete"
                        >
                          <FiTrash2 aria-hidden />
                        </button>
                        <button
                          type="button"
                          className={`${styles.advancedButton} ${styles.tooltipTrigger}`}
                          onClick={() => onOpenAdvanced({ mode: 'advanced', transaction: txn })}
                          data-testid={`transaction-advanced-${txn.id}`}
                          aria-label={`Open advanced options for ${txn.id}`}
                          data-tooltip="More actions"
                        >
                          <FiMoreHorizontal aria-hidden />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
            {transactions.length > 0 ? (
              <tr className={`${styles.row} ${styles.totalRow}`} data-testid="transactions-total-row">
                <td
                  className={`${styles.cell} ${styles.checkboxCell} ${styles.stickyLeft} ${styles.stickyLeftEdge} ${styles.totalLabelCell}`}
                  aria-hidden
                />
                {visibleColumns.map((column, index) => {
                  const definition = getColumnDefinition(column.id);
                  const alignClass = definition?.align === 'right' ? styles.cellAlignRight : '';
                  let content = '';
                  if (column.id === 'amount') {
                    const toneClass =
                      totals.amount === 0
                        ? ''
                        : totals.amount > 0
                        ? styles.amountIncome
                        : styles.amountExpense;
                    content = (
                      <span className={`${styles.amountValue} ${toneClass}`}>
                        {formatAmountWithTrailing(Math.abs(totals.amount))}
                      </span>
                    );
                  } else if (column.id === 'finalPrice') {
                    content = formatAmountWithTrailing(totals.finalPrice);
                  } else if (column.id === 'totalBack') {
                    content = formatAmountWithTrailing(totals.totalBack);
                  } else if (index === 0) {
                    content = <span className={styles.totalLabel}>Totals</span>;
                  }

                  return (
                    <td
                      key={`total-${column.id}`}
                      className={`${styles.cell} ${alignClass} ${styles.totalCell}`}
                      style={{
                        minWidth: `${Math.max(definition?.minWidth ?? 120, column.width)}px`,
                        width: `${column.width}px`,
                      }}
                    >
                      <div className={styles.cellText}>{content}</div>
                    </td>
                  );
                })}
                <td
                  className={`${styles.cell} ${styles.actionsCell} ${styles.stickyRight} ${styles.stickyRightEdge} ${styles.totalLabelCell}`}
                  aria-hidden
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

      {selectionSummary.count > 0 ? (
        <div className={styles.tableFooter}>
          <div className={styles.selectionBar} data-testid="transactions-selection-bar">
            <div className={styles.selectionSummaryText}>
              <span>
                {selectionSummary.count} transaction{selectionSummary.count > 1 ? 's' : ''} selected
              </span>
              <div className={styles.selectionTotals}>
                <span>Total amount {formatAmountWithTrailing(selectionSummary.amount)}</span>
                <span>Final price {formatAmountWithTrailing(selectionSummary.finalPrice)}</span>
                <span>Total back {formatAmountWithTrailing(selectionSummary.totalBack)}</span>
              </div>
            </div>
            <div className={styles.selectionButtons}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={onDeselectAll}
                data-testid="transactions-selection-clear"
              >
                De-select
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={onToggleShowSelected}
                data-testid="transactions-selection-toggle"
              >
                {isShowingSelectedOnly ? 'Show all rows' : 'Show selected rows'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
