import { useCallback, useMemo, useState } from 'react';
import { FiEdit2 } from 'react-icons/fi';

import styles from './TableBase.module.css';
import bodyStyles from './TableBaseBody.module.css';
import { formatAmount, formatPercent } from '../../lib/numberFormat';
import { ACTIONS_COLUMN_WIDTH, CHECKBOX_COLUMN_WIDTH } from './tableUtils';
import { TableTooltip } from './TableTooltip';

const dateFormatters = {
  'DD/MM': new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
  }),
  'DD/MM/YY': new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }),
  'MM/DD': new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
  }),
  'MM/DD/YY': new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }),
};

function formatTransactionDate(value, format = 'DD/MM') {
  if (!value) {
    return '—';
  }

  const dateValue = new Date(`${value}T00:00:00`);
  if (Number.isNaN(dateValue.getTime())) {
    return value;
  }

  if (format === 'DD/MM/YY') {
    return dateFormatters['DD/MM'].format(dateValue);
  }

  if (format === 'MM/DD/YY') {
    return dateFormatters['MM/DD'].format(dateValue);
  }

  if (format === 'YYYY-MM-DD') {
    const month = String(dateValue.getMonth() + 1).padStart(2, '0');
    const day = String(dateValue.getDate()).padStart(2, '0');
    return `${dateValue.getFullYear()}-${month}-${day}`;
  }

  const formatter = dateFormatters[format] ?? dateFormatters['DD/MM'];
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
  if (!descriptor) {
    return '--';
  }

  const definition = descriptor.definition ?? {};
  if (typeof definition.renderCell === 'function') {
    return definition.renderCell(transaction, descriptor);
  }
  if (typeof definition.valueAccessor === 'function') {
    return definition.valueAccessor(transaction, descriptor);
  }
  if (definition.valueKey && transaction && transaction[definition.valueKey] !== undefined) {
    return transaction[definition.valueKey];
  }

  const renderer = columnRenderers[descriptor.id];
  if (renderer) {
    return renderer(transaction, descriptor);
  }

  if (transaction && transaction[descriptor.id] !== undefined) {
    return transaction[descriptor.id];
  }

  if (definition.emptyFallback !== undefined) {
    return definition.emptyFallback;
  }

  return '--';
}

export function TableBaseBody({
  transactions,
  columns,
  selectionSet,
  onSelectRow,
  hiddenColumnIds = new Set(),
  isColumnReorderMode = false,
  isShowingSelectedOnly = false,
  getRowId = (row) => (row ? row.id ?? null : null),
  renderRowActionsCell,
  onEditRow,
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

  const renderDefaultRowActions = (transaction, isSelected, rowId) => {
    const resolvedId = rowId ?? transaction?.id;
    return (
      <td
        className={`${styles.bodyCell} ${styles.actionsCell}`}
        style={{
          minWidth: `${ACTIONS_COLUMN_WIDTH}px`,
          width: `${ACTIONS_COLUMN_WIDTH}px`,
        }}
      >
        <div className={bodyStyles.inlineActions} data-selected={isSelected ? 'true' : undefined}>
          <button
            type="button"
            className={bodyStyles.inlineEditButton}
            onClick={() => onEditRow?.(transaction)}
            disabled={isColumnReorderMode}
            title="Edit"
            aria-label={resolvedId ? `Edit transaction ${resolvedId}` : 'Edit transaction'}
            data-testid={resolvedId ? `transaction-edit-${resolvedId}` : undefined}
          >
            <FiEdit2 aria-hidden />
          </button>
        </div>
      </td>
    );
  };
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
          transactions.map((transaction, index) => {
            const rowId = getRowId(transaction);
            const resolvedId = rowId ?? transaction.id;
            const normalizedId = resolvedId ?? `row-${index}`;
            const isSelected = normalizedId !== undefined && normalizedId !== null && selectionSet.has(normalizedId);
            return (
              <tr
                key={normalizedId}
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
                      onChange={(event) => {
                        const identifier = resolvedId ?? transaction.id ?? `row-${index}`;
                        if (identifier !== undefined && identifier !== null) {
                          onSelectRow?.(identifier, event.target.checked);
                        }
                      }}
                      aria-label={`Select transaction ${resolvedId ?? transaction.id ?? `row-${index}`}`}
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
                      data-testid={`transactions-cell-${id}-${resolvedId ?? transaction.id ?? `row-${index}`}`}
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
                {renderRowActionsCell
                  ? renderRowActionsCell({
                      transaction,
                      isSelected,
                      rowId: resolvedId,
                      toggleSelection: (checked) => {
                        const identifier = resolvedId ?? transaction.id ?? `row-${index}`;
                        if (identifier !== undefined && identifier !== null) {
                          onSelectRow?.(identifier, checked);
                        }
                      },
                      onEdit: () => onEditRow?.(transaction),
                    })
                  : renderDefaultRowActions(transaction, isSelected, resolvedId)}
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



