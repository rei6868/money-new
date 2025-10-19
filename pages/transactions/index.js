import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiXCircle } from 'react-icons/fi';

import AppLayout from '../../components/AppLayout';
import { TransactionsTable } from '../../components/transactions/TransactionsTable';
import { TransactionsToolbar } from '../../components/transactions/TransactionsToolbar';
import { resolveColumnSortType } from '../../components/table/tableUtils';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { formatAmountWithTrailing } from '../../lib/numberFormat';
import styles from '../../styles/TransactionsHistory.module.css';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 30];

export default function TransactionsHistoryPage() {
  const { isAuthenticated, isLoading } = useRequireAuth();
  const [transactions, setTransactions] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [draftQuery, setDraftQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [previousQuery, setPreviousQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [advancedPanel, setAdvancedPanel] = useState(null);
  const [columnDefinitions, setColumnDefinitions] = useState([]);
  const [columnState, setColumnState] = useState([]);
  const [defaultColumnState, setDefaultColumnState] = useState([]);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[1] ?? PAGE_SIZE_OPTIONS[0]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectionSummary, setSelectionSummary] = useState({
    count: 0,
    amount: 0,
    finalPrice: 0,
    totalBack: 0,
  });
  const [sortState, setSortState] = useState({ columnId: null, direction: null });

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let isCancelled = false;

    fetch('/api/transactions/columns')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch column metadata');
        }
        return response.json();
      })
      .then((data) => {
        if (isCancelled) {
          return;
        }

        const definitions = Array.isArray(data.columns) ? data.columns : [];
        const definitionLookupLocal = new Map(definitions.map((definition) => [definition.id, definition]));
        const defaultState = Array.isArray(data.defaultState) ? data.defaultState : [];
        const normalizedState = defaultState.map((column, index) => {
          const definition = definitionLookupLocal.get(column.id) ?? {};
          const minWidth = definition.minWidth ?? 120;
          const rawWidth = column.width;
          const fallbackWidth = definition.defaultWidth ?? minWidth;
          const parsedWidth = Number(rawWidth);
          const width = Number.isFinite(parsedWidth) ? parsedWidth : fallbackWidth;

          return {
            id: column.id,
            width: Math.max(width, minWidth),
            visible: column.visible ?? definition.defaultVisible !== false,
            order: column.order ?? index,
          };
        });

        setColumnDefinitions(definitions);
        setColumnState(normalizedState);
        setDefaultColumnState(normalizedState.map((column) => ({ ...column })));
      })
      .catch((error) => {
        if (!isCancelled) {
          console.error(error);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [isAuthenticated]);

  const definitionLookup = useMemo(
    () => new Map(columnDefinitions.map((definition) => [definition.id, definition])),
    [columnDefinitions],
  );

  useEffect(() => {
    if (!isAuthenticated || columnDefinitions.length === 0) {
      return;
    }

    let isCancelled = false;
    const controller = new AbortController();
    setIsFetching(true);

    const params = new URLSearchParams();
    if (appliedQuery) {
      params.set('search', appliedQuery);
    }

    fetch(`/api/transactions?${params.toString()}`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch transactions');
        }
        return response.json();
      })
      .then((data) => {
        if (isCancelled) {
          return;
        }

        const rows = Array.isArray(data.rows) ? data.rows : [];
        setTransactions(rows);
        setSelectedIds((prev) => {
          const available = new Set(rows.map((row) => row.id));
          return prev.filter((id) => available.has(id));
        });
      })
      .catch((error) => {
        if (!isCancelled && error.name !== 'AbortError') {
          console.error(error);
          setTransactions([]);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsFetching(false);
        }
      });

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [isAuthenticated, columnDefinitions, appliedQuery]);

  const orderedColumns = useMemo(() => {
    if (columnState.length === 0) {
      return [];
    }

    return columnState
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
      });
  }, [columnState, definitionLookup]);

  const visibleColumns = useMemo(
    () => orderedColumns.filter((column) => column.visible),
    [orderedColumns],
  );

  const toggleableColumns = useMemo(
    () => orderedColumns.filter((column) => column.id !== 'notes'),
    [orderedColumns],
  );

  const toggleableVisibleCount = useMemo(
    () => toggleableColumns.filter((column) => column.visible !== false).length,
    [toggleableColumns],
  );

  const allToggleableVisible =
    toggleableColumns.length > 0 && toggleableVisibleCount === toggleableColumns.length;
  const someToggleableVisible =
    toggleableVisibleCount > 0 && toggleableVisibleCount < toggleableColumns.length;

  const sortedTransactions = useMemo(() => {
    if (!Array.isArray(transactions) || transactions.length <= 1) {
      return transactions;
    }

    if (!sortState?.columnId || !sortState.direction) {
      return transactions;
    }

    const definition = definitionLookup.get(sortState.columnId);
    const sortType = resolveColumnSortType(sortState.columnId, definition);
    const multiplier = sortState.direction === 'asc' ? 1 : -1;

    const toComparable = (row) => {
      const rawValue = row?.[sortState.columnId];
      if (rawValue === null || rawValue === undefined || rawValue === '') {
        return null;
      }

      if (sortType === 'number') {
        const numeric = Number(rawValue);
        return Number.isFinite(numeric) ? numeric : null;
      }

      if (sortType === 'date') {
        const timestamp = Date.parse(rawValue);
        return Number.isNaN(timestamp) ? null : timestamp;
      }

      return String(rawValue).toLowerCase();
    };

    const sorted = transactions.slice();
    sorted.sort((a, b) => {
      const aValue = toComparable(a);
      const bValue = toComparable(b);

      if (aValue === null && bValue === null) {
        return 0;
      }
      if (aValue === null) {
        return 1;
      }
      if (bValue === null) {
        return -1;
      }

      let result = 0;
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        if (aValue === bValue) {
          result = 0;
        } else {
          result = aValue < bValue ? -1 : 1;
        }
      } else {
        result = String(aValue).localeCompare(String(bValue), undefined, {
          sensitivity: 'base',
          numeric: sortType === 'number' || sortType === 'date',
        });
      }

      return result * multiplier;
    });

    return sorted;
  }, [transactions, sortState, definitionLookup]);

  useEffect(() => {
    const filteredIds = new Set(transactions.map((txn) => txn.id));
    setSelectedIds((prev) => {
      const next = prev.filter((id) => filteredIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [transactions]);

  useEffect(() => {
    if (selectedIds.length === 0 && showSelectedOnly) {
      setShowSelectedOnly(false);
    }
  }, [selectedIds, showSelectedOnly]);

  const selectedLookup = useMemo(() => new Set(selectedIds), [selectedIds]);

  const effectiveTransactions = useMemo(() => {
    const base = Array.isArray(sortedTransactions) ? sortedTransactions : [];
    if (!showSelectedOnly) {
      return base;
    }

    return base.filter((txn) => selectedLookup.has(txn.id));
  }, [sortedTransactions, showSelectedOnly, selectedLookup]);

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize, sortedTransactions, showSelectedOnly, sortState]);

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

  useEffect(() => {
    if (selectedIds.length === 0) {
      setSelectionSummary({ count: 0, amount: 0, finalPrice: 0, totalBack: 0 });
      return;
    }

    let isCancelled = false;
    const controller = new AbortController();

    fetch('/api/transactions/selection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: selectedIds }),
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch selection summary');
        }
        return response.json();
      })
      .then((data) => {
        if (isCancelled) {
          return;
        }
        setSelectionSummary(
          data?.summary ?? { count: 0, amount: 0, finalPrice: 0, totalBack: 0 },
        );
      })
      .catch((error) => {
        if (!isCancelled && error.name !== 'AbortError') {
          console.error(error);
          setSelectionSummary({ count: 0, amount: 0, finalPrice: 0, totalBack: 0 });
        }
      });

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [selectedIds]);

  const handleSortStateChange = useCallback(
    (columnId, direction) => {
      if (isReorderMode) {
        return;
      }

      if (!columnId || !direction) {
        setSortState((prev) =>
          prev.columnId === null && prev.direction === null
            ? prev
            : { columnId: null, direction: null },
        );
        return;
      }

      setSortState((prev) => {
        if (prev.columnId === columnId && prev.direction === direction) {
          return prev;
        }
        return { columnId, direction };
      });
    },
    [isReorderMode],
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

    const targetRows = showSelectedOnly ? effectiveTransactions : sortedTransactions;
    setSelectedIds(targetRows.map((txn) => txn.id));
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

  const handleSubmitQuery = useCallback(() => {
    const normalized = draftQuery.trim();
    if (normalized === appliedQuery.trim()) {
      setAppliedQuery(normalized);
      return;
    }

    if (appliedQuery) {
      setPreviousQuery(appliedQuery);
    }
    setAppliedQuery(normalized);
    setCurrentPage(1);
  }, [draftQuery, appliedQuery]);

  const handleClearQuery = () => {
    if (!draftQuery && !appliedQuery) {
      return;
    }
    if (appliedQuery) {
      setPreviousQuery(appliedQuery);
    }
    setDraftQuery('');
    setAppliedQuery('');
    setCurrentPage(1);
  };

  const handleRestoreQuery = (value) => {
    setPreviousQuery('');
    setDraftQuery(value);
    setAppliedQuery(value);
    setCurrentPage(1);
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

  const handleColumnVisibilityChange = useCallback(
    (columnId, visible) => {
      setColumnState((prev) =>
        prev.map((column) =>
          column.id === columnId ? { ...column, visible: Boolean(visible) } : column,
        ),
      );
    },
    [],
  );

  const handleColumnOrderChange = useCallback((orderedVisibleIds) => {
    setColumnState((prev) => {
      if (!Array.isArray(orderedVisibleIds) || orderedVisibleIds.length === 0) {
        return prev;
      }

      const visibleLookup = new Map(orderedVisibleIds.map((id, index) => [id, index]));
      const detached = prev.slice();
      const visibleColumns = detached.filter((column) => visibleLookup.has(column.id));
      const hiddenColumns = detached.filter((column) => !visibleLookup.has(column.id));

      visibleColumns.sort((a, b) => (visibleLookup.get(a.id) ?? 0) - (visibleLookup.get(b.id) ?? 0));

      const merged = [...visibleColumns, ...hiddenColumns];
      return merged.map((column, index) => ({ ...column, order: index }));
    });
  }, []);

  const handleResetColumns = useCallback(() => {
    if (defaultColumnState.length === 0) {
      return;
    }
    setColumnState(
      defaultColumnState.map((column, index) => ({
        ...column,
        order: column.order ?? index,
      })),
    );
  }, [defaultColumnState]);

  const handleToggleAllColumnsVisibility = useCallback((visible) => {
    setColumnState((prev) =>
      prev.map((column) => {
        if (column.id === 'notes') {
          return column;
        }
        const isCurrentlyVisible = column.visible !== false;
        if (isCurrentlyVisible === visible) {
          return column;
        }
        return { ...column, visible: Boolean(visible) };
      }),
    );
  }, []);

  const handleToggleReorderMode = useCallback(() => {
    setIsReorderMode((prev) => {
      const next = !prev;
      if (next) {
        setSelectedIds([]);
      }
      return next;
    });
  }, []);

  const handleExitReorderMode = useCallback(() => {
    setIsReorderMode(false);
  }, []);

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
          searchValue={draftQuery}
          onSearchChange={setDraftQuery}
          onSubmitSearch={handleSubmitQuery}
          onClearSearch={handleClearQuery}
          previousQuery={previousQuery}
          onRestoreQuery={handleRestoreQuery}
          onAddTransaction={handleAddTransaction}
          onCustomizeColumns={handleToggleReorderMode}
          isReorderMode={isReorderMode}
          selectedCount={selectedIds.length}
          selectionSummary={selectionSummary}
          onDeselectAll={handleDeselectAll}
          onToggleShowSelected={handleToggleShowSelected}
          isShowingSelectedOnly={showSelectedOnly}
          onToggleAllColumns={handleToggleAllColumnsVisibility}
          allToggleableVisible={allToggleableVisible}
          someToggleableVisible={someToggleableVisible}
          onResetColumns={handleResetColumns}
          onDoneCustomize={handleExitReorderMode}
        />

        {isFetching || columnDefinitions.length === 0 ? (
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
            columnDefinitions={columnDefinitions}
            allColumns={orderedColumns}
            visibleColumns={visibleColumns}
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
            isColumnReorderMode={isReorderMode}
            onColumnVisibilityChange={handleColumnVisibilityChange}
            onColumnOrderChange={handleColumnOrderChange}
            sortState={sortState}
            onSortChange={handleSortStateChange}
          />
        )}
      </div>

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
