import { FiChevronRight, FiEdit2, FiFilter, FiMoreHorizontal, FiTrash2 } from 'react-icons/fi';

import styles from '../../styles/TransactionsHistory.module.css';
import { formatAmount, formatAmountWithTrailing, formatPercent } from '../../lib/numberFormat';
import { ACTIONS_COLUMN_WIDTH, CHECKBOX_COLUMN_WIDTH } from './tableUtils';
import { TableActionMenuPortal } from './TableActions';

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

export function TableBaseBody({
  transactions,
  visibleColumns,
  definitionMap,
  selectionSet,
  onSelectRow,
  actionRegistry,
  openActionId,
  openActionSubmenu,
  onActionTriggerEnter,
  onActionTriggerLeave,
  onActionFocus,
  onActionBlur,
  onAction,
  onSubmenuEnter,
  registerActionMenu,
  totals,
  isTotalsVisible,
}) {
  return (
    <tbody>
      {transactions.map((txn) => {
        const isSelected = selectionSet.has(txn.id);
        return (
          <tr key={txn.id} className={isSelected ? styles.rowSelected : undefined}>
            <td
              className={`${styles.bodyCell} ${styles.stickyLeft} ${styles.checkboxCell}`}
              style={{
                minWidth: `${CHECKBOX_COLUMN_WIDTH}px`,
                width: `${CHECKBOX_COLUMN_WIDTH}px`,
              }}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(event) => onSelectRow?.(txn.id, event.target.checked)}
                aria-label={`Select transaction ${txn.id}`}
              />
            </td>
            {visibleColumns.map((column) => {
              const definition = definitionMap.get(column.id);
              const alignClass = definition?.align === 'right' ? styles.cellAlignRight : '';
              const minWidth = Math.max(definition?.minWidth ?? 120, column.width);
              return (
                <td
                  key={column.id}
                  className={`${styles.bodyCell} ${alignClass}`}
                  style={{
                    minWidth: `${minWidth}px`,
                    width: `${column.width}px`,
                  }}
                  data-testid={`transactions-cell-${column.id}-${txn.id}`}
                >
                  {renderCellContent(column, txn)}
                </td>
              );
            })}
            <td
              className={`${styles.bodyCell} ${styles.stickyRight}`}
              style={{
                left: `${CHECKBOX_COLUMN_WIDTH}px`,
                minWidth: `${ACTIONS_COLUMN_WIDTH}px`,
                width: `${ACTIONS_COLUMN_WIDTH}px`,
              }}
            >
              <div
                className={styles.actionsCellTrigger}
                ref={actionRegistry.registerTrigger(txn.id)}
                onMouseEnter={() => onActionTriggerEnter(txn.id)}
                onMouseLeave={onActionTriggerLeave}
                onFocus={() => onActionFocus(txn.id)}
                onBlur={onActionBlur}
              >
                <button
                  type="button"
                  className={`${styles.actionsTriggerButton} ${
                    openActionId === txn.id ? styles.actionsTriggerButtonActive : ''
                  }`}
                  data-testid={`transaction-actions-trigger-${txn.id}`}
                  aria-haspopup="menu"
                  aria-expanded={openActionId === txn.id}
                  aria-label="Show row actions"
                  onMouseEnter={() => onActionTriggerEnter(txn.id)}
                >
                  <FiMoreHorizontal aria-hidden />
                </button>
              </div>
              <TableActionMenuPortal
                rowId={txn.id}
                anchor={actionRegistry.getTrigger(txn.id)}
                isOpen={openActionId === txn.id}
                onClose={() => onAction(null)()}
                registerContent={registerActionMenu}
                className={`${styles.actionsMenu} ${styles.actionsMenuOpen}`}
                containerProps={{
                  onMouseEnter: () => onActionTriggerEnter(txn.id),
                  onMouseLeave: onActionTriggerLeave,
                  onFocus: () => onActionFocus(txn.id),
                  onBlur: onActionBlur,
                }}
                dataTestId={`transaction-actions-menu-${txn.id}`}
              >
                <button
                  type="button"
                  className={styles.actionsMenuItem}
                  onMouseEnter={onSubmenuEnter(null)}
                  onClick={onAction({ mode: 'edit', transaction: txn })}
                  data-testid={`transaction-action-edit-${txn.id}`}
                >
                  <FiEdit2 aria-hidden />
                  <span>Quick edit</span>
                </button>
                <button
                  type="button"
                  className={`${styles.actionsMenuItem} ${styles.actionsMenuDanger}`}
                  onMouseEnter={onSubmenuEnter(null)}
                  onClick={onAction({ mode: 'delete', transaction: txn })}
                  data-testid={`transaction-action-delete-${txn.id}`}
                >
                  <FiTrash2 aria-hidden />
                  <span>Delete</span>
                </button>
                <div
                  className={`${styles.actionsMenuItem} ${styles.actionsMenuNested}`}
                  onMouseEnter={onSubmenuEnter('more')}
                  data-testid={`transaction-action-more-${txn.id}`}
                >
                  <div className={styles.actionsMenuNestedLabel}>
                    <FiMoreHorizontal aria-hidden />
                    <span>More actions</span>
                  </div>
                  <FiChevronRight className={styles.actionsMenuNestedCaret} aria-hidden />
                  <div
                    className={`${styles.actionsSubmenu} ${
                      openActionId === txn.id && openActionSubmenu === 'more'
                        ? styles.actionsSubmenuOpen
                        : ''
                    }`}
                    role="menu"
                  >
                    <button
                      type="button"
                      className={styles.actionsMenuItem}
                      onClick={onAction({
                        mode: 'advanced',
                        transaction: txn,
                        intent: 'advanced-panel',
                      })}
                      data-testid={`transaction-action-advanced-${txn.id}`}
                    >
                      <FiFilter aria-hidden />
                      <span>Open advanced panel</span>
                    </button>
                    <button
                      type="button"
                      className={styles.actionsMenuItem}
                      onClick={onAction({
                        mode: 'advanced',
                        transaction: txn,
                        intent: 'duplicate-draft',
                      })}
                      data-testid={`transaction-action-duplicate-${txn.id}`}
                    >
                      <FiEdit2 aria-hidden />
                      <span>Duplicate as draft</span>
                    </button>
                  </div>
                </div>
              </TableActionMenuPortal>
            </td>
          </tr>
        );
      })}
      {isTotalsVisible ? (
        <tr className={`${styles.row} ${styles.totalRow}`} data-testid="transactions-total-row">
          <td
            className={`${styles.bodyCell} ${styles.checkboxCell} ${styles.stickyLeft} ${styles.stickyLeftNoShadow} ${styles.totalLabelCell}`}
            aria-hidden="true"
            style={{
              minWidth: `${CHECKBOX_COLUMN_WIDTH}px`,
              width: `${CHECKBOX_COLUMN_WIDTH}px`,
            }}
          />
          {visibleColumns.map((column, index) => {
            const definition = definitionMap.get(column.id);
            const alignClass = definition?.align === 'right' ? styles.cellAlignRight : '';
            let content = null;
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
              content = <span className={styles.totalLabel}>Selected totals</span>;
            }

            return (
              <td
                key={`total-${column.id}`}
                className={`${styles.bodyCell} ${alignClass} ${styles.totalCell}`}
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
            className={`${styles.bodyCell} ${styles.stickyRight} ${styles.totalLabelCell}`}
            aria-hidden="true"
            style={{
              left: `${CHECKBOX_COLUMN_WIDTH}px`,
              minWidth: `${ACTIONS_COLUMN_WIDTH}px`,
              width: `${ACTIONS_COLUMN_WIDTH}px`,
            }}
          />
        </tr>
      ) : null}
    </tbody>
  );
}
