import { useCallback, useMemo, useState } from 'react';
import { FiChevronRight, FiEdit2, FiFilter, FiMoreHorizontal, FiTrash2 } from 'react-icons/fi';

import styles from './TableBase.module.css';
import bodyStyles from './TableBaseBody.module.css';
import { formatAmount, formatPercent } from '../../lib/numberFormat';
import { ACTIONS_COLUMN_WIDTH, CHECKBOX_COLUMN_WIDTH } from './tableUtils';
import { TableActionMenuPortal } from './TableActions';
import { TableTooltip } from './TableTooltip';

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
    return bodyStyles.amountIncome;
  }
  if (type === 'Transfer') {
    return bodyStyles.amountTransfer;
  }
  return bodyStyles.amountExpense;
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
    <div
      className={bodyStyles.totalBackCell}
      data-tooltip-text={canShowFormula ? formulaText : undefined}
    >
      <span className={bodyStyles.totalBackValue}>{totalBack}</span>
      {canShowFormula ? <span className={bodyStyles.totalBackFormula}>{formulaText}</span> : null}
    </div>
  );
}

const columnRenderers = {
  date: (txn, descriptor) => formatTransactionDate(txn.date, descriptor.column.format),
  type: (txn) => (
    <span
      className={
        txn.type === 'Income'
          ? `${bodyStyles.pill} ${bodyStyles.pillIncome}`
          : `${bodyStyles.pill} ${bodyStyles.pillExpense}`
      }
    >
      {txn.type ?? '—'}
    </span>
  ),
  account: (txn) => txn.account ?? '—',
  shop: (txn) => txn.shop ?? '—',
  notes: (txn) => txn.notes ?? '—',
  amount: (txn) => {
    const numeric = Math.abs(Number(txn.amount ?? 0));
    return (
      <span
        className={`${bodyStyles.amountValue} ${getAmountToneClass(txn.type)}`}
        data-testid={`transaction-amount-${txn.id}`}
      >
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

function resolveCellContent(descriptor, transaction) {
  const renderer = columnRenderers[descriptor.id];
  if (renderer) {
    return renderer(transaction, descriptor);
  }
  return transaction[descriptor.id] ?? '—';
}

export function TableBaseBody({
  transactions,
  columns,
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
  isSubmenuFlipped = false,
  hiddenColumnIds = new Set(),
  isColumnReorderMode = false,
  isShowingSelectedOnly = false,
}) {
  const [tooltipState, setTooltipState] = useState({ anchor: null, content: '', isVisible: false });

  const visibleColumnCount = useMemo(
    () => columns.filter((descriptor) => descriptor.column.visible !== false).length,
    [columns],
  );

  const hideTooltip = useCallback(() => {
    setTooltipState((state) => (state.isVisible ? { anchor: null, content: '', isVisible: false } : state));
  }, []);

  const resolveTooltipContent = useCallback((cell) => {
    if (!cell) {
      return { content: '', force: false };
    }
    const explicitNode = cell.querySelector('[data-tooltip-text]');
    const explicitContent = explicitNode?.getAttribute('data-tooltip-text');
    if (explicitContent) {
      return { content: explicitContent, force: true };
    }
    const textValue = cell.textContent ?? '';
    return { content: textValue.trim(), force: false };
  }, []);

  const showTooltip = useCallback(
    (cell) => {
      if (!cell) {
        hideTooltip();
        return;
      }
      const { content, force } = resolveTooltipContent(cell);
      if (!content) {
        hideTooltip();
        return;
      }
      const isOverflowing = cell.scrollWidth - cell.clientWidth > 1;
      if (!force && !isOverflowing) {
        hideTooltip();
        return;
      }
      setTooltipState({ anchor: cell, content, isVisible: true });
    },
    [hideTooltip, resolveTooltipContent],
  );

  const handleCellEnter = useCallback(
    (event) => {
      showTooltip(event.currentTarget);
    },
    [showTooltip],
  );

  const handleCellLeave = useCallback(() => {
    hideTooltip();
  }, [hideTooltip]);

  const tooltipAnchor = tooltipState.anchor;
  const tooltipContent = tooltipState.content;
  const tooltipVisible = tooltipState.isVisible;

  const renderRowActions = (transaction, isSelected) => (
    <td
      className={`${styles.bodyCell} ${styles.actionsCell} ${styles.stickyRight}`}
      style={{
        minWidth: `${ACTIONS_COLUMN_WIDTH}px`,
        width: `${ACTIONS_COLUMN_WIDTH}px`,
      }}
    >
      <div
        className={bodyStyles.actionsTrigger}
        ref={actionRegistry.registerTrigger(transaction.id)}
        onMouseEnter={() => {
          if (isColumnReorderMode) {
            return;
          }
          onActionTriggerEnter(transaction.id);
        }}
        onMouseLeave={() => {
          if (isColumnReorderMode) {
            return;
          }
          onActionTriggerLeave();
        }}
        onFocus={() => {
          if (isColumnReorderMode) {
            return;
          }
          onActionFocus(transaction.id);
        }}
        onBlur={(event) => {
          if (isColumnReorderMode) {
            return;
          }
          onActionBlur(event);
        }}
        data-selected={isSelected ? 'true' : undefined}
      >
        <button
          type="button"
          className={`${bodyStyles.actionsButton} ${
            openActionId === transaction.id ? bodyStyles.actionsButtonActive : ''
          }`.trim()}
          data-testid={`transaction-actions-trigger-${transaction.id}`}
          aria-haspopup="menu"
          aria-expanded={openActionId === transaction.id}
          aria-label="Show row actions"
          disabled={isColumnReorderMode}
          onClick={() => {
            if (isColumnReorderMode) {
              return;
            }
            if (openActionId === transaction.id) {
              onAction(null)();
            } else {
              onActionTriggerEnter(transaction.id);
            }
          }}
        >
          <FiMoreHorizontal aria-hidden />
        </button>
      </div>
      <TableActionMenuPortal
        rowId={transaction.id}
        anchor={actionRegistry.getTrigger(transaction.id)}
        isOpen={!isColumnReorderMode && openActionId === transaction.id}
        onClose={() => onAction(null)()}
        registerContent={registerActionMenu}
        className={`${bodyStyles.actionsMenu} ${
          isSubmenuFlipped ? bodyStyles.actionsMenuFlipped : ''
        }`.trim()}
        containerProps={{
          onMouseEnter: () => onActionTriggerEnter(transaction.id),
          onMouseLeave: onActionTriggerLeave,
          onFocus: () => onActionFocus(transaction.id),
          onBlur: onActionBlur,
        }}
        dataTestId={`transaction-actions-menu-${transaction.id}`}
      >
        <button
          type="button"
          className={bodyStyles.actionsMenuItem}
          onMouseEnter={onSubmenuEnter(null)}
          onClick={onAction({ mode: 'edit', transaction })}
          data-testid={`transaction-action-edit-${transaction.id}`}
        >
          <FiEdit2 aria-hidden />
          <span>Quick edit</span>
        </button>
        <button
          type="button"
          className={`${bodyStyles.actionsMenuItem} ${bodyStyles.actionsMenuDanger}`.trim()}
          onMouseEnter={onSubmenuEnter(null)}
          onClick={onAction({ mode: 'delete', transaction })}
          data-testid={`transaction-action-delete-${transaction.id}`}
        >
          <FiTrash2 aria-hidden />
          <span>Delete</span>
        </button>
        <div
          className={`${bodyStyles.actionsMenuItem} ${bodyStyles.actionsMenuNested}`.trim()}
          onMouseEnter={onSubmenuEnter('more')}
          data-testid={`transaction-action-more-${transaction.id}`}
        >
          <div className={bodyStyles.actionsNestedLabel}>
            <FiMoreHorizontal aria-hidden />
            <span>More actions</span>
          </div>
          <FiChevronRight className={bodyStyles.actionsNestedCaret} aria-hidden />
          <div
            className={`${bodyStyles.actionsSubmenu} ${
              isSubmenuFlipped ? bodyStyles.actionsSubmenuFlipped : ''
            } ${
              openActionId === transaction.id && openActionSubmenu === 'more'
                ? bodyStyles.actionsSubmenuOpen
                : ''
            }`.trim()}
            role="menu"
          >
            <button
              type="button"
              className={bodyStyles.actionsMenuItem}
              onClick={onAction({
                mode: 'advanced',
                transaction,
                intent: 'advanced-panel',
              })}
              data-testid={`transaction-action-advanced-${transaction.id}`}
            >
              <FiFilter aria-hidden />
              <span>Open advanced panel</span>
            </button>
            <button
              type="button"
              className={bodyStyles.actionsMenuItem}
              onClick={onAction({
                mode: 'advanced',
                transaction,
                intent: 'duplicate-draft',
              })}
              data-testid={`transaction-action-duplicate-${transaction.id}`}
            >
              <FiEdit2 aria-hidden />
              <span>Duplicate as draft</span>
            </button>
          </div>
        </div>
      </TableActionMenuPortal>
    </td>
  );

  return (
    <>
      <tbody data-testid={isShowingSelectedOnly ? 'transactions-body-selected' : 'transactions-body'}>
        {transactions.length === 0 ? (
          <tr>
            <td
              colSpan={visibleColumnCount + 2}
              className={bodyStyles.emptyCell}
              data-testid="transactions-empty"
            >
              No data found
            </td>
          </tr>
        ) : (
          transactions.map((transaction) => {
            const isSelected = selectionSet.has(transaction.id);
            return (
              <tr
                key={transaction.id}
                className={`${bodyStyles.row} ${isSelected ? bodyStyles.rowSelected : ''}`.trim()}
              >
                <td
                  className={`${styles.bodyCell} ${styles.checkboxCell} ${styles.stickyLeft}`}
                  style={{
                    minWidth: `${CHECKBOX_COLUMN_WIDTH}px`,
                    width: `${CHECKBOX_COLUMN_WIDTH}px`,
                  }}
                >
                  <div className={styles.checkboxCellInner}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(event) => onSelectRow?.(transaction.id, event.target.checked)}
                      aria-label={`Select transaction ${transaction.id}`}
                      disabled={isColumnReorderMode}
                    />
                  </div>
                </td>
                {columns.map((descriptor) => {
                  const { id, minWidth, width, align } = descriptor;
                  const isHidden = hiddenColumnIds.has(id);
                  const cellClassName = [
                    styles.bodyCell,
                    align === 'right'
                      ? styles.cellAlignRight
                      : align === 'center'
                      ? styles.cellAlignCenter
                      : '',
                    isHidden && isColumnReorderMode ? styles.bodyCellHidden : '',
                  ]
                    .filter(Boolean)
                    .join(' ');

                  return (
                    <td
                      key={id}
                      className={cellClassName}
                      style={{ minWidth: `${minWidth}px`, width: `${width}px` }}
                      data-testid={`transactions-cell-${id}-${transaction.id}`}
                      aria-hidden={isHidden && isColumnReorderMode ? 'true' : undefined}
                      onMouseEnter={handleCellEnter}
                      onMouseLeave={handleCellLeave}
                      onFocus={handleCellEnter}
                      onBlur={handleCellLeave}
                    >
                      {resolveCellContent(descriptor, transaction)}
                    </td>
                  );
                })}
                {renderRowActions(transaction, isSelected)}
              </tr>
            );
          })
        )}
      </tbody>
      <TableTooltip
        anchor={tooltipAnchor}
        isVisible={tooltipVisible}
        className={bodyStyles.tooltipPortal}
        offset={{ x: 0, y: -8 }}
      >
        {tooltipContent}
      </TableTooltip>
    </>
  );
}
