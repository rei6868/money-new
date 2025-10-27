import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import AppLayout from '../../components/AppLayout';
import { TransactionsTable } from '../../components/transactions/TransactionsTable';

import { useRequireAuth } from '../../hooks/useRequireAuth';
import styles from '../../styles/TransactionsHistory.module.css';
import TransactionAdvancedModal from '../../components/transactions/TransactionAdvancedModal';
import QuickAddMenu from '../../components/common/QuickAddMenu';
import LoadingOverlay from '../../components/common/LoadingOverlay';
import AddModalGlobal from '../../components/common/AddModalGlobal';
import headerStyles from '../../styles/HeaderActionBar.module.css';
import { FiPlus } from 'react-icons/fi';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 30];

export default function TransactionsHistoryPage() {
  const { isAuthenticated, isLoading } = useRequireAuth();
  const [transactions, setTransactions] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [advancedPanel, setAdvancedPanel] = useState(null);
  const [columnDefinitions, setColumnDefinitions] = useState([]);
  const [columnState, setColumnState] = useState([]);
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
  const [serverPagination, setServerPagination] = useState({ totalPages: 1, totalRows: 0 });
  const [addModalType, setAddModalType] = useState(null);
  const [quickAction, setQuickAction] = useState(null);
  const tableScrollRef = useRef(null);
  const savedScrollLeftRef = useRef(0);

  useEffect(() => {
    if (tableScrollRef.current && savedScrollLeftRef.current > 0) {
      requestAnimationFrame(() => {
        if (tableScrollRef.current) {
          tableScrollRef.current.scrollLeft = savedScrollLeftRef.current;
        }
      });
    }
  }, [transactions]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }

    if (!addModalType) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [addModalType]);

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

    if (tableScrollRef.current) {
      savedScrollLeftRef.current = tableScrollRef.current.scrollLeft;
    }

    setIsFetching(true);

    const params = new URLSearchParams();
    params.set('page', String(currentPage));
    params.set('pageSize', String(pageSize));
    if (sortState?.columnId) {
      params.set('sortBy', sortState.columnId);
    }
    if (sortState?.direction) {
      params.set('sortDir', sortState.direction);
    }

    const queryString = params.toString();
    const url = queryString ? `/api/transactions?${queryString}` : '/api/transactions';

    fetch(url, {
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

        const pagination = data?.pagination ?? {};
        const parsedTotalPages = Number(pagination.totalPages);
        const parsedTotalRows = Number(pagination.totalRows);
        const parsedPageSize = Number(pagination.pageSize);
        const parsedPage = Number(pagination.page);

        setServerPagination((prev) => ({
          totalPages:
            Number.isFinite(parsedTotalPages) && parsedTotalPages > 0
              ? parsedTotalPages
              : prev.totalPages || 1,
          totalRows: Number.isFinite(parsedTotalRows) && parsedTotalRows >= 0 ? parsedTotalRows : rows.length,
        }));

        if (Number.isFinite(parsedPageSize) && parsedPageSize > 0 && parsedPageSize !== pageSize) {
          setPageSize(parsedPageSize);
        }

        if (Number.isFinite(parsedPage) && parsedPage > 0 && parsedPage !== currentPage) {
          setCurrentPage(parsedPage);
        }
      })
      .catch((error) => {
        if (!isCancelled && error.name !== 'AbortError') {
          console.error(error);
          setTransactions([]);
          setServerPagination({ totalPages: 1, totalRows: 0 });
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
  }, [
    isAuthenticated,
    columnDefinitions,
    currentPage,
    pageSize,
    sortState?.columnId,
    sortState?.direction,
  ]);

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

  const displayedTransactions = useMemo(() => {
    const base = Array.isArray(transactions) ? transactions : [];
    if (!showSelectedOnly) {
      return base;
    }

    return base.filter((txn) => selectedLookup.has(txn.id));
  }, [transactions, showSelectedOnly, selectedLookup]);

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
      if (!columnId || !direction) {
        if (sortState.columnId === null && sortState.direction === null) {
          return;
        }
        setSortState({ columnId: null, direction: null });
        setCurrentPage(1);
        return;
      }

      if (sortState.columnId === columnId && sortState.direction === direction) {
        return;
      }

      setSortState({ columnId, direction });
      setCurrentPage(1);
    },
    [sortState],
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

    const targetRows = showSelectedOnly ? displayedTransactions : transactions;
    const mapped = Array.isArray(targetRows) ? targetRows.map((txn) => txn.id) : [];
    setSelectedIds(mapped);
  };

  const handleOpenAddTransaction = useCallback(() => {
    setQuickAction(null);
    setAddModalType('transaction');
  }, []);

  const handleQuickActionSelect = useCallback((actionId) => {
    setQuickAction(actionId);
    setAddModalType('transaction');
  }, []);

  const handleCloseAddModal = useCallback(() => {
    setAddModalType(null);
    setQuickAction(null);
  }, []);

  const handleSubmitAdd = useCallback(
    async (modalType, payload) => {
      try {
        if (modalType === 'transaction') {
          console.info('Create transaction placeholder', { action: quickAction, payload });
        } else if (modalType === 'account') {
          console.info('Create account placeholder from transactions page', payload);
        } else if (modalType === 'person') {
          console.info('Create person placeholder from transactions page', payload);
        }
      } catch (error) {
        console.error('Failed to submit add modal', error);
      }
    },
    [quickAction],
  );

  const handleAdvanced = (payload) => {
    setAdvancedPanel(payload);
  };

  const handleQuickEditSave = useCallback((transactionId, updates) => {
    if (!transactionId) {
      return;
    }

    setTransactions((prev) => {
      if (!Array.isArray(prev) || prev.length === 0) {
        return prev;
      }

      let didUpdate = false;
      const next = prev.map((txn) => {
        if (txn.id !== transactionId) {
          return txn;
        }

        if (updates && typeof updates === 'object') {
          didUpdate = true;
          return { ...txn, ...updates };
        }

        return txn;
      });

      return didUpdate ? next : prev;
    });
  }, []);

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

  if (isLoading || !isAuthenticated) {
    return null;
  }

  const isAddModalOpen = addModalType !== null;

  return (
    <AppLayout
      title="Transactions History"
      subtitle="Monitor every inflow, cashback, debt movement, and adjustment inside Money Flow."
    >
      <div className={styles.screen}>
        <div className={headerStyles.headerBar}>
          <div className={headerStyles.headerLeft}>
            <QuickAddMenu onSelect={handleQuickActionSelect} />
          </div>
          <div className={headerStyles.headerRight}>
            <button
              type="button"
              className={headerStyles.addButton}
              onClick={handleOpenAddTransaction}
              disabled={isFetching}
            >
              <FiPlus aria-hidden />
              <span>Add Transaction</span>
            </button>
          </div>
        </div>

        {columnDefinitions.length === 0 ? (
          <div className={styles.tableCard} data-testid="transactions-loading">
            <div className={styles.emptyState}>
              <LoadingOverlay message="Refreshing data…" />
            </div>
          </div>
        ) : (
          <TransactionsTable
            tableScrollRef={tableScrollRef}
            transactions={displayedTransactions}
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
              totalPages: Math.max(1, serverPagination.totalPages || 1),
              onPageSizeChange: (value) => {
                const normalized = PAGE_SIZE_OPTIONS.includes(value)
                  ? value
                  : PAGE_SIZE_OPTIONS[0];
                setPageSize(normalized);
                setCurrentPage(1);
              },
              onPageChange: (page) =>
                setCurrentPage((prev) => {
                  const maxPages = Math.max(1, serverPagination.totalPages || 1);
                  const next = Math.min(Math.max(page, 1), maxPages);
                  return next;
                }),
            }}
            isColumnReorderMode={false}
            onColumnVisibilityChange={handleColumnVisibilityChange}
            onColumnOrderChange={handleColumnOrderChange}
            sortState={sortState}
            onSortChange={handleSortStateChange}
            isShowingSelectedOnly={showSelectedOnly}
            isFetching={isFetching}
          />
        )}
      </div>

      <TransactionAdvancedModal
        panelData={advancedPanel}
        onClose={handleCloseAdvanced}
        onQuickEditSave={handleQuickEditSave}
      />
      <AddModalGlobal
        type={addModalType ?? 'transaction'}
        isOpen={isAddModalOpen}
        onClose={handleCloseAddModal}
        onSubmit={handleSubmitAdd}
      />
    </AppLayout>
  );
}
