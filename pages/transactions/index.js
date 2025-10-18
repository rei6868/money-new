import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiXCircle } from 'react-icons/fi';

import AppLayout from '../../components/AppLayout';
import { CustomizeColumnsModal } from '../../components/transactions/CustomizeColumnsModal';
import { TransactionsFilterModal } from '../../components/transactions/TransactionsFilterModal';
import { TransactionsTable } from '../../components/transactions/TransactionsTable';
import { TransactionsToolbar } from '../../components/transactions/TransactionsToolbar';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { formatAmountWithTrailing } from '../../lib/numberFormat';
import styles from '../../styles/TransactionsHistory.module.css';

const createInitialFilters = () => ({
  person: 'all',
  category: 'all',
  year: 'all',
  month: 'all',
  types: [],
  debtTags: [],
});

const PAGE_SIZE_OPTIONS = [5, 10, 20, 30];
const NUMERIC_SORT_COLUMNS = new Set(['amount', 'percentBack', 'fixedBack', 'totalBack', 'finalPrice']);
const DATE_SORT_COLUMNS = new Set(['date']);

function getSortableValue(transaction, columnId) {
  if (NUMERIC_SORT_COLUMNS.has(columnId)) {
    const value = Number(transaction[columnId]);
    return Number.isNaN(value) ? 0 : value;
  }
  if (DATE_SORT_COLUMNS.has(columnId)) {
    const dateValue = new Date(`${transaction[columnId]}T00:00:00`).getTime();
    return Number.isNaN(dateValue) ? 0 : dateValue;
  }
  const rawValue = transaction[columnId];
  if (rawValue === undefined || rawValue === null) {
    return '';
  }
  return String(rawValue).toLowerCase();
}

export default function TransactionsHistoryPage() {
  const { isAuthenticated, isLoading } = useRequireAuth();
  const [transactions, setTransactions] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const [draftQuery, setDraftQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [previousQuery, setPreviousQuery] = useState('');
  const [draftFilters, setDraftFilters] = useState(createInitialFilters);
  const [appliedFilters, setAppliedFilters] = useState(createInitialFilters);
  const [filterOptions, setFilterOptions] = useState({
    people: [],
    categories: [],
    years: [],
    months: [],
    types: [],
    debtTags: [],
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [columnDefinitions, setColumnDefinitions] = useState([]);
  const [columnState, setColumnState] = useState([]);
  const [defaultColumnState, setDefaultColumnState] = useState([]);
  const [sortState, setSortState] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectionSummary, setSelectionSummary] = useState({
    count: 0,
    amount: 0,
    finalPrice: 0,
    totalBack: 0,
  });
  const [advancedPanel, setAdvancedPanel] = useState(null);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[1] ?? PAGE_SIZE_OPTIONS[0]);
  const [currentPage, setCurrentPage] = useState(1);
  const [quickFilters, setQuickFilters] = useState({
    category: '',
    owner: '',
    type: [],
    debtTag: [],
  });

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
        const definitionLookup = new Map(definitions.map((definition) => [definition.id, definition]));
        const defaultState = Array.isArray(data.defaultState) ? data.defaultState : [];
        const normalizedState = defaultState.map((column, index) => {
          const definition = definitionLookup.get(column.id) ?? {};
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
            format: column.format ?? definition.defaultFormat,
          };
        });

        setColumnDefinitions(definitions);
        setColumnState(normalizedState);
        setDefaultColumnState(normalizedState.map((column) => ({ ...column })));
        if (Array.isArray(data.defaultSort)) {
          setSortState(data.defaultSort);
        }
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

  const serializedSort = useMemo(() => JSON.stringify(sortState), [sortState]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const controller = new AbortController();
    setIsFetching(true);

    let sortForRequest = [];
    try {
      sortForRequest = serializedSort ? JSON.parse(serializedSort) : [];
    } catch (error) {
      sortForRequest = [];
    }

    const params = new URLSearchParams();
    if (appliedQuery) {
      params.set('search', appliedQuery);
    }
    if (appliedFilters.person && appliedFilters.person !== 'all') {
      params.append('person', appliedFilters.person);
    }
    if (appliedFilters.category && appliedFilters.category !== 'all') {
      params.append('category', appliedFilters.category);
    }
    if (appliedFilters.year && appliedFilters.year !== 'all') {
      params.append('year', appliedFilters.year);
    }
    if (appliedFilters.month && appliedFilters.month !== 'all') {
      params.append('month', appliedFilters.month);
    }
    (appliedFilters.types ?? []).forEach((type) => params.append('type', type));
    (appliedFilters.debtTags ?? []).forEach((tag) => params.append('debtTag', tag));
    if (sortForRequest.length > 0) {
      params.set(
        'sort',
        sortForRequest
          .map((sort) => `${sort.id}:${sort.direction === 'desc' ? 'desc' : 'asc'}`)
          .join(','),
      );
    }

    fetch(`/api/transactions?${params.toString()}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch transactions');
        }
        return response.json();
      })
      .then((data) => {
        setTransactions(Array.isArray(data.rows) ? data.rows : []);
        if (data.filters) {
          setFilterOptions((prev) => ({ ...prev, ...data.filters }));
        }
        if (Array.isArray(data.sort)) {
          const nextKey = JSON.stringify(data.sort);
          if (nextKey !== serializedSort) {
            setSortState(data.sort);
          }
        }
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          console.error(error);
          setTransactions([]);
        }
      })
      .finally(() => {
        setIsFetching(false);
      });

    return () => {
      controller.abort();
    };
  }, [isAuthenticated, appliedQuery, appliedFilters, serializedSort]);

  useEffect(() => {
    if (transactions.length === 0) {
      return;
    }

    const people = new Set();
    const categories = new Set();
    const years = new Set();
    const months = new Set();
    const types = new Set();
    const debtTags = new Set();

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
      if (txn.type) {
        types.add(txn.type);
      }
      if (txn.debtTag) {
        debtTags.add(txn.debtTag);
      }
    });

    setFilterOptions((prev) => ({
      people: prev.people.length > 0 ? prev.people : Array.from(people).sort(),
      categories: prev.categories.length > 0 ? prev.categories : Array.from(categories).sort(),
      years: prev.years.length > 0 ? prev.years : Array.from(years).sort(),
      months:
        prev.months.length > 0
          ? prev.months
          : Array.from(months).sort((a, b) => new Date(`${a} 1, 2000`) - new Date(`${b} 1, 2000`)),
      types: prev.types.length > 0 ? prev.types : Array.from(types).sort(),
      debtTags: prev.debtTags.length > 0 ? prev.debtTags : Array.from(debtTags).sort(),
    }));
  }, [transactions]);

  useEffect(() => {
    const available = new Set(transactions.map((txn) => txn.id));
    setSelectedIds((prev) => prev.filter((id) => available.has(id)));
  }, [transactions]);

  useEffect(() => {
    if (selectedIds.length === 0) {
      setSelectionSummary({ count: 0, amount: 0, finalPrice: 0, totalBack: 0 });
      return;
    }

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
        setSelectionSummary(
          data?.summary ?? { count: selectedIds.length, amount: 0, finalPrice: 0, totalBack: 0 },
        );
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          console.error(error);
          setSelectionSummary({ count: selectedIds.length, amount: 0, finalPrice: 0, totalBack: 0 });
        }
      });

    return () => {
      controller.abort();
    };
  }, [selectedIds]);

  useEffect(() => {
    if (selectedIds.length === 0 && showSelectedOnly) {
      setShowSelectedOnly(false);
    }
  }, [selectedIds, showSelectedOnly]);

  const definitionLookup = useMemo(
    () => new Map(columnDefinitions.map((definition) => [definition.id, definition])),
    [columnDefinitions],
  );

  const orderedColumns = useMemo(() => {
    if (columnState.length === 0) {
      return [];
    }

    return columnState
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((column) => {
        const definition = definitionLookup.get(column.id) ?? {};
        const minWidth = definition.minWidth ?? 120;
        const defaultVisible = definition.defaultVisible !== false;
        const normalizedWidth = Math.max(
          Number(column.width) || definition.defaultWidth || minWidth,
          minWidth,
        );

        return {
          ...definition,
          ...column,
          width: normalizedWidth,
          visible: column.visible ?? defaultVisible,
        };
      });
  }, [columnState, definitionLookup]);

  const visibleColumns = useMemo(
    () => orderedColumns.filter((column) => column.visible !== false),
    [orderedColumns],
  );

  const filteredTransactions = useMemo(() => {
    if (transactions.length === 0) {
      return [];
    }
    const loweredQuery = appliedQuery.trim().toLowerCase();
    const quickCategory = quickFilters.category;
    const quickOwner = quickFilters.owner;
    const quickTypes = new Set(quickFilters.type ?? []);
    const quickDebtTags = new Set(quickFilters.debtTag ?? []);

    return transactions.filter((txn) => {
      if (appliedFilters.person !== 'all' && txn.owner !== appliedFilters.person) {
        return false;
      }
      if (appliedFilters.category !== 'all' && txn.category !== appliedFilters.category) {
        return false;
      }
      if (appliedFilters.year !== 'all' && String(txn.year) !== String(appliedFilters.year)) {
        return false;
      }
      if (appliedFilters.month !== 'all' && String(txn.month) !== String(appliedFilters.month)) {
        return false;
      }
      if ((appliedFilters.types ?? []).length > 0 && !(appliedFilters.types ?? []).includes(txn.type)) {
        return false;
      }
      if ((appliedFilters.debtTags ?? []).length > 0 && !(appliedFilters.debtTags ?? []).includes(txn.debtTag)) {
        return false;
      }
      if (quickCategory && txn.category !== quickCategory) {
        return false;
      }
      if (quickOwner && txn.owner !== quickOwner) {
        return false;
      }
      if (quickTypes.size > 0 && !quickTypes.has(txn.type)) {
        return false;
      }
      if (quickDebtTags.size > 0 && !quickDebtTags.has(txn.debtTag)) {
        return false;
      }
      if (!loweredQuery) {
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
  }, [transactions, appliedFilters, appliedQuery, quickFilters]);

  const sortedTransactions = useMemo(() => {
    if (sortState.length === 0) {
      return filteredTransactions;
    }

    return filteredTransactions.slice().sort((a, b) => {
      for (const sort of sortState) {
        const direction = sort.direction === 'desc' ? -1 : 1;
        const aValue = getSortableValue(a, sort.id);
        const bValue = getSortableValue(b, sort.id);
        if (aValue < bValue) {
          return -1 * direction;
        }
        if (aValue > bValue) {
          return 1 * direction;
        }
      }
      return 0;
    });
  }, [filteredTransactions, sortState]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const effectiveTransactions = useMemo(() => {
    if (!showSelectedOnly) {
      return sortedTransactions;
    }
    return sortedTransactions.filter((txn) => selectedSet.has(txn.id));
  }, [showSelectedOnly, sortedTransactions, selectedSet]);

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize, appliedFilters, appliedQuery, quickFilters, showSelectedOnly, sortState]);

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

  const filterCount = useMemo(() => {
    const baseCount = ['person', 'category', 'year', 'month'].filter(
      (key) => appliedFilters[key] && appliedFilters[key] !== 'all',
    ).length;
    const multiCount = (appliedFilters.types?.length ?? 0) + (appliedFilters.debtTags?.length ?? 0);
    const quickCount = Object.values(quickFilters).reduce((total, value) => {
      if (Array.isArray(value)) {
        return total + value.length;
      }
      return total + (value ? 1 : 0);
    }, 0);
    return baseCount + multiCount + quickCount;
  }, [appliedFilters, quickFilters]);

  const handleSubmitSearch = useCallback(() => {
    setPreviousQuery(appliedQuery);
    setAppliedQuery(draftQuery.trim());
  }, [appliedQuery, draftQuery]);

  const handleClearSearch = useCallback(() => {
    setPreviousQuery(appliedQuery);
    setDraftQuery('');
    setAppliedQuery('');
  }, [appliedQuery]);

  const handleRestoreQuery = useCallback((value) => {
    setDraftQuery(value);
    setAppliedQuery(value);
  }, []);

  const handleFilterChange = useCallback((field, value) => {
    setDraftFilters((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleFilterToggle = useCallback((field, value, checked) => {
    setDraftFilters((prev) => {
      const list = new Set(prev[field] ?? []);
      if (checked) {
        list.add(value);
      } else {
        list.delete(value);
      }
      return { ...prev, [field]: Array.from(list) };
    });
  }, []);

  const handleFilterReset = useCallback(() => {
    setDraftFilters(createInitialFilters());
  }, []);

  const handleFilterApply = useCallback(() => {
    setAppliedFilters(draftFilters);
    setIsFilterOpen(false);
  }, [draftFilters]);

  const handleSelectRow = useCallback((id, checked) => {
    setSelectedIds((prev) => {
      if (checked) {
        if (prev.includes(id)) {
          return prev;
        }
        return [...prev, id];
      }
      return prev.filter((item) => item !== id);
    });
  }, []);

  const handleSelectAll = useCallback(
    (checked) => {
      if (!checked) {
        setSelectedIds([]);
        return;
      }
      setSelectedIds(filteredTransactions.map((txn) => txn.id));
    },
    [filteredTransactions],
  );

  const handleDeselectAll = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const handleToggleShowSelected = useCallback(() => {
    setShowSelectedOnly((prev) => !prev);
  }, []);

  const handleApplyColumns = useCallback(
    (columns) => {
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
    },
    [definitionLookup],
  );

  const handleResetColumns = useCallback(() => {
    if (defaultColumnState.length > 0) {
      setColumnState(
        defaultColumnState.map((column, index) => ({
          ...column,
          order: column.order ?? index,
        })),
      );
    }
    setIsCustomizeOpen(false);
  }, [defaultColumnState]);

  const handleSortStateChange = useCallback((columnId, options = {}) => {
    setSortState((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === columnId);
      const nextDirection =
        existingIndex === -1
          ? 'asc'
          : prev[existingIndex].direction === 'asc'
          ? 'desc'
          : prev[existingIndex].direction === 'desc'
          ? null
          : 'asc';

      if (!options.multi) {
        if (!nextDirection) {
          return [];
        }
        return [{ id: columnId, direction: nextDirection }];
      }

      if (!nextDirection) {
        return prev.filter((item) => item.id !== columnId);
      }

      if (existingIndex === -1) {
        return [...prev, { id: columnId, direction: nextDirection }];
      }

      const next = [...prev];
      next[existingIndex] = { id: columnId, direction: nextDirection };
      return next;
    });
  }, []);

  const handleQuickFilterChange = useCallback((filterId, value) => {
    setQuickFilters((prev) => ({ ...prev, [filterId]: value }));
  }, []);

  const handleAddTransaction = useCallback(() => {
    setAdvancedPanel({ mode: 'create' });
  }, []);

  const handleAdvanced = useCallback((payload) => {
    setAdvancedPanel(payload);
  }, []);

  const handleCloseAdvanced = useCallback(() => {
    setAdvancedPanel(null);
  }, []);

  const handleSearchOptions = useCallback(() => {
    // Placeholder for future async search of filter options.
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
          onSubmitSearch={handleSubmitSearch}
          onClearSearch={handleClearSearch}
          previousQuery={previousQuery}
          onRestoreQuery={handleRestoreQuery}
          onFilterClick={() => setIsFilterOpen(true)}
          filterCount={filterCount}
          onAddTransaction={handleAddTransaction}
          onCustomizeColumns={() => setIsCustomizeOpen(true)}
          selectionSummary={selectionSummary}
          onDeselectAll={handleDeselectAll}
          onToggleShowSelected={handleToggleShowSelected}
          isShowingSelectedOnly={showSelectedOnly}
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
                  return next === prev ? prev : next;
                }),
            }}
            sortState={sortState}
            onSortChange={handleSortStateChange}
            quickFilters={quickFilters}
            quickFilterOptions={{
              category: filterOptions.categories,
              owner: filterOptions.people,
              type: filterOptions.types,
              debtTag: filterOptions.debtTags,
            }}
            onQuickFilterChange={handleQuickFilterChange}
          />
        )}
      </div>

      <TransactionsFilterModal
        isOpen={isFilterOpen}
        filters={draftFilters}
        onChange={handleFilterChange}
        onToggleOption={handleFilterToggle}
        onClose={() => setIsFilterOpen(false)}
        onReset={handleFilterReset}
        onApply={handleFilterApply}
        options={filterOptions}
        onSearchOptions={handleSearchOptions}
      />

      <CustomizeColumnsModal
        isOpen={isCustomizeOpen}
        columns={orderedColumns}
        onClose={() => setIsCustomizeOpen(false)}
        onApply={handleApplyColumns}
        onReset={handleResetColumns}
        columnDefinitions={columnDefinitions}
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
                    Connect to your preferred batch input to populate a draft transaction with preset Cashback and Debt parameters.
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
