import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import AppLayout from '../../components/layout/AppShell/AppShell';
import { TransactionsTable } from '../../components/transactions/TransactionsTable';
import { FiMoreHorizontal, FiPlus, FiSearch, FiSettings, FiX } from 'react-icons/fi';

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
import { DropdownWithSearch, DropdownWithSearchContent } from '../../components/common/DropdownWithSearch';
import { SelectionToolbar } from '../../components/table/SelectionToolbar';
import { ColumnFilterPopover } from '../../components/table/filter/ColumnFilterPopover';
import {
  AMOUNT_OPERATOR_OPTIONS,
  MONTH_LABEL_LOOKUP,
  MONTH_OPTIONS,
  useTransactionsFilterController,
} from '../../components/transactions/filters/useTransactionsFilterController';
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
  const [isFilterManagerOpen, setIsFilterManagerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [availableTypes, setAvailableTypes] = useState([]);
  const [isCompact, setIsCompact] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const tableScrollRef = useRef(null);
  const savedScrollLeftRef = useRef(0);
  const searchInputRef = useRef(null);
  const transferLinkInfo = useMemo(() => buildTransferLinkInfo(transactions), [transactions]);

  const {
    filters,
    matchesActiveFilters,
    personOptions,
    accountOptions,
    categoryOptions,
    shopOptions,
    debtTagOptions,
    yearOptions,
    typeOptions,
    filterSearchValues,
    handleFilterSearchChange,
    resetFilterSearchValues,
    openFilterDropdown,
    setOpenFilterDropdown,
    activeFilterDescriptors,
    visibleFilterDescriptors,
    hasHiddenFilters,
    overflowBadgeCount,
    columnFilterContent,
    activeColumnFilter,
    handleClearAllFilters,
    handleSingleFilterChange,
    handleToggleDebtTag,
    handleAmountOperatorSelect,
    handleAmountValueChange,
    handleClearDate,
    amountOperatorLabelLookup,
    closeColumnFilterPopover,
  } = useTransactionsFilterController({
    transactions,
    resolvedTypeList: availableTypes.length > 0 ? availableTypes : undefined,
    onRequestTabChange: setActiveTab,
  });

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

  const activeFilterCount = activeFilterDescriptors.length;

  const handleOpenFilterManager = useCallback(() => {
    setOpenFilterDropdown(null);
    setIsFilterManagerOpen(true);
    closeColumnFilterPopover();
    resetFilterSearchValues();
  }, [closeColumnFilterPopover, resetFilterSearchValues, setOpenFilterDropdown]);

  const handleCloseFilterManager = useCallback(() => {
    setIsFilterManagerOpen(false);
    setOpenFilterDropdown(null);
    resetFilterSearchValues();
  }, [resetFilterSearchValues, setOpenFilterDropdown]);

  const handleClearAllFiltersClick = useCallback(() => {
    handleClearAllFilters();
    resetFilterSearchValues();
  }, [handleClearAllFilters, resetFilterSearchValues]);

  const handleDropdownToggle = useCallback(
    (id) => {
      setOpenFilterDropdown((current) => (current === id ? null : id));
    },
    [setOpenFilterDropdown],
  );

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

  const displayedTransactionsWithMetadata = useMemo(() => {
    const base = Array.isArray(displayedTransactions) ? displayedTransactions : [];
    if (base.length === 0) {
      return base;
    }

    const lookup = new Map();
    base.forEach((txn) => {
      const txnId = extractString(txn?.id);
      if (txnId) {
        lookup.set(txnId, txn);
      }
    });

    if (lookup.size === 0) {
      return base;
    }

    const pairAssignments = new Map();

    const assignPair = (idA, idB, roleA, roleB) => {
      const pairId = createTransferPairKey(idA, idB);
      if (!pairId) {
        return;
      }

      const existingA = pairAssignments.get(idA);
      if (!existingA) {
        pairAssignments.set(idA, { groupId: pairId, role: roleA });
      }

      const existingB = pairAssignments.get(idB);
      if (!existingB) {
        pairAssignments.set(idB, { groupId: pairId, role: roleB });
      }
    };

    base.forEach((txn) => {
      const txnId = extractString(txn?.id);
      if (!txnId) {
        return;
      }

      const linkedId = extractString(txn?.linkedTxn);
      if (linkedId && lookup.has(linkedId)) {
        assignPair(txnId, linkedId, 'source', 'target');
      }

      const inbound = transferLinkInfo?.inbound?.get(txnId);
      if (inbound instanceof Set) {
        inbound.forEach((sourceId) => {
          if (lookup.has(sourceId)) {
            assignPair(sourceId, txnId, 'source', 'target');
          }
        });
      }
    });

    if (pairAssignments.size === 0) {
      return base;
    }

    return base.map((txn) => {
      const txnId = extractString(txn?.id);
      if (!txnId) {
        return txn;
      }

      const assignment = pairAssignments.get(txnId);
      if (!assignment) {
        return txn;
      }

      if (
        txn.transferGroupId === assignment.groupId &&
        txn.transferGroupRole === assignment.role
      ) {
        return txn;
      }

      return {
        ...txn,
        transferGroupId: assignment.groupId,
        transferGroupRole: assignment.role,
      };
    });
  }, [displayedTransactions, transferLinkInfo]);

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

  const handleCustomizeChange = useCallback(
    (columnsConfig) => {
      setColumnState((prev) => {
        const widthLookup = new Map(prev.map((column) => [column.id, column.width]));
        const optionalLookup = new Map(prev.map((column) => [column.id, column.optional]));
        return columnsConfig.map((column, index) => {
          const definition = definitionLookup.get(column.id) ?? {};
          const minWidth = definition.minWidth ?? 120;
          const nextWidth = Math.max(
            minWidth,
            Math.round(
              column.width ?? widthLookup.get(column.id) ?? definition.defaultWidth ?? minWidth,
            ),
          );
          return {
            id: column.id,
            width: nextWidth,
            visible: column.visible,
            order: index,
            pinned: column.pinned ?? null,
            optional: optionalLookup.get(column.id) ?? false,
          };
        });
      });
    },
    [definitionLookup],
  );

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
        width: Math.max(
          definition.minWidth ?? 120,
          Math.round(column.width ?? definition.defaultWidth ?? definition.minWidth ?? 120),
        ),
        minWidth: definition.minWidth ?? 120,
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
        width: Math.max(
          definition.minWidth ?? 120,
          Math.round(column.width ?? definition.defaultWidth ?? definition.minWidth ?? 120),
        ),
        minWidth: definition.minWidth ?? 120,
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

  const filterManagerModal = (
    <ModalWrapper
      isOpen={isFilterManagerOpen}
      onBackdropClick={handleCloseFilterManager}
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
            onClick={handleCloseFilterManager}
            aria-label="Close filters"
          >
            <FiX aria-hidden />
          </button>
        </div>
        <div className={styles.modalBody} role="group" aria-label="Filter transactions">
          <p className={styles.modalDescription}>
            Narrow down the history by people, accounts, categories, debt tags, amount, year, and
            month.
          </p>
          <div className={styles.modalGrid}>
            <div className={styles.modalField}>
              <DropdownWithSearch
                id="person"
                label="People"
                isOpen={openFilterDropdown === 'person'}
                onToggle={handleDropdownToggle}
                options={personOptions}
                searchValue={filterSearchValues.person}
                onSearchChange={(value) => handleFilterSearchChange('person', value)}
                onSelectOption={(value) => handleSingleFilterChange('person', value)}
                selectedValue={filters.person ?? 'all'}
                placeholder="Any person"
                optionFormatter={(value) => (value === 'all' ? 'Any person' : value)}
              />
            </div>
            <div className={styles.modalField}>
              <DropdownWithSearch
                id="account"
                label="Accounts"
                isOpen={openFilterDropdown === 'account'}
                onToggle={handleDropdownToggle}
                options={accountOptions}
                searchValue={filterSearchValues.account}
                onSearchChange={(value) => handleFilterSearchChange('account', value)}
                onSelectOption={(value) => handleSingleFilterChange('account', value)}
                selectedValue={filters.account ?? 'all'}
                placeholder="Any account"
                optionFormatter={(value) => (value === 'all' ? 'Any account' : value)}
              />
            </div>
            <div className={styles.modalField}>
              <DropdownWithSearch
                id="category"
                label="Categories"
                isOpen={openFilterDropdown === 'category'}
                onToggle={handleDropdownToggle}
                options={categoryOptions}
                searchValue={filterSearchValues.category}
                onSearchChange={(value) => handleFilterSearchChange('category', value)}
                onSelectOption={(value) => handleSingleFilterChange('category', value)}
                selectedValue={filters.category ?? 'all'}
                placeholder="Any category"
                optionFormatter={(value) => (value === 'all' ? 'Any category' : value)}
              />
            </div>
            <div className={styles.modalField}>
              <DropdownWithSearch
                id="type"
                label="Type"
                isOpen={openFilterDropdown === 'type'}
                onToggle={handleDropdownToggle}
                options={typeOptions}
                searchValue={filterSearchValues.type}
                onSearchChange={(value) => handleFilterSearchChange('type', value)}
                onSelectOption={(value) => handleSingleFilterChange('type', value)}
                selectedValue={filters.type ?? 'all'}
                placeholder="Any type"
                optionFormatter={(value) => (value === 'all' ? 'Any type' : value)}
              />
            </div>
            <div className={styles.modalField}>
              <DropdownWithSearch
                id="shop"
                label="Shop"
                isOpen={openFilterDropdown === 'shop'}
                onToggle={handleDropdownToggle}
                options={shopOptions}
                searchValue={filterSearchValues.shop}
                onSearchChange={(value) => handleFilterSearchChange('shop', value)}
                onSelectOption={(value) => handleSingleFilterChange('shop', value)}
                selectedValue={filters.shop ?? 'all'}
                placeholder="Any shop"
                optionFormatter={(value) => (value === 'all' ? 'Any shop' : value)}
              />
            </div>
            <div className={styles.modalField}>
              <DropdownWithSearch
                id="debtTags"
                label="Debt tags"
                isOpen={openFilterDropdown === 'debtTags'}
                onToggle={handleDropdownToggle}
                options={debtTagOptions}
                searchValue={filterSearchValues.debtTags}
                onSearchChange={(value) => handleFilterSearchChange('debtTags', value)}
                onSelectOption={handleToggleDebtTag}
                selectedValues={filters.debtTags}
                multi
                placeholder="Any debt tag"
                optionFormatter={(value) => (value === 'all' ? 'Any debt tag' : value)}
                renderValue={(_, fallback) =>
                  Array.isArray(filters.debtTags) && filters.debtTags.length > 0
                    ? `${filters.debtTags.length} selected`
                    : fallback
                }
              />
            </div>
            <div className={`${styles.modalField} ${styles.modalFieldWide}`.trim()}>
              <div className={styles.amountFilterRow}>
                <DropdownSimple
                  id="amount-operator"
                  label="Amount operator"
                  isOpen={openFilterDropdown === 'amount-operator'}
                  onToggle={handleDropdownToggle}
                  options={AMOUNT_OPERATOR_OPTIONS.map((option) => option.value)}
                  value={filters.amountOperator ?? 'all'}
                  onSelect={handleAmountOperatorSelect}
                  placeholder="Any amount"
                  optionFormatter={(value) =>
                    value === 'all'
                      ? 'Any amount'
                      : amountOperatorLabelLookup.get(value) ?? value
                  }
                />
                <label htmlFor="transactions-filter-amount-value" className={styles.modalLabel}>
                  Amount value
                  <input
                    id="transactions-filter-amount-value"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    className={styles.modalControl}
                    value={filters.amountValue}
                    onChange={handleAmountValueChange}
                    placeholder="Enter amount"
                    disabled={filters.amountOperator === 'is-null' || !filters.amountOperator}
                  />
                </label>
              </div>
            </div>
            <div className={styles.modalField}>
              <DropdownSimple
                id="year"
                label="Year"
                isOpen={openFilterDropdown === 'year'}
                onToggle={handleDropdownToggle}
                options={yearOptions}
                value={filters.year ?? 'all'}
                onSelect={(value) => handleSingleFilterChange('year', value)}
                placeholder="Any year"
                optionFormatter={(value) => (value === 'all' ? 'Any year' : value)}
              />
            </div>
            <div className={styles.modalField}>
              <DropdownSimple
                id="month"
                label="Month"
                isOpen={openFilterDropdown === 'month'}
                onToggle={handleDropdownToggle}
                options={MONTH_OPTIONS.map((option) => option.value)}
                value={filters.month ?? 'all'}
                onSelect={(value) => handleSingleFilterChange('month', value)}
                placeholder="Any month"
                optionFormatter={(value) =>
                  value === 'all' ? 'Any month' : MONTH_LABEL_LOOKUP.get(String(value)) ?? value
                }
              />
            </div>
          </div>
          {Array.isArray(filters.debtTags) && filters.debtTags.length > 0 ? (
            <div className={styles.modalTagBadges} aria-live="polite">
              {filters.debtTags.map((tag) => (
                <button
                  key={`selected-debt-tag-${tag}`}
                  type="button"
                  className={styles.modalTagBadge}
                  onClick={() => handleToggleDebtTag(tag)}
                  title={`Remove ${tag}`}
                >
                  <span className={styles.modalTagLabel}>{tag}</span>
                  <FiX aria-hidden className={styles.modalTagRemove} />
                  <span className={styles.srOnly}>Remove {tag}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div className={styles.modalFooter}>
          <button
            type="button"
            className={`${styles.secondaryButton} ${styles.clearFilterButton}`.trim()}
            onClick={handleClearAllFiltersClick}
            disabled={activeFilterCount === 0}
          >
            Clear all
          </button>
          <button
            type="button"
            className={`${styles.primaryButton} ${styles.modalApply}`.trim()}
            onClick={handleCloseFilterManager}
          >
            Done
          </button>
        </div>
      </div>
    </ModalWrapper>
  );

  const activeFiltersRow = activeFilterCount > 0 ? (
    <div className={styles.activeFiltersRow} role="region" aria-live="polite">
      <div className={styles.activeFilterBadges}>
        {visibleFilterDescriptors.map((descriptor) => (
          <button
            key={descriptor.key}
            type="button"
            className={styles.activeFilterBadge}
            onClick={descriptor.onClear}
            title={`Remove ${descriptor.label}`}
          >
            <span className={styles.activeFilterLabel}>{descriptor.label}</span>
            <FiX aria-hidden className={styles.activeFilterRemove} />
            <span className={styles.srOnly}>Remove {descriptor.label}</span>
          </button>
        ))}
        {hasHiddenFilters ? (
          <button
            type="button"
            className={styles.activeFilterMore}
            onClick={handleOpenFilterManager}
            aria-label="Show all filters"
          >
            <FiMoreHorizontal aria-hidden />
            <span className={styles.activeFilterMoreCount}>+{overflowBadgeCount}</span>
            <span className={styles.srOnly}>Show {overflowBadgeCount} more filters</span>
          </button>
        ) : null}
      </div>
      <button
        type="button"
        className={`${styles.secondaryButton} ${styles.clearFilterButton}`.trim()}
        onClick={handleClearAllFiltersClick}
      >
        Clear all
      </button>
    </div>
  ) : null;

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
      {filterManagerModal}
      <ColumnFilterPopover
        activeFilter={activeColumnFilter}
        contentMap={columnFilterContent}
        onRequestClose={closeColumnFilterPopover}
      />
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

        {activeFiltersRow}

        {columnDefinitions.length === 0 ? (
          <TablePanel data-testid="transactions-loading">
            <EmptyStateCard>
              <LoadingOverlay message="Refreshing data…" />
            </EmptyStateCard>
          </TablePanel>
        ) : (
          <TransactionsTable
            tableScrollRef={tableScrollRef}
            transactions={displayedTransactionsWithMetadata}
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
