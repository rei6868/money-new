import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FiChevronRight,
  FiEdit2,
  FiFilter,
  FiMoreHorizontal,
  FiTrash2,
} from 'react-icons/fi';

import styles from '../../styles/TransactionsHistory.module.css';
import { TableBase, TableActionMenuPortal, useActionMenuRegistry } from '../table';
import { Pagination } from '../common/Pagination';
import { formatAmount, formatAmountWithTrailing, formatPercent } from '../../lib/numberFormat';
import { SELECTION_COLUMN_WIDTH } from '../table/tableUtils';

const FONT_SCALE_DEFAULT = 1;
const FONT_SCALE_MIN = 0.8;
const FONT_SCALE_MAX = 1.4;
const FONT_SCALE_STEP = 0.1;
const ACTIONS_COLUMN_ID = '__actions__';
const ACTIONS_COLUMN_WIDTH = 80;
const ACTION_SUBMENU_WIDTH = 220;

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

function normalizeFontScale(value) {
  const rounded = Math.round(value * 100) / 100;
  return Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, rounded));
}

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
    <div
      className={styles.totalBackCell}
      data-tooltip-text={canShowFormula ? formulaText : undefined}
    >
      <span className={styles.totalBackValue}>{totalBack}</span>
      {canShowFormula ? <span className={styles.totalBackFormula}>{formulaText}</span> : null}
    </div>
  );
}

const columnRenderers = {
  date: ({ row, column }) => formatTransactionDate(row.date, column.meta?.format),
  type: ({ row }) => (
    <span
      className={
        row.type === 'Income'
          ? `${styles.pill} ${styles.pillIncome}`
          : `${styles.pill} ${styles.pillExpense}`
      }
    >
      {row.type}
    </span>
  ),
  account: ({ row }) => row.account ?? '—',
  shop: ({ row }) => row.shop ?? '—',
  notes: ({ row }) => row.notes ?? '—',
  amount: ({ row }) => {
    const numeric = Math.abs(Number(row.amount ?? 0));
    const toneClass = getAmountToneClass(row.type);
    return (
      <span
        className={`${styles.amountValue} ${toneClass}`}
        data-testid={`transaction-amount-${row.id}`}
      >
        {formatAmount(numeric)}
      </span>
    );
  },
  percentBack: ({ row }) => formatPercent(row.percentBack),
  fixedBack: ({ row }) => formatAmount(row.fixedBack),
  totalBack: ({ row }) => <TotalBackCell transaction={row} />, 
  finalPrice: ({ row }) => formatAmount(row.finalPrice),
  debtTag: ({ row }) => row.debtTag ?? '—',
  cycleTag: ({ row }) => row.cycleTag ?? '—',
  category: ({ row }) => row.category ?? '—',
  linkedTxn: ({ row }) => row.linkedTxn ?? '—',
  owner: ({ row }) => row.owner ?? '—',
  id: ({ row }) => row.id ?? '—',
};

export function TransactionsTable({
  transactions,
  selectedIds,
  onSelectionChange,
  selectionSummary,
  onOpenAdvanced,
  allColumns = [],
  visibleColumns = [],
  pagination,
  isColumnReorderMode = false,
  onColumnOrderChange,
  sortState,
  onSortChange,
}) {
  const [fontScale, setFontScale] = useState(FONT_SCALE_DEFAULT);
  const actionRegistry = useActionMenuRegistry();
  const actionMenuCloseTimer = useRef(null);
  const [openActionId, setOpenActionId] = useState(null);
  const [openActionSubmenu, setOpenActionSubmenu] = useState(null);
  const [isSubmenuFlipped, setIsSubmenuFlipped] = useState(false);

  const applyFontScale = useCallback((next) => {
    setFontScale((current) => {
      const target = typeof next === 'function' ? next(current) : next;
      return normalizeFontScale(target);
    });
  }, []);

  const handleIncreaseFont = useCallback(() => {
    applyFontScale((current) => current + FONT_SCALE_STEP);
  }, [applyFontScale]);

  const handleDecreaseFont = useCallback(() => {
    applyFontScale((current) => current - FONT_SCALE_STEP);
  }, [applyFontScale]);

  const handleResetFont = useCallback(() => {
    applyFontScale(FONT_SCALE_DEFAULT);
  }, [applyFontScale]);

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
    return () => {
      if (actionMenuCloseTimer.current) {
        clearTimeout(actionMenuCloseTimer.current);
      }
    };
  }, []);

  const displayColumns = useMemo(
    () => (isColumnReorderMode ? allColumns : visibleColumns),
    [isColumnReorderMode, allColumns, visibleColumns],
  );

  const tableColumns = useMemo(() => {
    const baseColumns = displayColumns.map((column) => {
      const renderer = columnRenderers[column.id];
      const renderCell = renderer
        ? (context) => renderer({ ...context, column, columnDefinition: column })
        : (context) => context.value ?? '—';

      return {
        id: column.id,
        label: column.label,
        align: column.align,
        width: column.width,
        minWidth: column.minWidth ?? column.width,
        defaultWidth: column.defaultWidth,
        hidden: column.visible === false,
        sortable: column.sortable !== false,
        format: column.format,
        meta: column,
        renderCell,
        getCellProps: ({ row }) => ({
          'data-testid': `transactions-cell-${column.id}-${row.id}`,
        }),
      };
    });

    return baseColumns;
  }, [displayColumns]);

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

  const actionsColumn = useMemo(
    () => ({
      id: ACTIONS_COLUMN_ID,
      label: 'Actions',
      width: ACTIONS_COLUMN_WIDTH,
      minWidth: ACTIONS_COLUMN_WIDTH,
      sortable: false,
      sticky: 'right',
      disableReorder: true,
      renderHeader: () => (
        <span className={styles.headerLabelText}>Actions</span>
      ),
      renderCell: ({ row }) => {
        const isOpen = openActionId === row.id;
        return (
          <>
            <div
              className={styles.actionsCellTrigger}
              ref={actionRegistry.registerTrigger(row.id)}
              onMouseEnter={() => handleActionTriggerEnter(row.id)}
              onMouseLeave={handleActionTriggerLeave}
              onFocus={() => handleActionFocus(row.id)}
              onBlur={handleActionBlur}
            >
              <button
                type="button"
                className={`${styles.actionsTriggerButton} ${
                  isOpen ? styles.actionsTriggerButtonActive : ''
                }`.trim()}
                data-testid={`transaction-actions-trigger-${row.id}`}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                aria-label="Show row actions"
                onMouseEnter={() => handleActionTriggerEnter(row.id)}
              >
                <FiMoreHorizontal aria-hidden />
              </button>
            </div>
            <TableActionMenuPortal
              rowId={row.id}
              anchor={actionRegistry.getTrigger(row.id)}
              isOpen={isOpen}
              onClose={() => handleAction(null)()}
              registerContent={actionRegistry.registerMenu}
              className={`${styles.actionsMenu} ${styles.actionsMenuOpen} ${
                isSubmenuFlipped ? styles.actionsMenuFlipped : ''
              }`.trim()}
              containerProps={{
                onMouseEnter: () => handleActionTriggerEnter(row.id),
                onMouseLeave: handleActionTriggerLeave,
                onFocus: () => handleActionFocus(row.id),
                onBlur: handleActionBlur,
              }}
              dataTestId={`transaction-actions-menu-${row.id}`}
            >
              <button
                type="button"
                className={styles.actionsMenuItem}
                onMouseEnter={handleSubmenuEnter(null)}
                onClick={handleAction({ mode: 'edit', transaction: row })}
                data-testid={`transaction-action-edit-${row.id}`}
              >
                <FiEdit2 aria-hidden />
                <span>Quick edit</span>
              </button>
              <button
                type="button"
                className={`${styles.actionsMenuItem} ${styles.actionsMenuDanger}`}
                onMouseEnter={handleSubmenuEnter(null)}
                onClick={handleAction({ mode: 'delete', transaction: row })}
                data-testid={`transaction-action-delete-${row.id}`}
              >
                <FiTrash2 aria-hidden />
                <span>Delete</span>
              </button>
              <div
                className={`${styles.actionsMenuItem} ${styles.actionsMenuNested}`}
                onMouseEnter={handleSubmenuEnter('more')}
                data-testid={`transaction-action-more-${row.id}`}
              >
                <div className={styles.actionsMenuNestedLabel}>
                  <FiMoreHorizontal aria-hidden />
                  <span>More actions</span>
                </div>
                <FiChevronRight className={styles.actionsMenuNestedCaret} aria-hidden />
                <div
                  className={`${styles.actionsSubmenu} ${
                    isSubmenuFlipped ? styles.actionsSubmenuFlipped : ''
                  } ${isOpen && openActionSubmenu === 'more' ? styles.actionsSubmenuOpen : ''}`.trim()}
                  role="menu"
                >
                  <button
                    type="button"
                    className={styles.actionsMenuItem}
                    onClick={handleAction({
                      mode: 'advanced',
                      transaction: row,
                      intent: 'advanced-panel',
                    })}
                    data-testid={`transaction-action-advanced-${row.id}`}
                  >
                    <FiFilter aria-hidden />
                    <span>Open advanced panel</span>
                  </button>
                  <button
                    type="button"
                    className={styles.actionsMenuItem}
                    onClick={handleAction({
                      mode: 'advanced',
                      transaction: row,
                      intent: 'duplicate-draft',
                    })}
                    data-testid={`transaction-action-duplicate-${row.id}`}
                  >
                    <FiEdit2 aria-hidden />
                    <span>Duplicate as draft</span>
                  </button>
                </div>
              </div>
            </TableActionMenuPortal>
          </>
        );
      },
    }),
    [actionRegistry, handleAction, handleActionBlur, handleActionFocus, handleActionTriggerEnter, handleActionTriggerLeave, handleSubmenuEnter, isSubmenuFlipped, openActionId, openActionSubmenu],
  );

  const combinedColumns = useMemo(
    () => [...tableColumns, actionsColumn],
    [tableColumns, actionsColumn],
  );

  const paginationContent = useMemo(() => {
    if (!pagination) {
      return null;
    }
    const totalPages = Math.max(1, pagination.totalPages || 1);
    const canIncrease = fontScale < FONT_SCALE_MAX - 1e-6;
    const canDecrease = fontScale > FONT_SCALE_MIN + 1e-6;
    const isDefault = Math.abs(fontScale - FONT_SCALE_DEFAULT) < 1e-6;
    const formattedScale = `${Math.round(fontScale * 100)}%`;

    return (
      <>
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
        <div className={styles.fontScaleGroup} role="group" aria-label="Table font size controls">
          <span className={styles.fontScaleLabel}>Font size</span>
          <button
            type="button"
            className={styles.fontScaleButton}
            onClick={handleDecreaseFont}
            disabled={!canDecrease}
            aria-label="Decrease table font size"
          >
            −
          </button>
          <span className={styles.fontScaleValue} aria-live="polite">
            {formattedScale}
          </span>
          <button
            type="button"
            className={styles.fontScaleButton}
            onClick={handleIncreaseFont}
            disabled={!canIncrease}
            aria-label="Increase table font size"
          >
            +
          </button>
          <button
            type="button"
            className={`${styles.fontScaleButton} ${styles.fontScaleReset}`.trim()}
            onClick={handleResetFont}
            disabled={isDefault}
            aria-label="Reset table font size"
          >
            Reset
          </button>
        </div>
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={totalPages}
          onPageChange={pagination.onPageChange}
          className={styles.paginationControls}
          buttonClassName={styles.paginationButton}
          statusClassName={styles.paginationStatus}
        />
      </>
    );
  }, [pagination, fontScale, handleDecreaseFont, handleIncreaseFont, handleResetFont]);

  const shouldShowTotals = (selectedIds?.length ?? 0) > 0;
  const totalSelectionCount = selectionSummary?.count ?? selectedIds?.length ?? 0;

  const renderFooterRow = useCallback(
    ({ columns }) => {
      if (!shouldShowTotals) {
        return null;
      }

      const formattedTotals = {
        amount: formatAmountWithTrailing(selectionSummary?.amount),
        totalBack: formatAmountWithTrailing(selectionSummary?.totalBack),
        finalPrice: formatAmountWithTrailing(selectionSummary?.finalPrice),
      };

      return (
        <tr className={styles.totalRow}>
          <td
            className={`${styles.bodyCell} ${styles.totalRowCell} ${styles.stickyLeft} ${styles.checkboxCell}`}
            style={{
              minWidth: `${SELECTION_COLUMN_WIDTH}px`,
              width: `${SELECTION_COLUMN_WIDTH}px`,
            }}
            title={totalSelectionCount > 0 ? `${totalSelectionCount} selected` : undefined}
          >
            <span className={styles.totalRowLeadLabel}>TOTAL</span>
          </td>
          {columns.map((column) => {
            if (column.id === ACTIONS_COLUMN_ID) {
              return (
                <td
                  key={column.id}
                  className={`${styles.bodyCell} ${styles.totalRowCell} ${styles.stickyRight}`}
                  style={{
                    minWidth: `${ACTIONS_COLUMN_WIDTH}px`,
                    width: `${ACTIONS_COLUMN_WIDTH}px`,
                  }}
                  aria-hidden="true"
                />
              );
            }

            const value = formattedTotals[column.id];
            const alignClass =
              column.align === 'right'
                ? styles.cellAlignRight
                : column.align === 'center'
                ? styles.cellAlignCenter
                : '';
            const hiddenClass = column.hidden && isColumnReorderMode ? styles.bodyCellHidden : '';
            const cellClassName = `${styles.bodyCell} ${styles.totalRowCell} ${alignClass} ${hiddenClass}`.trim();

            return (
              <td
                key={column.id}
                className={cellClassName}
                style={{
                  minWidth: `${column.minWidth ?? column.width ?? 120}px`,
                  width: `${column.width ?? column.minWidth ?? 120}px`,
                }}
                aria-hidden={column.hidden && isColumnReorderMode ? 'true' : undefined}
              >
                {value ? (
                  <span
                    className={
                      column.id === 'amount'
                        ? `${styles.totalRowValue} ${styles.totalRowAmount}`
                        : styles.totalRowValue
                    }
                  >
                    {value}
                  </span>
                ) : null}
              </td>
            );
          })}
        </tr>
      );
    },
    [
      selectionSummary?.amount,
      selectionSummary?.finalPrice,
      selectionSummary?.totalBack,
      shouldShowTotals,
      totalSelectionCount,
      isColumnReorderMode,
    ],
  );

  return (
    <TableBase
      columns={combinedColumns}
      rows={transactions}
      selectable
      selectedRowIds={selectedIds}
      onSelectionChange={onSelectionChange}
      pagination={paginationContent}
      showHiddenColumns={isColumnReorderMode}
      isColumnReorderMode={isColumnReorderMode}
      onColumnOrderChange={onColumnOrderChange}
      fontScale={fontScale}
      sortState={sortState}
      onSortChange={onSortChange}
      renderFooter={renderFooterRow}
    />
  );
}
