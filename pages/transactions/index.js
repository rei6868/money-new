import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import AppLayout from '../../components/layout/AppShell/AppShell';
import { TransactionsTable } from '../../components/transactions/TransactionsTable';
import { FiFilter, FiPlus, FiSearch, FiSettings, FiX } from 'react-icons/fi';

import { useRequireAuth } from '../../hooks/useRequireAuth';
import styles from '../../styles/TransactionsHistory.module.css';
import pageShellStyles from '../../styles/layout/page-shell.module.css';
import TransactionAdvancedModal from '../../components/transactions/TransactionAdvancedModal';
import LoadingOverlay from '../../components/common/LoadingOverlay';
import AddModalGlobal from '../../components/common/AddModalGlobal';
import QuickAddModal from '../../components/common/QuickAddModal';
import ColumnsCustomizeModal from '../../components/customize/ColumnsCustomizeModal';
import TxnTabs from '../../components/transactions/TxnTabs';
import { PageToolbarSearch } from '../../components/layout/page/PageToolbar';
import { EmptyStateCard, TablePanel } from '../../components/layout/panels';
import { ModalWrapper } from '../../components/common/ModalWrapper';
import { DropdownSimple } from '../../components/common/DropdownSimple';
import { SelectionToolbar } from '../../components/table/SelectionToolbar';
import {
  TRANSACTION_TYPE_VALUES,
  getTransactionTypeLabel,
  normalizeTransactionType,
} from '../../lib/transactions/transactionTypes';
import {
  buildTransactionPredicate,
  buildTransferLinkInfo,
  createTransferPairKey,
  extractString,
} from '../../lib/transactions/transferFilters';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 30];

const DEFAULT_FILTERS = Object.freeze({
  person: 'all',
  account: 'all',
  category: 'all',
  debtTag: 'all',
  amountRange: 'all',
  dateRange: 'all',
});

const AMOUNT_FILTER_OPTIONS = ['positive', 'negative', 'zero', 'under-100k', '100k-1m', 'over-1m'];

const AMOUNT_FILTER_LABELS = {
  all: 'Any amount',
  positive: 'Positive amounts',
  negative: 'Negative amounts',
  zero: 'Zero amount',
  'under-100k': 'Under ₫100k',
  '100k-1m': '₫100k – ₫1M',
  'over-1m': 'Over ₫1M',
};

const DATE_FILTER_OPTIONS = ['today', 'last-7', 'last-30', 'this-month', 'last-month', 'this-year'];

const DATE_FILTER_LABELS = {
  all: 'Any date',
  today: 'Today',
  'last-7': 'Last 7 days',
  'last-30': 'Last 30 days',
  'this-month': 'This month',
  'last-month': 'Last month',
  'this-year': 'This year',
};

function expandTransferMatches(matches, base, transferLinkInfo) {
  const baseArray = Array.isArray(base) ? base : [];

  if (!Array.isArray(matches) || matches.length === 0) {
    return [];
  }

  const matchMap = new Map();

  const ensurePartnerById = (candidateId) => {
    const normalizedId = extractString(candidateId);
    if (!normalizedId || matchMap.has(normalizedId)) {
      return;
    }

    const partner = transferLinkInfo.byId.get(normalizedId);
    if (partner) {
      matchMap.set(normalizedId, partner);
    }
  };

  matches.forEach((txn) => {
    const txnId = extractString(txn?.id);
    if (txnId) {
      matchMap.set(txnId, txn);
    }
  });

  matches.forEach((txn) => {
    const txnId = extractString(txn?.id);
    const linkedId = extractString(txn?.linkedTxn);
    ensurePartnerById(linkedId);

    if (txnId) {
      const inbound = transferLinkInfo.inbound.get(txnId);
      if (inbound) {
        inbound.forEach((sourceId) => {
          ensurePartnerById(sourceId);
        });
      }
    }
  });

  const sorted = Array.from(matchMap.values()).sort((a, b) => {
    const idA = extractString(a?.id);
    const idB = extractString(b?.id);
    const indexA = transferLinkInfo.index.get(idA) ?? baseArray.indexOf(a);
    const indexB = transferLinkInfo.index.get(idB) ?? baseArray.indexOf(b);
    return indexA - indexB;
  });

  return sorted;
}





function getTransactionTypeValue(txn) {
  const typeFields = [
    txn?.typeRaw,
    txn?.typeValue,
    txn?.type,
    txn?.transactionType,
    txn?.transaction_type,
    txn?.categoryType,
    txn?.category_type,
  ];

  for (const candidate of typeFields) {
    const normalized = normalizeTransactionType(candidate);
    if (candidate !== undefined && candidate !== null) {
      return normalized;
    }
  }

  return TRANSACTION_TYPE_VALUES.OTHER;
}

function applyTypeMetadata(txn) {
  if (!txn || typeof txn !== 'object') {
    return txn;
  }
  const rawType = typeof txn.type === 'string' ? txn.type : '';
  const typeValue = getTransactionTypeValue(txn);
  const normalizedLabel = getTransactionTypeLabel(typeValue);
  const displayType = rawType && rawType.length > 0 ? rawType : normalizedLabel;
  return {
    ...txn,
    typeRaw: rawType,
    typeValue,
    typeLabel: displayType,
    type: displayType,
  };
}

function normalizeFilterString(value) {
  if (typeof value === 'string') {
    return value.trim().toLowerCase();
  }
  if (value instanceof Date) {
    return value.toISOString().toLowerCase();
  }
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim().toLowerCase();
}

function collectUniqueValues(source, accessor) {
  if (!Array.isArray(source)) {
    return [];
  }

  const values = new Set();
  source.forEach((item) => {
    if (!item) {
      return;
    }
    const candidate = accessor(item);
    if (typeof candidate === 'string') {
      const normalized = candidate.trim();
      if (normalized.length > 0) {
        values.add(normalized);
      }
      return;
    }
    if (candidate instanceof Date) {
      values.add(candidate.toISOString());
    }
  });

  return Array.from(values).sort((a, b) => a.localeCompare(b));
}

function resolveTransactionDate(transaction) {
  if (!transaction) {
    return null;
  }

  const candidates = [
    transaction.date,
    transaction.transactionDate,
    transaction.occurredOn,
    transaction.createdAt,
    transaction.updatedAt,
  ];

  for (const value of candidates) {
    if (!value) {
      continue;
    }
    if (value instanceof Date) {
      return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    }
    if (typeof value === 'string') {
      const normalized = value.includes('T') ? value : `${value}T00:00:00`;
      const parsed = new Date(normalized);
      if (!Number.isNaN(parsed.getTime())) {
        return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
      }
    }
  }

  return null;
}

function matchesAmountRange(amountValue, range) {
  if (!range || range === 'all') {
    return true;
  }

  const numeric = Number(amountValue);
  if (!Number.isFinite(numeric)) {
    return false;
  }

  const absolute = Math.abs(numeric);
  switch (range) {
    case 'positive':
      return numeric > 0;
    case 'negative':
      return numeric < 0;
    case 'zero':
      return Math.abs(numeric) < 1e-6;
    case 'under-100k':
      return absolute > 0 && absolute < 100000;
    case '100k-1m':
      return absolute >= 100000 && absolute <= 1000000;
    case 'over-1m':
      return absolute > 1000000;
    default:
      return true;
  }
}

function isWithinDateRange(date, range) {
  if (!range || range === 'all') {
    return true;
  }
  if (!(date instanceof Date)) {
    return false;
  }

  const today = new Date();
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const compareDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  switch (range) {
    case 'today':
      return compareDate.getTime() === base.getTime();
    case 'last-7': {
      const threshold = new Date(base);
      threshold.setDate(base.getDate() - 6);
      return compareDate >= threshold && compareDate <= base;
    }
    case 'last-30': {
      const threshold = new Date(base);
      threshold.setDate(base.getDate() - 29);
      return compareDate >= threshold && compareDate <= base;
    }
    case 'this-month':
      return (
        compareDate.getFullYear() === base.getFullYear() &&
        compareDate.getMonth() === base.getMonth()
      );
    case 'last-month': {
      const lastMonthDate = new Date(base);
      lastMonthDate.setMonth(base.getMonth() - 1);
      return (
        compareDate.getFullYear() === lastMonthDate.getFullYear() &&
        compareDate.getMonth() === lastMonthDate.getMonth()
      );
    }
    case 'this-year':
      return compareDate.getFullYear() === base.getFullYear();
    default:
      return true;
  }
}

function matchesEntityFilter(value, filterValue) {
  if (!filterValue || filterValue === 'all') {
    return true;
  }
  const normalizedFilter = normalizeFilterString(filterValue);
  if (!normalizedFilter) {
    return true;
  }
  const normalizedValue = normalizeFilterString(value);
  return normalizedFilter === normalizedValue;
}

export default function TransactionsHistoryPage() {
  const { isAuthenticated, isLoading } = useRequireAuth();
  const [transactions, setTransactions] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [advancedPanel, setAdvancedPanel] = useState(null);
  const [columnDefinitions, setColumnDefinitions] = useState([]);
  const [columnState, setColumnState] = useState([]);
  const [defaultColumnState, setDefaultColumnState] = useState([]);
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
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS });
  const [pendingFilters, setPendingFilters] = useState({ ...DEFAULT_FILTERS });
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [openFilterDropdown, setOpenFilterDropdown] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [availableTypes, setAvailableTypes] = useState([]);
  const [isCompact, setIsCompact] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const tableScrollRef = useRef(null);
  const savedScrollLeftRef = useRef(0);
  const searchInputRef = useRef(null);
  const transferLinkInfo = useMemo(() => buildTransferLinkInfo(transactions), [transactions]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const media = window.matchMedia('(max-width: 720px)');
    const updateMatch = () => setIsCompact(media.matches);
    updateMatch();
    media.addEventListener('change', updateMatch);

    return () => {
      media.removeEventListener('change', updateMatch);
    };
  }, []);

  useEffect(() => {
    if (isCompact) {
      setIsSearchOpen(false);
      return;
    }
    setIsSearchOpen(true);
  }, [isCompact]);

  useEffect(() => {
    if (isCompact && isSearchOpen && searchInputRef.current) {
      window.requestAnimationFrame(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      });
    }
  }, [isCompact, isSearchOpen]);

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

    fetch('/api/transactions/types')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch transaction types');
        }
        return response.json();
      })
      .then((data) => {
        if (isCancelled) {
          return;
        }
        const types = Array.isArray(data?.types) ? data.types : [];
        const normalized = Array.from(
          new Set(
            types
              .map((value) => (typeof value === 'string' ? value.trim() : ''))
              .filter((value) => value.length > 0),
          ),
        );
        setAvailableTypes(normalized);
      })
      .catch((error) => {
        if (!isCancelled) {
          console.error(error);
        }
      });

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
            pinned: column.pinned ?? null,
            optional: column.optional ?? definition.optional ?? false,
          };
        });

        setColumnDefinitions(definitions);
        setDefaultColumnState(normalizedState.map((column) => ({ ...column })));
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

        const rows = Array.isArray(data.rows) ? data.rows.map((row) => applyTypeMetadata(row)) : [];
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

    const sorted = columnState.slice().sort((a, b) => a.order - b.order);
    const pinnedLeft = sorted.filter((column) => column.pinned === 'left');
    const pinnedRight = sorted.filter((column) => column.pinned === 'right');
    const unpinned = sorted.filter((column) => column.pinned !== 'left' && column.pinned !== 'right');
    const arranged = [...pinnedLeft, ...unpinned, ...pinnedRight];

    return arranged.map((state, index) => {
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
        order: index,
        width: normalizedWidth,
        visible: state.visible ?? defaultVisible,
        pinned: state.pinned ?? null,
      };
    });
  }, [columnState, definitionLookup]);

  const visibleColumns = useMemo(
    () => orderedColumns.filter((column) => column.visible),
    [orderedColumns],
  );



  const resolvedTypeList = useMemo(() => {
    if (availableTypes.length > 0) {
      return availableTypes;
    }
    const derived = new Set();
    const base = Array.isArray(transactions) ? transactions : [];
    base.forEach((txn) => {
      const raw = extractString(txn.typeRaw ?? txn.type);
      if (raw) {
        derived.add(raw);
      }
    });
    return Array.from(derived);
  }, [availableTypes, transactions]);

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

  const matchesActiveFilters = useCallback(
    (txn) => {
      if (!txn) {
        return false;
      }

      if (!matchesEntityFilter(
        txn.owner ?? txn.person ?? txn.personName ?? txn.person_name ?? txn.customerName,
        filters.person,
      )) {
        return false;
      }

      if (
        !matchesEntityFilter(
          txn.account ?? txn.accountName ?? txn.account_name ?? txn.walletName,
          filters.account,
        )
      ) {
        return false;
      }

      if (
        !matchesEntityFilter(
          txn.category ?? txn.categoryName ?? txn.category_name ?? txn.typeLabel,
          filters.category,
        )
      ) {
        return false;
      }

      if (
        !matchesEntityFilter(
          txn.debtTag ?? txn.debtTagName ?? txn.debt_tag ?? txn.debtLabel,
          filters.debtTag,
        )
      ) {
        return false;
      }

      if (!matchesAmountRange(txn.amount ?? txn.total ?? txn.value, filters.amountRange)) {
        return false;
      }

      const dateValue = resolveTransactionDate(txn);
      if (!isWithinDateRange(dateValue, filters.dateRange)) {
        return false;
      }

      return true;
    },
    [filters],
  );

  const personOptions = useMemo(
    () =>
      collectUniqueValues(transactions, (txn) =>
        txn?.owner ?? txn?.person ?? txn?.personName ?? txn?.person_name ?? txn?.customerName ?? '',
      ),
    [transactions],
  );

  const accountOptions = useMemo(
    () =>
      collectUniqueValues(transactions, (txn) =>
        txn?.account ?? txn?.accountName ?? txn?.account_name ?? txn?.walletName ?? '',
      ),
    [transactions],
  );

  const categoryOptions = useMemo(
    () =>
      collectUniqueValues(transactions, (txn) =>
        txn?.category ?? txn?.categoryName ?? txn?.category_name ?? txn?.typeLabel ?? '',
      ),
    [transactions],
  );

  const debtTagOptions = useMemo(
    () =>
      collectUniqueValues(transactions, (txn) =>
        txn?.debtTag ?? txn?.debtTagName ?? txn?.debt_tag ?? txn?.debtLabel ?? '',
      ),
    [transactions],
  );

  const activeFilterCount = useMemo(
    () =>
      Object.values(filters).reduce(
        (count, value) => (value && value !== 'all' ? count + 1 : count),
        0,
      ),
    [filters],
  );

  const pendingFilterCount = useMemo(
    () =>
      Object.values(pendingFilters).reduce(
        (count, value) => (value && value !== 'all' ? count + 1 : count),
        0,
      ),
    [pendingFilters],
  );

  const handleOpenFilterModal = useCallback(() => {
    setPendingFilters({ ...filters });
    setOpenFilterDropdown(null);
    setIsFilterModalOpen(true);
  }, [filters]);

  const handleCloseFilterModal = useCallback(() => {
    setIsFilterModalOpen(false);
    setOpenFilterDropdown(null);
    setPendingFilters({ ...filters });
  }, [filters]);

  const handleApplyFilterModal = useCallback(() => {
    const next = { ...pendingFilters };
    setFilters(next);
    setPendingFilters(next);
    setIsFilterModalOpen(false);
    setOpenFilterDropdown(null);
  }, [pendingFilters]);

  const handleClearAllFilters = useCallback(() => {
    const reset = { ...DEFAULT_FILTERS };
    setFilters(reset);
    setPendingFilters(reset);
    setOpenFilterDropdown(null);
    setIsFilterModalOpen(false);
  }, []);

  const handleDropdownToggle = useCallback((id) => {
    setOpenFilterDropdown((current) => (current === id ? null : id));
  }, []);

  const handleFilterOptionSelect = useCallback((field, value) => {
    setPendingFilters((prev) => ({ ...prev, [field]: value }));
    setOpenFilterDropdown(null);
  }, []);

  const filteredTransactions = useMemo(() => {
    const base = Array.isArray(transactions) ? transactions : [];
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const predicate = buildTransactionPredicate(
      normalizedQuery,
      activeTab,
      transferLinkInfo.linkedIds,
    );
    const matches = base.filter(predicate);
    const scoped = matches.filter(matchesActiveFilters);

    if (activeTab === TRANSACTION_TYPE_VALUES.TRANSFER) {
      return expandTransferMatches(scoped, base, transferLinkInfo).filter(matchesActiveFilters);
    }

    return scoped;
  }, [
    transactions,
    searchQuery,
    activeTab,
    transferLinkInfo,
    matchesActiveFilters,
  ]);

  // Sync selected IDs with available transactions (remove IDs that no longer exist)
  useEffect(() => {
    const availableIds = new Set(transactions.map((txn) => txn.id));
    setSelectedIds((prev) => {
      const next = prev.filter((id) => availableIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [transactions]);

  const displayedTransactions = useMemo(() => {
    if (!showSelectedOnly) {
      return filteredTransactions;
    }
    return filteredTransactions.filter((txn) => selectedLookup.has(txn.id));
  }, [filteredTransactions, selectedLookup, showSelectedOnly]);

  const handleSelectAll = useCallback(
    (checked) => {
      if (!checked) {
        setSelectedIds([]);
        return;
      }

      const targetRows = showSelectedOnly ? displayedTransactions : filteredTransactions;
      const mapped = Array.isArray(targetRows) ? targetRows.map((txn) => txn.id) : [];
      setSelectedIds(mapped);
    },
    [displayedTransactions, filteredTransactions, showSelectedOnly],
  );

  const handleToggleShowSelected = useCallback((next) => {
    setShowSelectedOnly(Boolean(next));
  }, []);

  const selectedCount = selectedIds.length;

  const handleBulkDelete = useCallback((ids) => {
    console.info('Transactions bulk delete placeholder', ids);
  }, []);

  const handleDeselectAll = useCallback(() => {
    handleSelectAll(false);
  }, [handleSelectAll]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.length === 0) {
      return;
    }
    if (typeof handleBulkDelete === 'function') {
      handleBulkDelete(selectedIds);
      return;
    }
    setAdvancedPanel({ mode: 'delete-many', ids: selectedIds });
  }, [handleBulkDelete, selectedIds]);

  const tabMetrics = useMemo(() => {
    const base = Array.isArray(transactions) ? transactions : [];
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const predicate = buildTransactionPredicate(
      normalizedQuery,
      false,
      transferLinkInfo.linkedIds,
    );
    const baseMatches = base.filter(predicate).filter(matchesActiveFilters);
    const counts = new Map();

    baseMatches.forEach((txn) => {
      const rawType = extractString(txn.typeRaw ?? txn.type);
      if (rawType) {
        const key = rawType;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    });

    const transferPairs = new Set();
    const scopedTransfers = expandTransferMatches(baseMatches, base, transferLinkInfo).filter(
      matchesActiveFilters,
    );

    scopedTransfers.forEach((txn) => {
      const txnId = extractString(txn.id);
      const linkedId = extractString(txn.linkedTxn);
      const directKey = createTransferPairKey(txnId, linkedId);
      if (directKey) {
        transferPairs.add(directKey);
      }

      if (txnId) {
        const inbound = transferLinkInfo.inbound.get(txnId);
        if (inbound) {
          inbound.forEach((sourceId) => {
            const inboundKey = createTransferPairKey(sourceId, txnId);
            if (inboundKey) {
              transferPairs.add(inboundKey);
            }
          });
        }
      }
    });

    const derivedTabs = resolvedTypeList
      .filter((type) => type.toLowerCase() !== TRANSACTION_TYPE_VALUES.TRANSFER)
      .map((type) => ({
        id: type,
        label: type,
        count: counts.get(type) ?? 0,
      }));

    const tabs = [{ id: 'all', label: 'All', count: baseMatches.length }, ...derivedTabs];

    tabs.push({
      id: TRANSACTION_TYPE_VALUES.TRANSFER,
      label: getTransactionTypeLabel(TRANSACTION_TYPE_VALUES.TRANSFER),
      count: transferPairs.size,
    });

    return tabs;
  }, [searchQuery, transactions, resolvedTypeList, transferLinkInfo, matchesActiveFilters]);

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

  const handleOpenAddTransaction = useCallback(() => {
    setQuickAction(null);
    setAddModalType('transaction');
  }, []);

  const handleQuickActionSelect = useCallback((_, actionId) => {
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
          return applyTypeMetadata({ ...txn, ...updates });
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

  const handleCustomizeChange = useCallback((columnsConfig) => {
    setColumnState((prev) => {
      const widthLookup = new Map(prev.map((column) => [column.id, column.width]));
      const optionalLookup = new Map(prev.map((column) => [column.id, column.optional]));
      return columnsConfig.map((column, index) => ({
        id: column.id,
        width: widthLookup.get(column.id) ?? 200,
        visible: column.visible,
        order: index,
        pinned: column.pinned ?? null,
        optional: optionalLookup.get(column.id) ?? false,
      }));
    });
  }, []);

  const handleSearchChange = useCallback((value) => {
    setSearchQuery(value);
  }, []);

  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
  }, []);


  const customizeColumns = useMemo(() => {
    const sorted = columnState.slice().sort((a, b) => a.order - b.order);
    return sorted.map((column) => {
      const definition = definitionLookup.get(column.id) ?? {};
      return {
        id: column.id,
        label: definition.label ?? column.id,
        visible: column.visible !== false,
        pinned: column.pinned ?? null,
        locked: Boolean(definition.locked),
        mandatory: Boolean(definition.locked),
      };
    });
  }, [columnState, definitionLookup]);

  const defaultCustomizeColumns = useMemo(() => {
    if (!defaultColumnState || defaultColumnState.length === 0) {
      return customizeColumns;
    }
    const sorted = defaultColumnState.slice().sort((a, b) => a.order - b.order);
    return sorted.map((column) => {
      const definition = definitionLookup.get(column.id) ?? {};
      return {
        id: column.id,
        label: definition.label ?? column.id,
        visible: column.visible !== false,
        pinned: column.pinned ?? null,
        locked: Boolean(definition.locked),
        mandatory: Boolean(definition.locked),
      };
    });
  }, [defaultColumnState, definitionLookup, customizeColumns]);

  const filterActionButtons = (
    <>
      <button
        type="button"
        className={styles.iconPrimaryButton}
        onClick={handleOpenAddTransaction}
        disabled={isFetching}
        aria-label="Add transaction"
        title="Add transaction"
      >
        <FiPlus aria-hidden />
      </button>
      <QuickAddModal
        context="transactions"
        onSelect={handleQuickActionSelect}
        disabled={isFetching}
        triggerLabel=""
        triggerAriaLabel="Quick add"
        className={styles.filterActionsQuickAdd}
      />
      <button
        type="button"
        className={styles.iconPrimaryButton}
        onClick={() => setIsCustomizeOpen(true)}
        aria-label="Customize columns"
        title="Customize columns"
      >
        <FiSettings aria-hidden />
      </button>
    </>
  );

  const filterButtonClassName = [
    styles.filterButton,
    activeFilterCount > 0 ? styles.filterButtonActive : '',
  ]
    .filter(Boolean)
    .join(' ');

  const filterTriggerButton = (
    <button
      type="button"
      className={filterButtonClassName}
      onClick={handleOpenFilterModal}
      aria-haspopup="dialog"
      aria-expanded={isFilterModalOpen ? 'true' : 'false'}
      aria-controls="transactions-filter-modal"
      title="Filter transactions"
    >
      <FiFilter aria-hidden />
      <span>Filters</span>
      {activeFilterCount > 0 ? (
        <span className={styles.countBadge} aria-label={`${activeFilterCount} filters active`}>
          {activeFilterCount}
        </span>
      ) : null}
    </button>
  );

  const selectionToolbarInline = selectedCount > 0 ? (
    <div className={styles.selectionInlineToolbar}>
      <SelectionToolbar
        selectedCount={selectedCount}
        onDelete={handleDeleteSelected}
        onDeselectAll={handleDeselectAll}
        onToggleShowSelected={() => handleToggleShowSelected(!showSelectedOnly)}
        isShowingSelectedOnly={showSelectedOnly}
        className={styles.selectionInlineDock}
      />
    </div>
  ) : null;

  const tabControls = (
    <TxnTabs activeTab={activeTab} onTabChange={handleTabChange} tabs={tabMetrics} />
  );

  const searchRowId = 'transactions-search-panel';
  const searchInputId = 'transactions-search-input';

  const renderSearchField = (extraClassName) => {
    const combinedClassName = [styles.searchField, extraClassName]
      .filter(Boolean)
      .join(' ');

    return (
      <PageToolbarSearch
        id={searchInputId}
        value={searchQuery}
        onChange={handleSearchChange}
        onClear={() => handleSearchChange('')}
        placeholder="Search transactions..."
        ariaLabel="Search transactions"
        inputRef={searchInputRef}
        className={combinedClassName}
      />
    );
  };

  const filterModal = (
    <ModalWrapper
      isOpen={isFilterModalOpen}
      onBackdropClick={handleCloseFilterModal}
      wrapperClassName={styles.modalWrapper}
      panelClassName={styles.modalContent}
      backdropClassName={styles.modalBackdrop}
    >
      <div id="transactions-filter-modal" className={styles.modalInner}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Filter transactions</h2>
          <button
            type="button"
            className={`${styles.iconButton} ${styles.toolbarIconButton}`.trim()}
            onClick={handleCloseFilterModal}
            aria-label="Close filters"
          >
            <FiX aria-hidden />
          </button>
        </div>
        <div className={styles.modalBody} role="group" aria-label="Filter transactions">
          <p className={styles.modalDescription}>
            Narrow down the history by people, accounts, categories, debt tags, amount ranges, and
            date periods.
          </p>
          <div className={styles.modalField}>
            <DropdownSimple
              id="transactions-filter-person"
              label="People"
              isOpen={openFilterDropdown === 'person'}
              onToggle={handleDropdownToggle}
              options={personOptions}
              value={pendingFilters.person}
              onSelect={(value) => handleFilterOptionSelect('person', value)}
              placeholder="Any person"
              optionFormatter={(value) =>
                value === 'all' ? 'Any person' : value
              }
            />
          </div>
          <div className={styles.modalField}>
            <DropdownSimple
              id="transactions-filter-account"
              label="Accounts"
              isOpen={openFilterDropdown === 'account'}
              onToggle={handleDropdownToggle}
              options={accountOptions}
              value={pendingFilters.account}
              onSelect={(value) => handleFilterOptionSelect('account', value)}
              placeholder="Any account"
              optionFormatter={(value) =>
                value === 'all' ? 'Any account' : value
              }
            />
          </div>
          <div className={styles.modalField}>
            <DropdownSimple
              id="transactions-filter-category"
              label="Categories"
              isOpen={openFilterDropdown === 'category'}
              onToggle={handleDropdownToggle}
              options={categoryOptions}
              value={pendingFilters.category}
              onSelect={(value) => handleFilterOptionSelect('category', value)}
              placeholder="Any category"
              optionFormatter={(value) =>
                value === 'all' ? 'Any category' : value
              }
            />
          </div>
          <div className={styles.modalField}>
            <DropdownSimple
              id="transactions-filter-debt-tag"
              label="Debt tags"
              isOpen={openFilterDropdown === 'debtTag'}
              onToggle={handleDropdownToggle}
              options={debtTagOptions}
              value={pendingFilters.debtTag}
              onSelect={(value) => handleFilterOptionSelect('debtTag', value)}
              placeholder="Any debt tag"
              optionFormatter={(value) =>
                value === 'all' ? 'Any debt tag' : value
              }
            />
          </div>
          <div className={styles.modalField}>
            <DropdownSimple
              id="transactions-filter-amount"
              label="Amount"
              isOpen={openFilterDropdown === 'amount'}
              onToggle={handleDropdownToggle}
              options={AMOUNT_FILTER_OPTIONS}
              value={pendingFilters.amountRange}
              onSelect={(value) => handleFilterOptionSelect('amountRange', value)}
              placeholder={AMOUNT_FILTER_LABELS.all}
              optionFormatter={(value) => AMOUNT_FILTER_LABELS[value] ?? value}
            />
          </div>
          <div className={styles.modalField}>
            <DropdownSimple
              id="transactions-filter-date"
              label="Date"
              isOpen={openFilterDropdown === 'date'}
              onToggle={handleDropdownToggle}
              options={DATE_FILTER_OPTIONS}
              value={pendingFilters.dateRange}
              onSelect={(value) => handleFilterOptionSelect('dateRange', value)}
              placeholder={DATE_FILTER_LABELS.all}
              optionFormatter={(value) => DATE_FILTER_LABELS[value] ?? value}
            />
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={handleCloseFilterModal}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`${styles.secondaryButton} ${styles.clearFilterButton}`.trim()}
            onClick={handleClearAllFilters}
            disabled={pendingFilterCount === 0}
          >
            Clear all
          </button>
          <button
            type="button"
            className={`${styles.primaryButton} ${styles.modalApply}`.trim()}
            onClick={handleApplyFilterModal}
          >
            Apply filters
          </button>
        </div>
      </div>
    </ModalWrapper>
  );

  const isAddModalOpen = addModalType !== null;

  const handleToggleSearch = useCallback(() => {
    if (!isCompact) {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
      return;
    }

    setIsSearchOpen((prev) => {
      if (prev && searchInputRef.current) {
        searchInputRef.current.blur();
      }
      return !prev;
    });
  }, [isCompact, searchInputRef]);

  const searchToggleAriaLabel = isCompact
    ? isSearchOpen
      ? 'Hide search'
      : 'Show search'
    : 'Focus search input';

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <AppLayout
      title="Transactions History"
      subtitle="Monitor every inflow, cashback, debt movement, and adjustment inside Money Flow."
    >
      {filterModal}
      <div className={pageShellStyles.screen}>
        <div className={styles.controlsRegion}>
          <div
            className={styles.actionsWrapper}
            data-floating={isCompact ? 'true' : 'false'}
            data-search-open={isSearchOpen ? 'true' : 'false'}
          >
            <div className={styles.actionsRow}>
              <div className={styles.leadingActions}>
                <div className={styles.actionButtons}>{filterActionButtons}</div>
                {filterTriggerButton}
              </div>
              {selectionToolbarInline}
              {!isCompact && (
                <div className={styles.actionsTools}>
                  <div className={styles.searchInline} role="search">
                    {renderSearchField(styles.searchInlineField)}
                  </div>
                  <div className={styles.filtersInline}>{tabControls}</div>
                </div>
              )}
              {isCompact && (
                <button
                  type="button"
                  className={styles.searchToggleButton}
                  onClick={handleToggleSearch}
                  aria-label={searchToggleAriaLabel}
                  aria-expanded={isSearchOpen}
                  aria-controls={searchRowId}
                  data-active={isSearchOpen ? 'true' : 'false'}
                >
                  {isSearchOpen ? <FiX aria-hidden /> : <FiSearch aria-hidden />}
                </button>
              )}
            </div>

            {isCompact && (
              <div
                id={searchRowId}
                role="search"
                className={styles.searchRow}
                data-open={isSearchOpen ? 'true' : 'false'}
                data-floating={isCompact ? 'true' : 'false'}
              >
                {renderSearchField()}
              </div>
            )}

            {isCompact && <div className={styles.tabsRow}>{tabControls}</div>}
          </div>
        </div>

        {columnDefinitions.length === 0 ? (
          <TablePanel data-testid="transactions-loading">
            <EmptyStateCard>
              <LoadingOverlay message="Refreshing data…" />
            </EmptyStateCard>
          </TablePanel>
        ) : (
          <TransactionsTable
            tableScrollRef={tableScrollRef}
            transactions={displayedTransactions}
            selectedIds={selectedIds}
            onSelectRow={handleSelectRow}
            onSelectAll={handleSelectAll}
            selectionSummary={selectionSummary}
            onOpenAdvanced={handleAdvanced}
            onBulkDelete={handleBulkDelete}
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
              onPageChange: (page) => {
                const maxPages = Math.max(1, serverPagination.totalPages || 1);
                const next = Math.min(Math.max(page, 1), maxPages);
                setCurrentPage(next);
              },
            }}
            isColumnReorderMode={false}
            onColumnVisibilityChange={handleColumnVisibilityChange}
            onColumnOrderChange={handleColumnOrderChange}
            sortState={sortState}
            onSortChange={handleSortStateChange}
            isShowingSelectedOnly={showSelectedOnly}
            onToggleShowSelected={handleToggleShowSelected}
            isFetching={isFetching}
            showSelectionToolbar={false}
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
      <ColumnsCustomizeModal
        context="transactions"
        open={isCustomizeOpen}
        onClose={() => setIsCustomizeOpen(false)}
        columns={customizeColumns}
        defaultColumns={defaultCustomizeColumns}
        onChange={handleCustomizeChange}
      />
    </AppLayout>
  );
}
