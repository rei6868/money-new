import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import AppLayout from '../../components/AppLayout';
import { TransactionsTable } from '../../components/transactions/TransactionsTable';
import { FiPlus, FiSettings } from 'react-icons/fi';

import { useRequireAuth } from '../../hooks/useRequireAuth';
import styles from '../../styles/TransactionsHistory.module.css';
import TransactionAdvancedModal from '../../components/transactions/TransactionAdvancedModal';
import LoadingOverlay from '../../components/common/LoadingOverlay';
import AddModalGlobal from '../../components/common/AddModalGlobal';
import QuickAddModal from '../../components/common/QuickAddModal';
import ColumnsCustomizeModal from '../../components/customize/ColumnsCustomizeModal';
import FilterBar from '../../components/filters/FilterBar';
import FilterModal from '../../components/filters/FilterModal';
import { createEmptyFilters } from '../../components/filters/filterTypes';
import TxnTabs from '../../components/transactions/TxnTabs';
import { useMediaQuery } from '../../components/common/ActionBar';
import {
  TRANSACTION_TYPE_VALUES,
  getTransactionTypeLabel,
  normalizeTransactionType,
} from '../../lib/transactions/transactionTypes';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 30];

function extractString(value) {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

function ensureStringArray(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => extractString(item))
      .filter((item) => Boolean(item));
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => extractString(item))
      .filter((item) => Boolean(item));
  }
  return [];
}

function getTransactionField(txn, keys) {
  for (const key of keys) {
    if (key in txn) {
      const extracted = extractString(txn[key]);
      if (extracted) {
        return extracted;
      }
    }
  }
  return null;
}

function getTransactionDate(txn) {
  const candidates = [
    txn.date,
    txn.transactionDate,
    txn.transaction_date,
    txn.postedAt,
    txn.posted_at,
    txn.createdAt,
    txn.created_at,
  ];
  for (const candidate of candidates) {
    if (candidate instanceof Date && !Number.isNaN(candidate.getTime())) {
      return candidate;
    }
    if (typeof candidate === 'string' || typeof candidate === 'number') {
      const parsed = new Date(candidate);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
  }
  return null;
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

function buildTransactionPredicate(filterState, normalizedQuery, transferOnly = false) {
  const accountFilter = new Set(
    (filterState.accounts || []).map((value) => value.toLowerCase()),
  );
  const peopleFilter = new Set((filterState.people || []).map((value) => value.toLowerCase()));
  const tagFilter = new Set((filterState.debtTags || []).map((value) => value.toLowerCase()));
  const categoryFilter = new Set(
    (filterState.categories || []).map((value) => value.toLowerCase()),
  );
  const typeFilter = typeof filterState.type === 'string'
    ? filterState.type.trim().toLowerCase()
    : null;

  const rangeStart = filterState.dateRange?.start ? new Date(filterState.dateRange.start) : null;
  const rangeEnd = filterState.dateRange?.end ? new Date(filterState.dateRange.end) : null;

  let adjustedEnd = null;
  if (rangeEnd) {
    adjustedEnd = new Date(rangeEnd);
    adjustedEnd.setHours(23, 59, 59, 999);
  }

  return (txn) => {
    if (accountFilter.size > 0) {
      const accountCandidates = [
        txn.account,
        txn.accountName,
        txn.account_name,
        txn.fromAccount,
        txn.from_account,
        txn.toAccount,
        txn.to_account,
      ];
      const accounts = [
        ...ensureStringArray(txn.accounts),
        ...accountCandidates.map((candidate) => extractString(candidate)).filter(Boolean),
      ].map((value) => value.toLowerCase());
      if (!accounts.some((value) => accountFilter.has(value))) {
        return false;
      }
    }

    if (peopleFilter.size > 0) {
      const peopleCandidates = [
        txn.person,
        txn.people,
        txn.contact,
        txn.contactName,
        txn.contact_name,
        txn.customer,
        txn.vendor,
        txn.owner,
      ];
      const peopleValues = [
        ...peopleCandidates.map((candidate) => extractString(candidate)).filter(Boolean),
        ...ensureStringArray(txn.peopleList),
      ].map((value) => value.toLowerCase());
      if (!peopleValues.some((value) => peopleFilter.has(value))) {
        return false;
      }
    }

    if (categoryFilter.size > 0) {
      const categories = [
        txn.category,
        txn.categoryName,
        txn.category_name,
        txn.segment,
      ]
        .map((candidate) => extractString(candidate))
        .filter(Boolean)
        .map((value) => value.toLowerCase());
      if (!categories.some((value) => categoryFilter.has(value))) {
        return false;
      }
    }

    if (typeFilter) {
      const rawType = extractString(txn.typeRaw ?? txn.type);
      if (!rawType || rawType.toLowerCase() !== typeFilter) {
        return false;
      }
    }

    if (transferOnly) {
      const transferType = extractString(txn.typeRaw ?? txn.type);
      const linkedId = extractString(txn.linkedTxn);
      const normalizedType = transferType ? transferType.toLowerCase() : '';
      if (normalizedType !== 'expense' || !linkedId) {
        return false;
      }
    }

    if (tagFilter.size > 0) {
      const tags = [
        ...ensureStringArray(txn.tags),
        ...ensureStringArray(txn.debtTags),
        ...ensureStringArray(txn.labels),
      ].map((value) => value.toLowerCase());
      if (!tags.some((value) => tagFilter.has(value))) {
        return false;
      }
    }

    if (rangeStart || adjustedEnd) {
      const txnDate = getTransactionDate(txn);
      if (!txnDate) {
        return false;
      }
      if (rangeStart && txnDate < rangeStart) {
        return false;
      }
      if (adjustedEnd && txnDate > adjustedEnd) {
        return false;
      }
    }

    if (!normalizedQuery) {
      return true;
    }

    const searchableKeys = [
      'notes',
      'description',
      'shop',
      'account',
      'category',
      'owner',
      'type',
      'id',
    ];
    return searchableKeys.some((key) => {
      const rawValue = txn?.[key];
      if (rawValue === null || rawValue === undefined) {
        return false;
      }
      return String(rawValue).toLowerCase().includes(normalizedQuery);
    });
  };
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
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState(() => createEmptyFilters());
  const [activeTab, setActiveTab] = useState('all');
  const [availableTypes, setAvailableTypes] = useState([]);
  const [transferOnly, setTransferOnly] = useState(false);
  const isMobileLayout = useMediaQuery('(max-width: 600px)');
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

  const filterOptions = useMemo(() => {
    const base = Array.isArray(transactions) ? transactions : [];
    const accountSet = new Set();
    const peopleSet = new Set();
    const tagSet = new Set();
    const categorySet = new Set();

    base.forEach((txn) => {
      const accountCandidates = [
        txn.account,
        txn.accountName,
        txn.account_name,
        txn.fromAccount,
        txn.from_account,
        txn.toAccount,
        txn.to_account,
      ];
      ensureStringArray(txn.accounts).forEach((value) => accountSet.add(value));
      accountCandidates.forEach((candidate) => {
        const value = extractString(candidate);
        if (value) {
          accountSet.add(value);
        }
      });

      const peopleCandidates = [
        txn.person,
        txn.people,
        txn.contact,
        txn.contactName,
        txn.contact_name,
        txn.customer,
        txn.vendor,
        txn.owner,
      ];
      peopleCandidates.forEach((candidate) => {
        const value = extractString(candidate);
        if (value) {
          peopleSet.add(value);
        }
      });
      ensureStringArray(txn.peopleList).forEach((value) => peopleSet.add(value));

      ensureStringArray(txn.tags).forEach((value) => tagSet.add(value));
      ensureStringArray(txn.debtTags).forEach((value) => tagSet.add(value));
      ensureStringArray(txn.labels).forEach((value) => tagSet.add(value));

      const categoryCandidates = [
        txn.category,
        txn.categoryName,
        txn.category_name,
        txn.segment,
      ];
      categoryCandidates.forEach((candidate) => {
        const value = extractString(candidate);
        if (value) {
          categorySet.add(value);
        }
      });

    });

    const toOptions = (set) =>
      Array.from(set).map((value) => ({
        label: value,
        value,
      }));

    return {
      accounts: toOptions(accountSet),
      people: toOptions(peopleSet),
      debtTags: toOptions(tagSet),
      categories: toOptions(categorySet),
    };
  }, [transactions]);

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

  const filteredTransactions = useMemo(() => {
    const base = Array.isArray(transactions) ? transactions : [];
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const predicate = buildTransactionPredicate(filters, normalizedQuery, transferOnly);
    return base.filter(predicate);
  }, [transactions, filters, searchQuery, transferOnly]);

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

  const tabMetrics = useMemo(() => {
    const base = Array.isArray(transactions) ? transactions : [];
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const baseFilter = {
      ...filters,
      type: null,
    };
    const predicate = buildTransactionPredicate(baseFilter, normalizedQuery, false);
    const baseMatches = base.filter(predicate);
    const counts = new Map();
    baseMatches.forEach((txn) => {
      const rawType = extractString(txn.typeRaw ?? txn.type);
      if (rawType) {
        const key = rawType;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    });
    const transferMatches = baseMatches.filter((txn) => {
      const rawType = extractString(txn.typeRaw ?? txn.type);
      const linkedId = extractString(txn.linkedTxn);
      return rawType?.toLowerCase() === 'expense' && Boolean(linkedId);
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
      count: transferMatches.length,
    });

    return tabs;
  }, [filters, searchQuery, transactions, resolvedTypeList]);

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
    setFilters((current) => {
      const next = { ...current };
      if (tabId === 'all' || tabId === TRANSACTION_TYPE_VALUES.TRANSFER) {
        next.type = null;
      } else {
        next.type = tabId;
      }
      return next;
    });
    setTransferOnly(tabId === TRANSACTION_TYPE_VALUES.TRANSFER);
  }, []);

  useEffect(() => {
    if (filters?.type) {
      if (activeTab !== filters.type) {
        setActiveTab(filters.type);
      }
      if (transferOnly) {
        setTransferOnly(false);
      }
      return;
    }

    if (transferOnly) {
      if (activeTab !== TRANSACTION_TYPE_VALUES.TRANSFER) {
        setActiveTab(TRANSACTION_TYPE_VALUES.TRANSFER);
      }
      return;
    }

    if (activeTab !== 'all') {
      setActiveTab('all');
    }
  }, [activeTab, filters?.type, transferOnly]);

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
    <div className={styles.filterActions}>
      <button
        type="button"
        className={styles.primaryButton}
        onClick={handleOpenAddTransaction}
        disabled={isFetching}
        aria-label="Add transaction"
      >
        <FiPlus aria-hidden />
        <span>Add transaction</span>
      </button>
      <QuickAddModal
        context="transactions"
        onSelect={handleQuickActionSelect}
        disabled={isFetching}
        triggerLabel="Quick add"
        triggerAriaLabel="Quick add transaction"
        className={styles.filterActionsQuickAdd}
      />
      <button
        type="button"
        className={styles.secondaryButton}
        onClick={() => setIsCustomizeOpen(true)}
        aria-label="Customize columns"
      >
        <FiSettings aria-hidden />
        <span>Customize</span>
      </button>
    </div>
  );

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
        <div className={styles.controlsRegion}>
          {isMobileLayout ? (
            <>
              <TxnTabs activeTab={activeTab} onTabChange={handleTabChange} tabs={tabMetrics} />
              <FilterBar
                searchQuery={searchQuery}
                onSearchChange={handleSearchChange}
                filters={filters}
                onFiltersChange={setFilters}
                onOpenFilters={() => setIsFilterOpen(true)}
                savedViewStorageKey="mf.transactions.views"
                leadingActions={filterActionButtons}
              />
            </>
          ) : (
            <FilterBar
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
              filters={filters}
              onFiltersChange={setFilters}
              onOpenFilters={() => setIsFilterOpen(true)}
              savedViewStorageKey="mf.transactions.views"
              leadingActions={filterActionButtons}
              tabs={<TxnTabs activeTab={activeTab} onTabChange={handleTabChange} tabs={tabMetrics} />}
            />
          )}
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
            onBulkDelete={(ids) => {
              console.info('Transactions bulk delete placeholder', ids);
            }}
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
      <ColumnsCustomizeModal
        context="transactions"
        open={isCustomizeOpen}
        onClose={() => setIsCustomizeOpen(false)}
        columns={customizeColumns}
        defaultColumns={defaultCustomizeColumns}
        onChange={handleCustomizeChange}
      />
      <FilterModal
        open={isFilterOpen}
        filters={filters}
        onApply={setFilters}
        onClose={() => setIsFilterOpen(false)}
        options={filterOptions}
      />
    </AppLayout>
  );
}
