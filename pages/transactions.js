import { useEffect, useMemo, useState } from 'react';

import AppLayout from '../components/AppLayout';
import { useRequireAuth } from '../hooks/useRequireAuth';

import styles from '../styles/TransactionsPage.module.css';

const DEFAULT_VISIBLE_COLUMNS = [
  'transaction_id',
  'account_id',
  'person_id',
  'type',
  'category_id',
  'amount',
  'fee',
  'occurred_on',
  'notes',
  'shop_id',
];

const ADDITIONAL_COLUMNS = [
  'status',
  'subscription_member_id',
  'linked_txn_id',
  'created_at',
  'updated_at',
];

const DEFAULT_COLUMN_ORDER = [...DEFAULT_VISIBLE_COLUMNS, ...ADDITIONAL_COLUMNS];

const DEFAULT_COLUMN_WIDTHS = {
  transaction_id: 200,
  account_id: 180,
  person_id: 180,
  type: 150,
  category_id: 180,
  amount: 160,
  fee: 150,
  occurred_on: 160,
  notes: 260,
  shop_id: 180,
  status: 150,
  subscription_member_id: 220,
  linked_txn_id: 220,
  created_at: 220,
  updated_at: 220,
};

const MIN_COLUMN_WIDTH = 140;
const MAX_COLUMN_WIDTH = 360;

const COLUMN_LABELS = {
  transaction_id: 'Transaction ID',
  account_id: 'Account ID',
  person_id: 'Person ID',
  type: 'Type',
  category_id: 'Category ID',
  amount: 'Amount',
  fee: 'Fee',
  occurred_on: 'Occurred On',
  notes: 'Notes',
  shop_id: 'Shop ID',
  status: 'Status',
  subscription_member_id: 'Subscription Member ID',
  linked_txn_id: 'Linked Transaction ID',
  created_at: 'Created At',
  updated_at: 'Updated At',
};

const STATUS_CLASS_MAP = {
  active: 'statusApproved',
  approved: 'statusApproved',
  settled: 'statusApproved',
  pending: 'statusPending',
  review: 'statusPending',
  declined: 'statusDeclined',
  cancelled: 'statusDeclined',
  failed: 'statusDeclined',
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const formatLabel = (column) => {
  if (COLUMN_LABELS[column]) {
    return COLUMN_LABELS[column];
  }
  return column
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
};

const formatValue = (column, value) => {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  if (column === 'amount' || column === 'fee') {
    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) {
      return value;
    }
    return currencyFormatter.format(numericValue);
  }
  return String(value);
};

const collectColumns = (records) => {
  const discovered = new Set(DEFAULT_COLUMN_ORDER);
  records.forEach((record) => {
    Object.keys(record).forEach((key) => {
      if (key === 'cashback_movements') {
        return;
      }
      discovered.add(key);
    });
  });
  return Array.from(discovered);
};

const ensureColumnWidths = (columns, widths) => {
  const next = { ...widths };
  columns.forEach((column) => {
    if (next[column] == null) {
      if (column in DEFAULT_COLUMN_WIDTHS) {
        next[column] = DEFAULT_COLUMN_WIDTHS[column];
        return;
      }
      if (column.endsWith('_id')) {
        next[column] = 200;
        return;
      }
      next[column] = 180;
    }
  });
  return next;
};

const sortColumns = (columns, orderReference) =>
  [...columns].sort((a, b) => orderReference.indexOf(a) - orderReference.indexOf(b));

export default function TransactionsPage() {
  const { isAuthenticated, isLoading } = useRequireAuth();
  const [transactions, setTransactions] = useState([]);
  const [allColumns, setAllColumns] = useState(DEFAULT_COLUMN_ORDER);
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_VISIBLE_COLUMNS);
  const [columnWidths, setColumnWidths] = useState(DEFAULT_COLUMN_WIDTHS);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      return undefined;
    }

    const controller = new AbortController();
    let cancelled = false;

    const loadTransactions = async () => {
      setIsLoadingData(true);
      setError(null);
      try {
        const response = await fetch('/api/transactions', {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error('Failed to fetch transactions');
        }
        const payload = await response.json();
        if (cancelled) {
          return;
        }
        const normalized = Array.isArray(payload) ? payload : [];
        const columnsFromData = collectColumns(normalized);
        setTransactions(normalized);
        setAllColumns(columnsFromData);
        setColumnWidths((previous) => ensureColumnWidths(columnsFromData, previous));
        setVisibleColumns((previous) => {
          const merged = previous.filter((column) => columnsFromData.includes(column));
          const ensureDefaults = merged.length > 0 ? merged : DEFAULT_VISIBLE_COLUMNS;
          return sortColumns(Array.from(new Set(ensureDefaults)), columnsFromData);
        });
      } catch (requestError) {
        if (cancelled || requestError.name === 'AbortError') {
          return;
        }
        console.error('[transactions] fetch failed', requestError);
        setError('Unable to load transactions. Please try again.');
      } finally {
        if (!cancelled) {
          setIsLoadingData(false);
        }
      }
    };

    loadTransactions();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [isAuthenticated]);

  const orderedColumns = useMemo(() => [...allColumns], [allColumns]);

  const filterableColumns = useMemo(
    () => orderedColumns.filter((column) => column !== 'cashback_movements'),
    [orderedColumns],
  );

  const typeOptions = useMemo(() => {
    const values = new Set();
    transactions.forEach((transaction) => {
      if (transaction.type) {
        values.add(transaction.type);
      }
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [transactions]);

  const statusOptions = useMemo(() => {
    const values = new Set();
    transactions.forEach((transaction) => {
      if (transaction.status) {
        values.add(transaction.status);
      }
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return transactions.filter((transaction) => {
      const matchesType =
        typeFilter === 'all' || (transaction.type ?? '').toLowerCase() === typeFilter.toLowerCase();
      const matchesStatus =
        statusFilter === 'all' || (transaction.status ?? '').toLowerCase() === statusFilter.toLowerCase();

      if (!matchesType || !matchesStatus) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return filterableColumns.some((column) => {
        const value = transaction[column];
        if (value === null || value === undefined) {
          return false;
        }
        return String(value).toLowerCase().includes(normalizedSearch);
      });
    });
  }, [transactions, searchTerm, typeFilter, statusFilter, filterableColumns]);

  const totals = useMemo(
    () => ({
      amount: filteredTransactions.reduce((sum, transaction) => {
        const value = Number(transaction.amount ?? 0);
        return Number.isNaN(value) ? sum : sum + value;
      }, 0),
      fee: filteredTransactions.reduce((sum, transaction) => {
        const value = Number(transaction.fee ?? 0);
        return Number.isNaN(value) ? sum : sum + value;
      }, 0),
    }),
    [filteredTransactions],
  );

  const handleToggleColumn = (column) => {
    setVisibleColumns((current) => {
      if (current.includes(column)) {
        if (current.length === 1) {
          return current;
        }
        return current.filter((entry) => entry !== column);
      }
      const next = [...current, column];
      return sortColumns(next, allColumns);
    });
  };

  const handleWidthChange = (column, width) => {
    const numericWidth = Number(width);
    if (Number.isNaN(numericWidth)) {
      return;
    }
    setColumnWidths((current) => ({
      ...current,
      [column]: Math.min(Math.max(numericWidth, MIN_COLUMN_WIDTH), MAX_COLUMN_WIDTH),
    }));
  };

  const handleResetColumns = () => {
    setVisibleColumns(DEFAULT_VISIBLE_COLUMNS);
    setColumnWidths(DEFAULT_COLUMN_WIDTHS);
  };

  const handleAddTransaction = () => {
    // Placeholder hook for integration with transaction creation flow.
  };

  const getStatusClassName = (status) => {
    if (!status) {
      return styles.statusBadge;
    }
    const key = status.toLowerCase();
    const mapped = STATUS_CLASS_MAP[key];
    if (!mapped) {
      return styles.statusBadge;
    }
    return `${styles.statusBadge} ${styles[mapped]}`;
  };

  if (isLoading || !isAuthenticated) {
    return null;
  }

  const hasTransactions = filteredTransactions.length > 0;

  return (
    <AppLayout
      title="Transactions"
      subtitle="Review the latest ledger entries synced from the finance backend."
    >
      <div className={styles.page}>
        <section className={styles.controlsBar} aria-label="Table controls">
          <div className={styles.controlsGroup}>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search transactions"
              className={styles.searchInput}
              aria-label="Search transactions"
            />
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className={styles.selectControl}
              aria-label="Filter by transaction type"
            >
              <option value="all">All types</option>
              {typeOptions.map((typeOption) => (
                <option key={typeOption} value={typeOption}>
                  {typeOption}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className={styles.selectControl}
              aria-label="Filter by transaction status"
            >
              <option value="all">All statuses</option>
              {statusOptions.map((statusOption) => (
                <option key={statusOption} value={statusOption}>
                  {statusOption}
                </option>
              ))}
            </select>
          </div>
          <div className={`${styles.controlsGroup} ${styles.actionButtons}`}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => setIsCustomizeOpen(true)}
            >
              Customize
            </button>
            <button type="button" className={styles.primaryButton} onClick={handleAddTransaction}>
              Add transaction
            </button>
          </div>
        </section>

        <section className={styles.tableSection}>
          <header className={styles.tableHeader}>
            <h2>Ledger entries</h2>
            <p>Columns reflect the latest backend transactions schema.</p>
          </header>
          <div className={styles.tableShell}>
            <div className={styles.tableContainer}>
              <div className={styles.tableWrapper}>
                <div
                  className={styles.tableViewport}
                  role="region"
                  aria-live="polite"
                  aria-label="Transactions ledger"
                  data-testid="transactions-table-viewport"
                >
                  <table className={styles.table}>
                    <thead
                      className={`${styles.tableHead} ${styles.stickyTop}`}
                      data-testid="transactions-table-header"
                    >
                      <tr>
                        {visibleColumns.map((column) => (
                          <th key={column} style={{ width: columnWidths[column], minWidth: columnWidths[column] }}>
                            {formatLabel(column)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody data-testid="transactions-table-body">
                      {isLoadingData && (
                        <tr>
                          <td colSpan={visibleColumns.length} className={styles.loadingState}>
                            Loading transactions…
                          </td>
                        </tr>
                    )}
                    {!isLoadingData && error && (
                      <tr>
                        <td colSpan={visibleColumns.length} className={styles.errorState}>
                          {error}
                        </td>
                      </tr>
                    )}
                    {!isLoadingData && !error && !hasTransactions && (
                      <tr>
                        <td colSpan={visibleColumns.length} className={styles.emptyState}>
                          No transactions match the current filters.
                        </td>
                      </tr>
                    )}
                    {!isLoadingData && !error &&
                      filteredTransactions.map((transaction) => (
                        <tr key={transaction.transaction_id ?? transaction.transactionId}>
                          {visibleColumns.map((column) => {
                            const value = transaction[column];
                            if (column === 'amount' || column === 'fee') {
                              const numericValue = Number(value ?? 0);
                              const amountClass =
                                Number.isNaN(numericValue) || numericValue >= 0
                                  ? styles.amountPositive
                                  : styles.amountNegative;
                              return (
                                <td
                                  key={column}
                                  style={{
                                    width: columnWidths[column],
                                    minWidth: columnWidths[column],
                                  }}
                                  className={amountClass}
                                >
                                  {formatValue(column, value)}
                                </td>
                              );
                            }
                            if (column === 'status') {
                              const statusClass = getStatusClassName(value);
                              return (
                                <td
                                  key={column}
                                  style={{
                                    width: columnWidths[column],
                                    minWidth: columnWidths[column],
                                  }}
                                >
                                  <span className={statusClass}>{formatValue(column, value)}</span>
                                </td>
                              );
                            }
                            return (
                              <td
                                key={column}
                                style={{ width: columnWidths[column], minWidth: columnWidths[column] }}
                              >
                                {formatValue(column, value)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot
                      className={`${styles.tableFoot} ${styles.stickyBottom}`}
                      data-testid="transactions-table-footer"
                    >
                      <tr>
                        {visibleColumns.map((column, index) => {
                          if (column === 'amount') {
                            return (
                              <td
                                key={column}
                                style={{ width: columnWidths[column], minWidth: columnWidths[column] }}
                              >
                                {currencyFormatter.format(totals.amount)}
                              </td>
                            );
                          }
                          if (column === 'fee') {
                            return (
                              <td
                                key={column}
                                style={{ width: columnWidths[column], minWidth: columnWidths[column] }}
                              >
                                {currencyFormatter.format(totals.fee)}
                              </td>
                            );
                          }
                          if (index === 0) {
                            return (
                              <td
                                key={column}
                                style={{ width: columnWidths[column], minWidth: columnWidths[column] }}
                              >
                                Totals
                              </td>
                            );
                          }
                          return (
                            <td
                              key={column}
                              style={{ width: columnWidths[column], minWidth: columnWidths[column] }}
                            />
                          );
                        })}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
            <div
              className={styles.customizeBackdrop}
              data-open={isCustomizeOpen}
              onClick={() => setIsCustomizeOpen(false)}
              aria-hidden={!isCustomizeOpen}
            />
            <aside
              className={styles.customizePanel}
              data-open={isCustomizeOpen}
              role="dialog"
              aria-modal={isCustomizeOpen}
              aria-hidden={!isCustomizeOpen}
              aria-label="Customize table columns"
              tabIndex={-1}
            >
              <div className={styles.customizeHeader}>
                <h3>Customize columns</h3>
                <button
                  type="button"
                  className={styles.customizeClose}
                  onClick={() => setIsCustomizeOpen(false)}
                  aria-label="Close customization"
                >
                  ×
                </button>
              </div>
              <div className={styles.customizeList}>
                {filterableColumns.map((column) => (
                  <div key={column} className={styles.customizeRow}>
                    <label htmlFor={`column-toggle-${column}`}>
                      <input
                        id={`column-toggle-${column}`}
                        type="checkbox"
                        checked={visibleColumns.includes(column)}
                        onChange={() => handleToggleColumn(column)}
                      />
                      {formatLabel(column)}
                    </label>
                    <input
                      type="range"
                      min={MIN_COLUMN_WIDTH}
                      max={MAX_COLUMN_WIDTH}
                      value={columnWidths[column] ?? MIN_COLUMN_WIDTH}
                      onChange={(event) => handleWidthChange(column, event.target.value)}
                      aria-label={`Resize ${formatLabel(column)} column`}
                    />
                  </div>
                ))}
              </div>
              <div className={styles.customizeFooter}>
                <button type="button" className={styles.resetButton} onClick={handleResetColumns}>
                  Reset
                </button>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => setIsCustomizeOpen(false)}
                >
                  Done
                </button>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
