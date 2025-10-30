import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { FiEdit2, FiExternalLink } from 'react-icons/fi';

import {
  TRANSACTION_TYPE_VALUES,
  getTransactionTypeLabel,
  normalizeTransactionType,
} from '../../lib/transactions/transactionTypes';

import shellStyles from './table-shell.module.css';
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

  const shouldCompactDates =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(max-width: 500px)').matches;
  const effectiveFormat = shouldCompactDates ? 'DD/MM' : format;

  const dateValue = new Date(`${value}T00:00:00`);
  if (Number.isNaN(dateValue.getTime())) {
    return value;
  }

  if (effectiveFormat === 'DD/MM/YY') {
    return dateFormatters['DD/MM'].format(dateValue);
  }

  if (effectiveFormat === 'MM/DD/YY') {
    return dateFormatters['MM/DD'].format(dateValue);
  }

  if (effectiveFormat === 'YYYY-MM-DD') {
    const month = String(dateValue.getMonth() + 1).padStart(2, '0');
    const day = String(dateValue.getDate()).padStart(2, '0');
    return `${dateValue.getFullYear()}-${month}-${day}`;
  }

  const formatter = dateFormatters[effectiveFormat] ?? dateFormatters['DD/MM'];
  return formatter.format(dateValue);
}

function resolveTransactionType(transaction) {
  const value = transaction?.typeValue ?? normalizeTransactionType(transaction?.type);
  const label = transaction?.typeLabel ?? getTransactionTypeLabel(value);
  return { value, label };
}

function getAmountToneClass(typeValue) {
  if (typeValue === TRANSACTION_TYPE_VALUES.INCOME || typeValue === TRANSACTION_TYPE_VALUES.CASHBACK) {
    return bodyStyles.amountIncome;
  }
  if (typeValue === TRANSACTION_TYPE_VALUES.TRANSFER) {
    return bodyStyles.amountTransfer;
  }
  return bodyStyles.amountExpense;
}

function getTypePillClass(typeValue) {
  if (typeValue === TRANSACTION_TYPE_VALUES.INCOME || typeValue === TRANSACTION_TYPE_VALUES.CASHBACK) {
    return `${bodyStyles.pill} ${bodyStyles.pillIncome}`.trim();
  }
  if (typeValue === TRANSACTION_TYPE_VALUES.TRANSFER) {
    return `${bodyStyles.pill} ${bodyStyles.pillTransfer}`.trim();
  }
  if (typeValue === TRANSACTION_TYPE_VALUES.EXPENSES || typeValue === TRANSACTION_TYPE_VALUES.DEBT) {
    return `${bodyStyles.pill} ${bodyStyles.pillExpense}`.trim();
  }
  return `${bodyStyles.pill} ${bodyStyles.pillNeutral}`.trim();
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
  type: (txn) => {
    const { value, label } = resolveTransactionType(txn);
    return <span className={getTypePillClass(value)}>{label ?? '—'}</span>;
  },
  account: (txn, descriptor, helpers = {}) => {
    const label = txn.account ?? txn.accountName ?? txn.account_name ?? '—';
    const accountId = txn.accountId ?? txn.account_id ?? txn.account_uuid ?? null;

    if (!accountId) {
      return label;
    }

    const handleClick = (event) => {
      event.stopPropagation();
      event.preventDefault();
      helpers.onAccountDrilldown?.(accountId, txn, descriptor);
    };

    return (
      <button
        type="button"
        className={bodyStyles.accountLink}
        onClick={handleClick}
        title={`Open account ${label}`}
      >
        <span className={bodyStyles.accountLabel}>{label}</span>
        <FiExternalLink aria-hidden className={bodyStyles.accountIcon} />
        <span className={bodyStyles.srOnly}>Open account details</span>
      </button>
    );
  },
  shop: (txn) => txn.shop ?? '—',
  notes: (txn) => txn.notes ?? '—',
  amount: (txn) => {
    const numeric = Math.abs(Number(txn.amount ?? 0));
    const { value: typeValue } = resolveTransactionType(txn);
    return (
      <span
        className={`${bodyStyles.amountValue} ${getAmountToneClass(typeValue)}`}
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

function resolveCellContent(descriptor, transaction, helpers = {}) {
  if (!descriptor) {
    return '--';
  }

  const definition = descriptor.definition ?? {};
  if (typeof definition.renderCell === 'function') {
    return definition.renderCell(transaction, descriptor, helpers);
  }
  if (typeof definition.valueAccessor === 'function') {
    return definition.valueAccessor(transaction, descriptor);
  }
  if (definition.valueKey && transaction && transaction[definition.valueKey] !== undefined) {
    return transaction[definition.valueKey];
  }

  const renderer = columnRenderers[descriptor.id];
  if (renderer) {
    return renderer(transaction, descriptor, helpers);
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
  pinnedLeftOffsets = new Map(),
  pinnedRightOffsets = new Map(),
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

  const router = useRouter();

  const handleAccountDrilldown = useCallback(
    (accountId) => {
      if (!accountId) {
        return;
      }
      router.push(`/accounts/${encodeURIComponent(accountId)}`);
    },
    [router],
  );

  const cellHelpers = useMemo(
    () => ({ onAccountDrilldown: handleAccountDrilldown }),
    [handleAccountDrilldown],
  );

  const renderDefaultRowActions = (transaction, isSelected, rowId) => {
    const resolvedId = rowId ?? transaction?.id;
    const ariaLabel = resolvedId ? `Edit row ${resolvedId}` : 'Edit row';
    return (
      <td
        className={`${shellStyles.bodyCell} ${shellStyles.actionsCell}`}
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
            aria-label={ariaLabel}
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
            const currentGroupId = transaction?.transferGroupId ?? null;
            const previousGroupId = index > 0 ? transactions[index - 1]?.transferGroupId ?? null : null;
            const nextGroupId =
              index < transactions.length - 1 ? transactions[index + 1]?.transferGroupId ?? null : null;
            const isGroupedWithPrev = Boolean(
              currentGroupId && previousGroupId && previousGroupId === currentGroupId,
            );
            const isGroupedWithNext = Boolean(currentGroupId && nextGroupId && nextGroupId === currentGroupId);
            const isTransferGroupRow = isGroupedWithPrev || isGroupedWithNext;
            const isTransferBoundary = isTransferGroupRow && !isGroupedWithNext;
            const rowClassName = [
              bodyStyles.row,
              isSelected ? bodyStyles.rowSelected : '',
              isTransferGroupRow ? bodyStyles.transferGroupRow : '',
              isTransferBoundary ? bodyStyles.transferGroupTrailing : '',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <tr
                key={normalizedId}
                className={rowClassName}
                data-transfer-group={isTransferGroupRow ? currentGroupId : undefined}
                data-transfer-role={
                  isTransferGroupRow && transaction?.transferGroupRole
                    ? transaction.transferGroupRole
                    : undefined
                }
                data-transfer-boundary={isTransferBoundary ? 'true' : undefined}
              >
                <td
                  className={`${shellStyles.bodyCell} ${shellStyles.checkboxCell} ${shellStyles.stickyLeft}`}
                  style={{
                    minWidth: `${CHECKBOX_COLUMN_WIDTH}px`,
                    width: `${CHECKBOX_COLUMN_WIDTH}px`,
                  }}
                >
                  <div className={shellStyles.checkboxCellInner}>
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
                  const { id, minWidth, width, align, pinned } = descriptor;
                  const isHidden = hiddenColumnIds.has(id);
                  const isPinnedLeft = pinned === 'left';
                  const isPinnedRight = pinned === 'right';
                  const cellClassName = [
                    shellStyles.bodyCell,
                    align === 'right'
                      ? shellStyles.cellAlignRight
                      : align === 'center'
                      ? shellStyles.cellAlignCenter
                      : '',
                    isPinnedLeft ? shellStyles.stickyLeft : '',
                    isPinnedRight ? shellStyles.stickyRight : '',
                    isHidden && isColumnReorderMode ? shellStyles.bodyCellHidden : '',
                  ]
                    .filter(Boolean)
                    .join(' ');
                  const stickyStyle = isPinnedLeft
                    ? { left: `${pinnedLeftOffsets.get(id) ?? 0}px` }
                    : isPinnedRight
                    ? { right: `${pinnedRightOffsets.get(id) ?? 0}px` }
                    : undefined;

                  return (
                    <td
                      key={id}
                      className={cellClassName}
                      style={{ minWidth: `${minWidth}px`, width: `${width}px`, ...stickyStyle }}
                      data-testid={`transactions-cell-${id}-${resolvedId ?? transaction.id ?? `row-${index}`}`}
                      aria-hidden={isHidden && isColumnReorderMode ? 'true' : undefined}
                      onMouseEnter={handleCellEnter}
                      onMouseLeave={handleCellLeave}
                      onFocus={handleCellEnter}
                      onBlur={handleCellLeave}
                    >
                      {resolveCellContent(descriptor, transaction, cellHelpers)}
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



