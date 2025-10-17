import { useEffect, useMemo, useRef } from 'react';
import { FiMoreHorizontal } from 'react-icons/fi';

import styles from '../../styles/TransactionsHistory.module.css';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

function formatCurrency(value) {
  return currencyFormatter.format(value ?? 0);
}

function formatPercent(value) {
  if (value === undefined || value === null) {
    return '0%';
  }
  return `${Number(value).toFixed(2).replace(/\.00$/, '')}%`;
}

const COLUMN_WIDTHS = {
  date: '120px',
  type: '132px',
  account: '182px',
  shop: '180px',
  notes: '240px',
  amount: '140px',
  percentBack: '120px',
  fixedBack: '140px',
  totalBack: '150px',
  finalPrice: '160px',
  debtTag: '160px',
  cycleTag: '150px',
  category: '150px',
  linkedTxn: '160px',
  owner: '130px',
  actions: '190px',
};

export function TransactionsTable({
  transactions,
  selectedIds,
  onSelectRow,
  onSelectAll,
  selectionSummary,
  onOpenAdvanced,
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

  return (
    <section className={styles.tableCard} aria-label="Transactions history table">
      <div className={styles.tableScroll} data-testid="transactions-table-container">
        <table className={styles.table}>
          <thead>
            <tr>
              <th
                scope="col"
                className={`${styles.headerCell} ${styles.stickyLeft} ${styles.checkboxCell}`}
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
              <th scope="col" className={styles.headerCell} style={{ minWidth: COLUMN_WIDTHS.date }}>
                Date
              </th>
              <th scope="col" className={styles.headerCell} style={{ minWidth: COLUMN_WIDTHS.type }}>
                Type
              </th>
              <th scope="col" className={styles.headerCell} style={{ minWidth: COLUMN_WIDTHS.account }}>
                Account
              </th>
              <th scope="col" className={styles.headerCell} style={{ minWidth: COLUMN_WIDTHS.shop }}>
                Shop
              </th>
              <th scope="col" className={styles.headerCell} style={{ minWidth: COLUMN_WIDTHS.notes }}>
                Notes
              </th>
              <th scope="col" className={styles.headerCell} style={{ minWidth: COLUMN_WIDTHS.amount }}>
                Amount
              </th>
              <th
                scope="col"
                className={styles.headerCell}
                style={{ minWidth: COLUMN_WIDTHS.percentBack }}
              >
                % Back
              </th>
              <th scope="col" className={styles.headerCell} style={{ minWidth: COLUMN_WIDTHS.fixedBack }}>
                Fix Back
              </th>
              <th scope="col" className={styles.headerCell} style={{ minWidth: COLUMN_WIDTHS.totalBack }}>
                Total Back
              </th>
              <th
                scope="col"
                className={styles.headerCell}
                style={{ minWidth: COLUMN_WIDTHS.finalPrice }}
              >
                Final Price
              </th>
              <th scope="col" className={styles.headerCell} style={{ minWidth: COLUMN_WIDTHS.debtTag }}>
                Debt Tag
              </th>
              <th scope="col" className={styles.headerCell} style={{ minWidth: COLUMN_WIDTHS.cycleTag }}>
                Cycle Tag
              </th>
              <th scope="col" className={styles.headerCell} style={{ minWidth: COLUMN_WIDTHS.category }}>
                Category
              </th>
              <th scope="col" className={styles.headerCell} style={{ minWidth: COLUMN_WIDTHS.linkedTxn }}>
                Linked TXN
              </th>
              <th scope="col" className={styles.headerCell} style={{ minWidth: COLUMN_WIDTHS.owner }}>
                Owner
              </th>
              <th
                scope="col"
                className={`${styles.headerCell} ${styles.stickyRight} ${styles.actionsCell}`}
                style={{ minWidth: COLUMN_WIDTHS.actions }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={17} className={styles.emptyState} data-testid="transactions-empty-state">
                  No transactions match the current search or filters.
                </td>
              </tr>
            ) : (
              transactions.map((txn) => {
                const isSelected = selectionSet.has(txn.id);
                const rowClass = `${styles.row} ${isSelected ? styles.rowSelected : ''}`;
                const pillClass =
                  txn.type === 'Income'
                    ? `${styles.pill} ${styles.pillIncome}`
                    : `${styles.pill} ${styles.pillExpense}`;

                return (
                  <tr key={txn.id} className={rowClass} data-testid={`transaction-row-${txn.id}`}>
                    <td
                      className={`${styles.cell} ${styles.checkboxCell} ${styles.stickyLeft}`}
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
                    <td className={styles.cell} style={{ minWidth: COLUMN_WIDTHS.date }}>
                      {txn.date}
                    </td>
                    <td className={styles.cell} style={{ minWidth: COLUMN_WIDTHS.type }}>
                      <span className={pillClass}>{txn.type}</span>
                    </td>
                    <td className={styles.cell} style={{ minWidth: COLUMN_WIDTHS.account }}>
                      {txn.account}
                    </td>
                    <td className={styles.cell} style={{ minWidth: COLUMN_WIDTHS.shop }}>
                      {txn.shop}
                    </td>
                    <td className={styles.cell} style={{ minWidth: COLUMN_WIDTHS.notes }}>
                      <div>
                        <span>{txn.notes}</span>
                        <div className={styles.noteText}>{txn.id}</div>
                      </div>
                    </td>
                    <td className={styles.cell} style={{ minWidth: COLUMN_WIDTHS.amount }}>
                      {formatCurrency(txn.amount)}
                    </td>
                    <td className={styles.cell} style={{ minWidth: COLUMN_WIDTHS.percentBack }}>
                      {formatPercent(txn.percentBack)}
                    </td>
                    <td className={styles.cell} style={{ minWidth: COLUMN_WIDTHS.fixedBack }}>
                      {formatCurrency(txn.fixedBack)}
                    </td>
                    <td className={styles.cell} style={{ minWidth: COLUMN_WIDTHS.totalBack }}>
                      {formatCurrency(txn.totalBack)}
                    </td>
                    <td className={styles.cell} style={{ minWidth: COLUMN_WIDTHS.finalPrice }}>
                      {formatCurrency(txn.finalPrice)}
                    </td>
                    <td className={styles.cell} style={{ minWidth: COLUMN_WIDTHS.debtTag }}>
                      {txn.debtTag}
                    </td>
                    <td className={styles.cell} style={{ minWidth: COLUMN_WIDTHS.cycleTag }}>
                      {txn.cycleTag}
                    </td>
                    <td className={styles.cell} style={{ minWidth: COLUMN_WIDTHS.category }}>
                      {txn.category}
                    </td>
                    <td className={styles.cell} style={{ minWidth: COLUMN_WIDTHS.linkedTxn }}>
                      {txn.linkedTxn}
                    </td>
                    <td className={styles.cell} style={{ minWidth: COLUMN_WIDTHS.owner }}>
                      {txn.owner}
                    </td>
                    <td
                      className={`${styles.cell} ${styles.actionsCell} ${styles.stickyRight}`}
                      style={{ minWidth: COLUMN_WIDTHS.actions }}
                      data-testid={`transaction-actions-${txn.id}`}
                    >
                      <div className={styles.actionsGroup}>
                        <button
                          type="button"
                          className={styles.ghostButton}
                          onClick={() => onOpenAdvanced({ mode: 'edit', transaction: txn })}
                          data-testid={`transaction-edit-${txn.id}`}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className={`${styles.ghostButton} ${styles.dangerButton}`}
                          onClick={() => onOpenAdvanced({ mode: 'delete', transaction: txn })}
                          data-testid={`transaction-delete-${txn.id}`}
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          className={styles.advancedButton}
                          onClick={() => onOpenAdvanced({ mode: 'advanced', transaction: txn })}
                          data-testid={`transaction-advanced-${txn.id}`}
                          aria-label={`Open advanced options for ${txn.id}`}
                        >
                          <FiMoreHorizontal aria-hidden />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectionSummary.count > 0 ? (
        <div className={styles.tableFooter}>
          <div className={styles.selectionBar} data-testid="transactions-selection-bar">
            <span>
              {selectionSummary.count} transaction{selectionSummary.count > 1 ? 's' : ''} selected
            </span>
            <div className={styles.selectionTotals}>
              <span>Total amount {formatCurrency(selectionSummary.amount)}</span>
              <span>Final price {formatCurrency(selectionSummary.finalPrice)}</span>
              <span>Total back {formatCurrency(selectionSummary.totalBack)}</span>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
