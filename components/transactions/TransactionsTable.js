import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import {
  FiChevronLeft,
  FiChevronRight,
  FiColumns,
  FiEdit2,
  FiMoreHorizontal,
  FiTrash2,
} from 'react-icons/fi';

import styles from '../../styles/TransactionsHistory.module.css';

const numberFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatCurrency(value) {
  const numeric = Number(value ?? 0);
  if (Number.isNaN(numeric)) {
    return '0.00';
  }
  return numberFormatter.format(numeric);
}

function formatPercent(value) {
  if (value === undefined || value === null) {
    return '0%';
  }
  return `${Number(value).toFixed(2).replace(/\.00$/, '')}%`;
}

const COLUMN_DEFINITIONS = [
  {
    id: 'id',
    label: 'ID',
    minWidth: 180,
    accessor: (txn) => txn.id,
    defaultVisible: false,
  },
  {
    id: 'date',
    label: 'Date',
    minWidth: 120,
    accessor: (txn) => txn.date,
  },
  {
    id: 'type',
    label: 'Type',
    minWidth: 132,
    accessor: (txn) => txn.type,
    render: (txn, classes) => (
      <span className={classes}>{txn.type}</span>
    ),
  },
  {
    id: 'account',
    label: 'Account',
    minWidth: 182,
    accessor: (txn) => txn.account,
  },
  {
    id: 'shop',
    label: 'Shop',
    minWidth: 180,
    accessor: (txn) => txn.shop,
  },
  {
    id: 'notes',
    label: 'Notes',
    minWidth: 240,
    accessor: (txn) => txn.notes,
    render: (txn) => (
      <div className={styles.noteWrapper}>
        <span>{txn.notes}</span>
        <div className={styles.noteText}>{txn.id}</div>
      </div>
    ),
  },
  {
    id: 'amount',
    label: 'Amount',
    minWidth: 140,
    accessor: (txn) => formatCurrency(txn.amount),
  },
  {
    id: 'percentBack',
    label: '% Back',
    minWidth: 120,
    accessor: (txn) => formatPercent(txn.percentBack),
  },
  {
    id: 'fixedBack',
    label: 'Fix Back',
    minWidth: 140,
    accessor: (txn) => formatCurrency(txn.fixedBack),
  },
  {
    id: 'totalBack',
    label: 'Total Back',
    minWidth: 150,
    accessor: (txn) => formatCurrency(txn.totalBack),
  },
  {
    id: 'finalPrice',
    label: 'Final Price',
    minWidth: 160,
    accessor: (txn) => formatCurrency(txn.finalPrice),
  },
  {
    id: 'debtTag',
    label: 'Debt Tag',
    minWidth: 160,
    accessor: (txn) => txn.debtTag,
    defaultVisible: false,
  },
  {
    id: 'cycleTag',
    label: 'Cycle Tag',
    minWidth: 150,
    accessor: (txn) => txn.cycleTag,
    defaultVisible: false,
  },
  {
    id: 'category',
    label: 'Category',
    minWidth: 150,
    accessor: (txn) => txn.category,
  },
  {
    id: 'linkedTxn',
    label: 'Linked TXN',
    minWidth: 160,
    accessor: (txn) => txn.linkedTxn,
    defaultVisible: false,
  },
  {
    id: 'owner',
    label: 'Owner',
    minWidth: 130,
    accessor: (txn) => txn.owner,
  },
];

const getDefaultColumns = () =>
  COLUMN_DEFINITIONS.map((column) => ({
    ...column,
    width: column.minWidth,
    visible: column.defaultVisible !== false,
  }));

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
  const [pageSize, setPageSize] = useState(10);
  const [pageIndex, setPageIndex] = useState(0);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [columnConfig, setColumnConfig] = useState(() => getDefaultColumns());

  const visibleColumns = useMemo(
    () => columnConfig.filter((column) => column.visible),
    [columnConfig],
  );

  const paginatedTransactions = useMemo(() => {
    const start = pageIndex * pageSize;
    return transactions.slice(start, start + pageSize);
  }, [transactions, pageIndex, pageSize]);

  const totalPages = Math.max(1, Math.ceil(transactions.length / pageSize));

  useEffect(() => {
    if (pageIndex > totalPages - 1) {
      setPageIndex(totalPages - 1);
    }
  }, [totalPages, pageIndex]);

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  const handleDeselectAll = () => {
    onSelectAll(false);
  };

  const handlePageSizeChange = (event) => {
    const nextSize = Number(event.target.value);
    setPageIndex(0);
    setPageSize(nextSize);
  };

  const handlePrevPage = () => {
    setPageIndex((current) => Math.max(0, current - 1));
  };

  const handleNextPage = () => {
    setPageIndex((current) => Math.min(totalPages - 1, current + 1));
  };

  const handleApplyColumns = (updatedColumns) => {
    setColumnConfig(updatedColumns);
    setIsCustomizerOpen(false);
  };

  const handleResetColumns = () => {
    setColumnConfig(getDefaultColumns());
  };

  const renderCellContent = (column, txn) => {
    if (column.render) {
      if (column.id === 'type') {
        const pillClass =
          txn.type === 'Income'
            ? `${styles.pill} ${styles.pillIncome}`
            : `${styles.pill} ${styles.pillExpense}`;
        return column.render(txn, pillClass);
      }
      return column.render(txn);
    }

    const value = column.accessor(txn);
    return value ?? '—';
  };

  const shouldShowCalculation = (txn) => {
    const percentValue = Number(txn.percentBack ?? 0);
    const fixedValue = Number(txn.fixedBack ?? 0);
    return percentValue !== 0 && !Number.isNaN(percentValue) && fixedValue !== 0 && !Number.isNaN(fixedValue);
  };

  const buildCalculationText = (txn) => {
    const baseAmount = formatCurrency(txn.amount).replace(/\.00$/, '');
    const percentValue = formatPercent(txn.percentBack);
    const fixedValue = formatCurrency(txn.fixedBack).replace(/\.00$/, '');
    return `${baseAmount}*${percentValue} + ${fixedValue}`;
  };

  const hasRows = transactions.length > 0;
  const pageStart = hasRows ? pageIndex * pageSize + 1 : 0;
  const pageEnd = hasRows ? pageIndex * pageSize + paginatedTransactions.length : 0;

  return (
    <section className={styles.tableCard} aria-label="Transactions history table">
      <div className={styles.tableHeaderBar}>
        <div className={styles.selectionStatusBar}>
          <span>
            {selectionSummary.count > 0
              ? `${selectionSummary.count} selected`
              : 'No transactions selected'}
          </span>
          {selectionSummary.count > 0 ? (
            <button type="button" className={styles.secondaryButton} onClick={handleDeselectAll}>
              Deselect All
            </button>
          ) : null}
        </div>
        <button
          type="button"
          className={styles.customizeTrigger}
          onClick={() => setIsCustomizerOpen(true)}
        >
          <FiColumns aria-hidden />
          Customize Columns
        </button>
      </div>

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
              {visibleColumns.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  className={styles.headerCell}
                  style={{ minWidth: `${column.width}px`, width: `${column.width}px` }}
                >
                  {column.label}
                </th>
              ))}
              <th
                scope="col"
                className={`${styles.headerCell} ${styles.stickyRight} ${styles.actionsCell}`}
                style={{ minWidth: '120px', width: '120px' }}
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
              paginatedTransactions.map((txn) => {
                const isSelected = selectionSet.has(txn.id);
                const rowClass = `${styles.row} ${isSelected ? styles.rowSelected : ''}`;

                return (
                  <Fragment key={txn.id}>
                    <tr className={rowClass} data-testid={`transaction-row-${txn.id}`}>
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
                      {visibleColumns.map((column) => (
                        <td
                          key={column.id}
                          className={styles.cell}
                          style={{ minWidth: `${column.width}px`, width: `${column.width}px` }}
                        >
                          {renderCellContent(column, txn)}
                        </td>
                      ))}
                      <td
                        className={`${styles.cell} ${styles.actionsCell} ${styles.stickyRight}`}
                        style={{ minWidth: '120px', width: '120px' }}
                        data-testid={`transaction-actions-${txn.id}`}
                      >
                        <div className={styles.actionsGroup}>
                          <button
                            type="button"
                            className={styles.iconButtonMinimal}
                            onClick={() => onOpenAdvanced({ mode: 'edit', transaction: txn })}
                            data-testid={`transaction-edit-${txn.id}`}
                            aria-label={`Edit ${txn.id}`}
                            title="Edit"
                          >
                            <FiEdit2 aria-hidden />
                          </button>
                          <button
                            type="button"
                            className={`${styles.iconButtonMinimal} ${styles.dangerButton}`}
                            onClick={() => onOpenAdvanced({ mode: 'delete', transaction: txn })}
                            data-testid={`transaction-delete-${txn.id}`}
                            aria-label={`Delete ${txn.id}`}
                            title="Delete"
                          >
                            <FiTrash2 aria-hidden />
                          </button>
                          <button
                            type="button"
                            className={styles.advancedButton}
                            onClick={() => onOpenAdvanced({ mode: 'advanced', transaction: txn })}
                            data-testid={`transaction-advanced-${txn.id}`}
                            aria-label={`Open advanced options for ${txn.id}`}
                            title="More actions"
                          >
                            <FiMoreHorizontal aria-hidden />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {shouldShowCalculation(txn) &&
                    visibleColumns.some((column) => column.id === 'totalBack') ? (
                      <tr className={styles.calculationRow}>
                        <td className={`${styles.cell} ${styles.checkboxCell} ${styles.stickyLeft}`} />
                        {visibleColumns.map((column) => (
                          <td
                            key={`calc-${column.id}`}
                            className={`${styles.cell} ${
                              column.id === 'totalBack' ? styles.calculationCell : styles.blankCell
                            }`}
                            style={{ minWidth: `${column.width}px`, width: `${column.width}px` }}
                          >
                            {column.id === 'totalBack' ? buildCalculationText(txn) : ''}
                          </td>
                        ))}
                        <td className={`${styles.cell} ${styles.actionsCell} ${styles.stickyRight}`} />
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.paginationBar}>
        <div>
          Rows {pageStart}-{pageEnd} of {transactions.length}
        </div>
        <div className={styles.paginationControls}>
          <label className={styles.paginationLabel}>
            Rows per page
            <select value={pageSize} onChange={handlePageSizeChange}>
              {[5, 10, 20, 30].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className={styles.paginationButton}
            onClick={handlePrevPage}
            disabled={pageIndex === 0}
            aria-label="Previous page"
          >
            <FiChevronLeft aria-hidden />
          </button>
          <span>
            Page {totalPages === 0 ? 0 : pageIndex + 1} of {totalPages}
          </span>
          <button
            type="button"
            className={styles.paginationButton}
            onClick={handleNextPage}
            disabled={pageIndex >= totalPages - 1}
            aria-label="Next page"
          >
            <FiChevronRight aria-hidden />
          </button>
        </div>
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

      {isCustomizerOpen ? (
        <ColumnCustomizer
          columns={columnConfig}
          defaultColumns={getDefaultColumns()}
          onClose={() => setIsCustomizerOpen(false)}
          onApply={handleApplyColumns}
          onReset={(nextColumns) => {
            setColumnConfig(nextColumns);
          }}
        />
      ) : null}
    </section>
  );
}

function ColumnCustomizer({ columns, defaultColumns, onClose, onApply, onReset }) {
  const [draftColumns, setDraftColumns] = useState(columns);
  const [draggedId, setDraggedId] = useState(null);

  useEffect(() => {
    setDraftColumns(columns);
  }, [columns]);

  const handleVisibilityChange = (columnId) => {
    setDraftColumns((current) => {
      const currentVisible = current.filter((column) => column.visible).length;
      return current.map((column) => {
        if (column.id !== columnId) {
          return column;
        }
        if (column.visible && currentVisible <= 1) {
          return column;
        }
        return {
          ...column,
          visible: !column.visible,
        };
      });
    });
  };

  const handleWidthChange = (columnId, width) => {
    const numeric = Number(width);
    setDraftColumns((current) =>
      current.map((column) =>
        column.id === columnId
          ? {
              ...column,
              width: Number.isNaN(numeric) || numeric <= 60 ? column.minWidth : numeric,
            }
          : column,
      ),
    );
  };

  const handleDragStart = (event, columnId) => {
    setDraggedId(columnId);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', columnId);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (event, targetId) => {
    event.preventDefault();
    const sourceId = draggedId ?? event.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetId) {
      setDraggedId(null);
      return;
    }

    setDraftColumns((current) => {
      const sourceIndex = current.findIndex((column) => column.id === sourceId);
      const targetIndex = current.findIndex((column) => column.id === targetId);
      if (sourceIndex === -1 || targetIndex === -1) {
        return current;
      }

      const next = [...current];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });

    setDraggedId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  const handleApply = () => {
    onApply(draftColumns);
  };

  const handleReset = () => {
    setDraftColumns(defaultColumns);
    onReset(defaultColumns);
  };

  return (
    <div className={styles.customizePanel} role="dialog" aria-modal="false">
      <div className={styles.customizeHeader}>
        <h3>Customize Columns</h3>
        <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Close customize columns">
          ×
        </button>
      </div>
      <div className={styles.customizeBody}>
        <p className={styles.customizeHint}>Drag to reorder, toggle visibility, and adjust widths in pixels.</p>
        <ul className={styles.columnToggleList}>
          {draftColumns.map((column) => (
            <li
              key={column.id}
              className={styles.columnToggleItem}
              draggable
              onDragStart={(event) => handleDragStart(event, column.id)}
              onDragOver={handleDragOver}
              onDrop={(event) => handleDrop(event, column.id)}
              onDragEnd={handleDragEnd}
            >
              <span className={styles.columnDragHandle} aria-hidden>
                ⋮⋮
              </span>
              <label className={styles.columnLabel}>
                <input
                  type="checkbox"
                  checked={column.visible}
                  onChange={() => handleVisibilityChange(column.id)}
                />
                {column.label}
              </label>
              <input
                type="number"
                min={60}
                value={column.width}
                onChange={(event) => handleWidthChange(column.id, event.target.value)}
                className={styles.columnWidthInput}
                aria-label={`${column.label} column width`}
              />
            </li>
          ))}
        </ul>
      </div>
      <div className={styles.customizeFooter}>
        <button type="button" className={styles.secondaryButton} onClick={handleReset}>
          Reset
        </button>
        <button type="button" className={styles.modalApply} onClick={handleApply}>
          Apply
        </button>
      </div>
    </div>
  );
}
