import { useEffect, useMemo, useState } from 'react';
import { FiXCircle } from 'react-icons/fi';

import AppLayout from '../../components/AppLayout';
import { CustomizeColumnsModal } from '../../components/transactions/CustomizeColumnsModal';
import { TransactionsFilterModal } from '../../components/transactions/TransactionsFilterModal';
import { TransactionsTable } from '../../components/transactions/TransactionsTable';
import { TransactionsToolbar } from '../../components/transactions/TransactionsToolbar';
import { TRANSACTION_COLUMN_DEFINITIONS, getDefaultColumnState } from '../../components/transactions/transactionColumns';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { formatAmountWithTrailing } from '../../lib/numberFormat';
import { fetchMockTransactions } from '../../lib/mockTransactions';
import styles from '../../styles/TransactionsHistory.module.css';

const INITIAL_FILTERS = {
  person: 'all',
  category: 'all',
  year: 'all',
  month: 'all',
};

const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'long' });
const PAGE_SIZE_OPTIONS = [5, 10, 20, 30];

export default function TransactionsHistoryPage() {
  const { isAuthenticated, isLoading } = useRequireAuth();
  const [transactions, setTransactions] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [query, setQuery] = useState('');
  const [previousQuery, setPreviousQuery] = useState('');
  const [appliedFilters, setAppliedFilters] = useState(INITIAL_FILTERS);
  const [draftFilters, setDraftFilters] = useState(INITIAL_FILTERS);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [advancedPanel, setAdvancedPanel] = useState(null);
  const [columnState, setColumnState] = useState(() => getDefaultColumnState());
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[1] ?? PAGE_SIZE_OPTIONS[0]);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let isCancelled = false;
    setIsFetching(true);

    fetchMockTransactions()
      .then((data) => {
        if (isCancelled) {
          return;
        }

        const normalized = data.map((txn) => {
          const dateValue = new Date(`${txn.date}T00:00:00`);
          const isValidDate = !Number.isNaN(dateValue.getTime());

          return {
            ...txn,
            year: isValidDate ? String(dateValue.getFullYear()) : '',
            month: isValidDate ? monthFormatter.format(dateValue) : '',
          };
        });

        setTransactions(normalized);
        setSelectedIds([]);
      })
      .finally(() => {
        if (!isCancelled) {
          setIsFetching(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [isAuthenticated]);

  const definitionLookup = useMemo(
    () =>
      new Map(
        TRANSACTION_COLUMN_DEFINITIONS.map((definition) => [definition.id, definition]),
      ),
    [],
  );

  const orderedColumns = useMemo(
    () =>
      columnState
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((state) => {
          const definition = definitionLookup.get(state.id) ?? {};
          const minWidth = definition.minWidth ?? 120;
          const defaultVisible = definition.defaultVisible !== false;
          const normalizedWidth = Math.max(
            state.width ?? definition.defaultWidth ?? minWidth,
            minWidth,
          );

          return {
            ...definition,
            ...state,
            width: normalizedWidth,
            visible: state.visible ?? defaultVisible,
          };
        }),
    [columnState, definitionLookup],
  );

  const visibleColumns = useMemo(
    () => orderedColumns.filter((column) => column.visible),
    [orderedColumns],
  );

  const filterOptions = useMemo(() => {
    const people = new Set();
    const categories = new Set();
    const years = new Set();
    const months = new Set();

    transactions.forEach((txn) => {
      if (txn.owner) {
        people.add(txn.owner);
      }
      if (txn.category) {
        categories.add(txn.category);
      }
      if (txn.year) {
        years.add(txn.year);
      }
      if (txn.month) {
        months.add(txn.month);
      }
    });

    return {
      people: Array.from(people).sort(),
      categories: Array.from(categories).sort(),
      years: Array.from(years).sort(),
      months: Array.from(months).sort(
        (a, b) => new Date(`${a} 1, 2000`) - new Date(`${b} 1, 2000`),
      ),
    };
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    const loweredQuery = query.trim().toLowerCase();
    const requiresSearch = loweredQuery.length > 0;

    return transactions.filter((txn) => {
      if (appliedFilters.person !== 'all' && txn.owner !== appliedFilters.person) {
        return false;
      }
      if (appliedFilters.category !== 'all' && txn.category !== appliedFilters.category) {
        return false;
      }
      if (appliedFilters.year !== 'all' && txn.year !== appliedFilters.year) {
        return false;
      }
      if (appliedFilters.month !== 'all' && txn.month !== appliedFilters.month) {
        return false;
      }

      if (!requiresSearch) {
        return true;
      }

      const searchable = [
        txn.id,
        txn.notes,
        txn.shop,
        txn.account,
        txn.category,
        txn.owner,
        txn.debtTag,
        txn.cycleTag,
      ]
        .join(' ')
        .toLowerCase();

      return searchable.includes(loweredQuery);
    });
  }, [transactions, appliedFilters, query]);

  useEffect(() => {
    const filteredIds = new Set(filteredTransactions.map((txn) => txn.id));
    setSelectedIds((prev) => {
      const next = prev.filter((id) => filteredIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [filteredTransactions]);

  useEffect(() => {
    if (selectedIds.length === 0 && showSelectedOnly) {
      setShowSelectedOnly(false);
    }
  }, [selectedIds, showSelectedOnly]);

  const selectedLookup = useMemo(() => new Set(selectedIds), [selectedIds]);

  const effectiveTransactions = useMemo(() => {
    if (!showSelectedOnly) {
      return filteredTransactions;
    }

    return filteredTransactions.filter((txn) => selectedLookup.has(txn.id));
  }, [filteredTransactions, showSelectedOnly, selectedLookup]);

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize, filteredTransactions, showSelectedOnly]);

  const totalPages = Math.max(1, Math.ceil(effectiveTransactions.length / pageSize));

  useEffect(() => {
    setCurrentPage((prev) => {
      if (prev > totalPages) {
        return totalPages;
      }
      return prev;
    });
  }, [totalPages]);

  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return effectiveTransactions.slice(start, start + pageSize);
  }, [effectiveTransactions, currentPage, pageSize]);

  const selectionSummary = useMemo(() => {
    if (selectedIds.length === 0) {
      return { count: 0, amount: 0, finalPrice: 0, totalBack: 0 };
    }

    return filteredTransactions.reduce(
      (acc, txn) => {
        if (!selectedLookup.has(txn.id)) {
          return acc;
        }

        acc.count += 1;
        acc.amount += txn.amount ?? 0;
        acc.finalPrice += txn.finalPrice ?? 0;
        acc.totalBack += txn.totalBack ?? 0;
        return acc;
      },
      { count: 0, amount: 0, finalPrice: 0, totalBack: 0 },
    );
  }, [filteredTransactions, selectedIds, selectedLookup]);

  const filterCount = useMemo(
    () => Object.values(appliedFilters).filter((value) => value !== 'all').length,
    [appliedFilters],
  );

  const handleSelectRow = (id, checked) => {
    setSelectedIds((prev) => {
      if (checked) {
        if (prev.includes(id)) {
          return prev;
        }
        return [...prev, id];
      }
      return prev.filter((item) => item !== id);
    });
  };

  const handleSelectAll = (checked) => {
    if (!checked) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(filteredTransactions.map((txn) => txn.id));
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  const handleToggleShowSelected = () => {
    if (showSelectedOnly) {
      setShowSelectedOnly(false);
      return;
    }

    if (selectedIds.length === 0) {
      return;
    }

    setShowSelectedOnly(true);
  };

  const handleClearQuery = () => {
    if (!query) {
      return;
    }
    setPreviousQuery(query);
    setQuery('');
  };

  const handleRestoreQuery = (value) => {
    setQuery(value);
    setPreviousQuery('');
  };

  const handleOpenFilters = () => {
    setDraftFilters(appliedFilters);
    setIsFilterOpen(true);
  };

  const handleFilterChange = (field, value) => {
    setDraftFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFilterReset = () => {
    setDraftFilters(INITIAL_FILTERS);
    setAppliedFilters(INITIAL_FILTERS);
    setIsFilterOpen(false);
  };

  const handleFilterApply = () => {
    setAppliedFilters(draftFilters);
    setIsFilterOpen(false);
  };

  const handleAddTransaction = () => {
    setAdvancedPanel({
      mode: 'create',
      transaction: null,
    });
  };

  const handleAdvanced = (payload) => {
    setAdvancedPanel(payload);
  };

  const handleCloseAdvanced = () => {
    setAdvancedPanel(null);
  };

  const handleApplyColumns = (columns) => {
    setColumnState(
      columns.map((column, index) => {
        const definition = definitionLookup.get(column.id) ?? {};
        const minWidth = definition.minWidth ?? 120;
        const defaultVisible = definition.defaultVisible !== false;
        const normalizedWidth = Math.max(
          Number(column.width) || definition.defaultWidth || minWidth,
          minWidth,
        );

        return {
          id: column.id,
          width: normalizedWidth,
          visible: column.visible ?? defaultVisible,
          order: index,
          format: column.format ?? definition.defaultFormat,
        };
      }),
    );
    setIsCustomizeOpen(false);
  };

  const handleResetColumns = () => {
    setColumnState(getDefaultColumnState());
    setIsCustomizeOpen(false);
  };

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <AppLayout
      title="Transactions History"
      subtitle="Monitor every inflow, cashback, debt movement, and adjustment inside Money Flow."
    >
      <div className={styles.screen}>
        <TransactionsToolbar
          query={query}
          onQueryChange={setQuery}
          onClearQuery={handleClearQuery}
          previousQuery={previousQuery}
          onRestoreQuery={handleRestoreQuery}
          onFilterClick={handleOpenFilters}
          filterCount={filterCount}
          onAddTransaction={handleAddTransaction}
          onCustomizeColumns={() => setIsCustomizeOpen(true)}
        />

        {isFetching ? (
          <div className={styles.tableCard} data-testid="transactions-loading">
            <div className={styles.emptyState}>Loading transactions...</div>
          </div>
        ) : (
          <TransactionsTable
            transactions={paginatedTransactions}
            selectedIds={selectedIds}
            onSelectRow={handleSelectRow}
            onSelectAll={handleSelectAll}
            selectionSummary={selectionSummary}
            onOpenAdvanced={handleAdvanced}
            visibleColumns={visibleColumns}
            onDeselectAll={handleDeselectAll}
            onToggleShowSelected={handleToggleShowSelected}
            isShowingSelectedOnly={showSelectedOnly}
            pagination={{
              pageSize,
              pageSizeOptions: PAGE_SIZE_OPTIONS,
              currentPage,
              totalPages,
              onPageSizeChange: (value) =>
                setPageSize(PAGE_SIZE_OPTIONS.includes(value) ? value : PAGE_SIZE_OPTIONS[0]),
              onPageChange: (page) =>
                setCurrentPage((prev) => {
                  const next = Math.min(Math.max(page, 1), totalPages);
                  return next;
                }),
            }}
          />
        )}

      </div>

      <TransactionsFilterModal
        isOpen={isFilterOpen}
        filters={draftFilters}
        onChange={handleFilterChange}
        onClose={() => setIsFilterOpen(false)}
        onReset={handleFilterReset}
        onApply={handleFilterApply}
        options={filterOptions}
      />

      <CustomizeColumnsModal
        isOpen={isCustomizeOpen}
        columns={orderedColumns}
        onClose={() => setIsCustomizeOpen(false)}
        onApply={handleApplyColumns}
        onReset={handleResetColumns}
      />

      {advancedPanel ? (
        <div
          className={styles.advancedOverlay}
          data-testid="transactions-advanced-modal"
          role="dialog"
          aria-modal="true"
        >
          <div className={styles.advancedPanel}>
            <div className={styles.advancedHeader}>
              <h3 className={styles.advancedTitle}>
                {advancedPanel.mode === 'create'
                  ? 'Quick Create Transaction'
                  : advancedPanel.mode === 'edit'
                  ? `Edit ${advancedPanel.transaction?.id ?? ''}`
                  : advancedPanel.mode === 'delete'
                  ? `Delete ${advancedPanel.transaction?.id ?? ''}`
                  : `Advanced options for ${advancedPanel.transaction?.id ?? ''}`}
              </h3>
              <button
                type="button"
                className={styles.iconButton}
                onClick={handleCloseAdvanced}
                data-testid="transactions-advanced-close"
                aria-label="Close advanced options"
              >
                <FiXCircle aria-hidden />
              </button>
            </div>

            {advancedPanel.mode === 'create' ? (
              <div className={styles.modalBody}>
                <div className={styles.modalField}>
                  <p className={styles.modalLabel}>Status</p>
                  <p className={styles.advancedValue}>
                    Use this space to configure quick entry templates. Builder is coming soon.
                  </p>
                </div>
                <div className={styles.modalField}>
                  <p className={styles.modalLabel}>Next step</p>
                  <p className={styles.advancedValue}>
                    Connect to your preferred batch input to populate a draft transaction with preset
                    Cashback and Debt parameters.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className={styles.modalBody}>
                  <div className={styles.advancedSection}>
                    <span className={styles.advancedLabel}>Owner</span>
                    <span className={styles.advancedValue}>
                      {advancedPanel.transaction?.owner ?? 'Unassigned'}
                    </span>
                  </div>
                  <div className={styles.advancedSection}>
                    <span className={styles.advancedLabel}>Account</span>
                    <span className={styles.advancedValue}>
                      {advancedPanel.transaction?.account ?? 'Not available'}
                    </span>
                  </div>
                  <div className={styles.advancedSection}>
                    <span className={styles.advancedLabel}>Notes</span>
                    <span className={styles.advancedValue}>
                      {advancedPanel.transaction?.notes ?? '—'}
                    </span>
                  </div>
                </div>

                <div className={styles.metricsGrid}>
                  <div className={styles.metricTile}>
                    <span className={styles.metricLabel}>Amount</span>
                    <span className={styles.metricValue}>
                      {formatAmountWithTrailing(advancedPanel.transaction?.amount)}
                    </span>
                  </div>
                  <div className={styles.metricTile}>
                    <span className={styles.metricLabel}>Total Back</span>
                    <span className={styles.metricValue}>
                      {formatAmountWithTrailing(advancedPanel.transaction?.totalBack)}
                    </span>
                  </div>
                  <div className={styles.metricTile}>
                    <span className={styles.metricLabel}>Final Price</span>
                    <span className={styles.metricValue}>
                      {formatAmountWithTrailing(advancedPanel.transaction?.finalPrice)}
                    </span>
                  </div>
                </div>

                <div className={styles.modalFooter}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={handleCloseAdvanced}
                    data-testid="transactions-advanced-dismiss"
                  >
                    Close
                  </button>
                  {advancedPanel.mode === 'delete' ? (
                    <button
                      type="button"
                      className={`${styles.primaryButton} ${styles.wrap}`}
                      data-testid="transactions-advanced-confirm-delete"
                    >
                      Confirm delete
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={styles.primaryButton}
                      data-testid="transactions-advanced-start-edit"
                    >
                      Launch editor
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </AppLayout>
  );
}
