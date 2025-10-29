import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import AppLayout from '../../components/AppLayout';
import AccountsCardsView from '../../components/accounts/AccountsCardsView';
import AccountTypeTabs from '../../components/accounts/AccountTypeTabs';
import TableAccounts from '../../components/accounts/TableAccounts';
import AccountEditModal, { AccountEditPayload } from '../../components/accounts/AccountEditModal';
import AddModalGlobal, { AddModalType } from '../../components/common/AddModalGlobal';
import QuickAddModal from '../../components/common/QuickAddModal';
import { FiPlus, FiSettings, FiSearch, FiX } from 'react-icons/fi';
import ColumnsCustomizeModal, {
  ColumnConfig as CustomizeColumnConfig,
} from '../../components/customize/ColumnsCustomizeModal';
import {
  ACCOUNT_COLUMN_DEFINITIONS,
  ACCOUNT_SORTERS,
  AccountColumnDefinition,
  AccountRow,
  createDefaultColumnState,
} from '../../components/accounts/accountColumns';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { useAccounts } from '../../hooks/useAccounts';
import { getAccountTypeLabel } from '../../lib/accounts/accountTypes';
import styles from '../../styles/accounts.module.css';

type ColumnState = ReturnType<typeof createDefaultColumnState>[number] & {
  pinned?: 'left' | 'right' | null;
};

type NormalizedAccount = AccountRow & {
  raw: Record<string, unknown>;
};

const PAGE_SIZE_OPTIONS = [5, 10, 20, 30];

function parseNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined) {
    return fallback;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeAccount(raw: Record<string, unknown>): NormalizedAccount | null {
  const accountId =
    (raw.accountId as string | undefined) ?? (raw.account_id as string | undefined) ?? null;
  if (!accountId) {
    return null;
  }

  return {
    accountId,
    accountName:
      (raw.accountName as string | undefined) ??
      (raw.account_name as string | undefined) ??
      'Unnamed account',
    accountType:
      (raw.accountType as string | undefined) ??
      (raw.account_type as string | undefined) ??
      'other',
    openingBalance: parseNumber(raw.openingBalance ?? raw.opening_balance),
    currentBalance: parseNumber(raw.currentBalance ?? raw.current_balance),
    totalIn: parseNumber(raw.totalIn ?? raw.total_in),
    totalOut: parseNumber(raw.totalOut ?? raw.total_out),
    status: (raw.status as string | undefined) ?? 'inactive',
    notes: (raw.notes as string | undefined) ?? '',
    parentAccountId:
      (raw.parentAccountId as string | undefined) ??
      (raw.parent_account_id as string | undefined) ??
      null,
    imgUrl: (raw.imgUrl as string | undefined) ?? (raw.img_url as string | undefined) ?? null,
    raw,
  };
}

function extractString(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

function toUniqueOptions(values: (string | null | undefined)[]): Array<{ label: string; value: string }> {
  const seen = new Set<string>();
  const options: Array<{ label: string; value: string }> = [];
  values.forEach((value) => {
    const normalized = extractString(value ?? null);
    if (!normalized) {
      return;
    }
    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    options.push({ label: normalized, value: normalized });
  });
  return options;
}

function extractDebtTags(account: NormalizedAccount): string[] {
  const source = account.raw?.debtTags ?? account.raw?.debt_tags ?? account.raw?.tags ?? null;
  if (Array.isArray(source)) {
    return source
      .map((value) => extractString(value))
      .filter((value): value is string => Boolean(value));
  }
  if (typeof source === 'string') {
    return source
      .split(',')
      .map((item) => extractString(item))
      .filter((value): value is string => Boolean(value));
  }
  return [];
}

function extractAccountDate(account: NormalizedAccount): Date | null {
  const candidates = [
    account.raw?.createdAt,
    account.raw?.created_at,
    account.raw?.openedAt,
    account.raw?.opened_at,
    account.raw?.updatedAt,
    account.raw?.updated_at,
  ];

  for (const candidate of candidates) {
    if (candidate instanceof Date && !Number.isNaN(candidate.getTime())) {
      return candidate;
    }
    if (typeof candidate === 'string') {
      const parsed = new Date(candidate);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      const parsed = new Date(candidate);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
  }
  return null;
}

function resolveSortedAccounts(
  accounts: NormalizedAccount[],
  sorterId: string | null,
  direction: 'asc' | 'desc' | null,
) {
  if (!sorterId || !direction) {
    return accounts.slice();
  }
  const accessor = ACCOUNT_SORTERS[sorterId];
  if (!accessor) {
    return accounts.slice();
  }
  const multiplier = direction === 'desc' ? -1 : 1;
  return accounts.slice().sort((a, b) => {
    const left = accessor(a);
    const right = accessor(b);
    if (typeof left === 'number' && typeof right === 'number') {
      return (left - right) * multiplier;
    }
    const leftStr = String(left ?? '').toLowerCase();
    const rightStr = String(right ?? '').toLowerCase();
    if (leftStr === rightStr) {
      return 0;
    }
    return leftStr > rightStr ? multiplier : -multiplier;
  });
}

export default function AccountsPage() {
  const { isAuthenticated, isLoading } = useRequireAuth();
  const { accounts: accountsData, refetch: refetchAccounts, createAccount } = useAccounts();

  const [accounts, setAccounts] = useState<NormalizedAccount[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [columnState, setColumnState] = useState<ColumnState[]>(() =>
    createDefaultColumnState(ACCOUNT_COLUMN_DEFINITIONS).map((column) => ({
      ...column,
      pinned: null,
    })),
  );
  const [defaultColumnState] = useState<ColumnState[]>(() =>
    createDefaultColumnState(ACCOUNT_COLUMN_DEFINITIONS).map((column) => ({
      ...column,
      pinned: null,
    })),
  );
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[1] ?? PAGE_SIZE_OPTIONS[0]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortState, setSortState] = useState<{
    columnId: string | null;
    direction: 'asc' | 'desc' | null;
  }>({
    columnId: 'accountName',
    direction: 'asc',
  });
  const [activeTab, setActiveTab] = useState<'table' | 'cards'>('table');
  const [activeTypeTab, setActiveTypeTab] = useState<string>(() => {
    // Load from localStorage if available
    if (typeof window !== 'undefined') {
      return localStorage.getItem('accountsTypeFilter') || 'all';
    }
    return 'all';
  });
  const [addModalType, setAddModalType] = useState<AddModalType | null>(null);
  const [quickAction, setQuickAction] = useState<string | null>(null);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingAccount, setEditingAccount] = useState<NormalizedAccount | null>(null);
  const [accountTypes, setAccountTypes] = useState<string[]>([]);

  const tableScrollRef = useRef<HTMLDivElement | null>(null);

  // Persist active type tab to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accountsTypeFilter', activeTypeTab);
    }
  }, [activeTypeTab]);

  const definitionLookup = useMemo(
    () => new Map(ACCOUNT_COLUMN_DEFINITIONS.map((definition) => [definition.id, definition])),
    [],
  );



  const validColumnIds = useMemo(
    () =>
      new Set<ColumnState['id']>(
        ACCOUNT_COLUMN_DEFINITIONS.map((definition) => definition.id as ColumnState['id']),
      ),
    [],
  );

  const resolveFallbackWidth = useCallback(
    (id: ColumnState['id']) => {
      const definition = definitionLookup.get(id);
      if (!definition) {
        return 200;
      }
      const minWidth = definition.minWidth ?? 160;
      const defaultWidth = definition.defaultWidth ?? minWidth;
      return Math.max(defaultWidth, minWidth);
    },
    [definitionLookup],
  );

  const orderedColumns = useMemo<ColumnState[]>(() => {
    if (columnState.length === 0) {
      return [];
    }
    const sorted = columnState.slice().sort((a, b) => a.order - b.order);
    const pinnedLeft = sorted.filter((column) => column.pinned === 'left');
    const pinnedRight = sorted.filter((column) => column.pinned === 'right');
    const unpinned = sorted.filter((column) => column.pinned !== 'left' && column.pinned !== 'right');
    const arranged = [...pinnedLeft, ...unpinned, ...pinnedRight];

    return arranged.map((state, index) => {
      const definition = definitionLookup.get(state.id) as AccountColumnDefinition | undefined;
      const minWidth = definition?.minWidth ?? 160;
      const defaultVisible = definition?.defaultVisible !== false;
      const normalizedWidth = Math.max(
        state.width ?? definition?.defaultWidth ?? minWidth,
        minWidth,
      );

      return {
        ...state,
        order: index,
        width: normalizedWidth,
        visible: state.visible ?? defaultVisible,
        optional: Boolean(state.optional ?? definition?.optional),
        pinned: state.pinned ?? null,
      };
    });
  }, [columnState, definitionLookup]);

  const visibleColumns = useMemo<ColumnState[]>(
    () => orderedColumns.filter((column) => column.visible !== false),
    [orderedColumns],
  );

  const allColumnsVisible = useMemo(
    () => orderedColumns.every((column) => column.visible !== false),
    [orderedColumns],
  );

  const optionalColumnsVisible = useMemo(() => {
    const optionalColumns = orderedColumns.filter((column) => column.optional);
    if (optionalColumns.length === 0) {
      return false;
    }
    return optionalColumns.every((column) => column.visible !== false);
  }, [orderedColumns]);

  const customizeColumns = useMemo(() => {
    const sorted = columnState.slice().sort((a, b) => a.order - b.order);
    return sorted.map((column) => {
      const definition = definitionLookup.get(column.id) as AccountColumnDefinition | undefined;
      return {
        id: column.id,
        label: definition?.label ?? column.id,
        visible: column.visible !== false,
        pinned: column.pinned ?? null,
        locked: column.id === 'accountName',
        mandatory: column.id === 'accountName',
      };
    });
  }, [columnState, definitionLookup]);

  const defaultCustomizeColumns = useMemo(() => {
    if (!defaultColumnState || defaultColumnState.length === 0) {
      return customizeColumns;
    }
    const sorted = defaultColumnState.slice().sort((a, b) => a.order - b.order);
    return sorted.map((column) => {
      const definition = definitionLookup.get(column.id) as AccountColumnDefinition | undefined;
      return {
        id: column.id,
        label: definition?.label ?? column.id,
        visible: column.visible !== false,
        pinned: column.pinned ?? null,
        locked: column.id === 'accountName',
        mandatory: column.id === 'accountName',
      };
    });
  }, [defaultColumnState, definitionLookup, customizeColumns]);

  // Sync accounts from hook to local state
  useEffect(() => {
    const normalized = accountsData
      .map((row) => normalizeAccount(row as unknown as Record<string, unknown>))
      .filter((row): row is NormalizedAccount => Boolean(row));
    setAccounts(normalized);
  }, [accountsData]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let isCancelled = false;

    fetch('/api/accounts/types')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch account types');
        }
        return response.json();
      })
      .then((data) => {
        if (isCancelled) {
          return;
        }
        const rawTypes: unknown[] = Array.isArray(data?.types) ? data.types : [];
        const normalized = Array.from(
          new Set(
            rawTypes
              .filter((value): value is string => typeof value === 'string')
              .map((value) => value.trim())
              .filter((value) => value.length > 0),
          ),
        );
        setAccountTypes(normalized);
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

  useEffect(() => {
    if (selectedIds.length === 0) {
      setShowSelectedOnly(false);
      return;
    }
    const availableIds = new Set(accounts.map((account) => account.accountId));
    setSelectedIds((prev) => prev.filter((id) => availableIds.has(id)));
  }, [accounts, selectedIds.length]);

  const sortedAccounts = useMemo(
    () => resolveSortedAccounts(accounts, sortState.columnId, sortState.direction),
    [accounts, sortState],
  );

  const filteredAccounts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return sortedAccounts.filter((account) => {
      // Filter by account type tab
      if (activeTypeTab !== 'all' && account.accountType !== activeTypeTab) {
        return false;
      }

      // Filter by search query
      if (!normalizedQuery) {
        return true;
      }

      const haystack = [
        account.accountName,
        account.accountType,
        account.status,
        account.notes,
        account.accountId,
      ];
      return haystack.some((value) =>
        typeof value === 'string' && value.toLowerCase().includes(normalizedQuery),
      );
    });
  }, [searchQuery, sortedAccounts, activeTypeTab]);



  const totalPages = useMemo(() => {
    if (filteredAccounts.length === 0) {
      return 1;
    }
    return Math.max(1, Math.ceil(filteredAccounts.length / pageSize));
  }, [filteredAccounts.length, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedAccounts = useMemo(() => {
    if (activeTab === 'cards') {
      return filteredAccounts;
    }
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredAccounts.slice(start, end);
  }, [filteredAccounts, currentPage, pageSize, activeTab]);

  const selectedLookup = useMemo(() => new Set(selectedIds), [selectedIds]);

  const displayedAccounts = useMemo(() => {
    if (!showSelectedOnly) {
      return paginatedAccounts;
    }
    return paginatedAccounts.filter((account) => selectedLookup.has(account.accountId));
  }, [paginatedAccounts, showSelectedOnly, selectedLookup]);

  const selectionSummary = useMemo(() => {
    if (selectedIds.length === 0) {
      return { count: 0, amount: 0, totalBack: 0, finalPrice: 0 };
    }
    const lookup = new Set(selectedIds);
    const amount = accounts.reduce((sum, account) => {
      if (lookup.has(account.accountId)) {
        return sum + (account.currentBalance ?? 0);
      }
      return sum;
    }, 0);
    return {
      count: lookup.size,
      amount,
      totalBack: 0,
      finalPrice: 0,
    };
  }, [accounts, selectedIds]);

  const handleSelectRow = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      if (checked) {
        if (prev.includes(id)) {
          return prev;
        }
        return [...prev, id];
      }
      return prev.filter((value) => value !== id);
    });
  }, []);

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (!checked) {
        setSelectedIds([]);
        return;
      }
      const source = showSelectedOnly ? displayedAccounts : paginatedAccounts;
      setSelectedIds((prev) => {
        const merged = new Set(prev);
        source.forEach((account) => merged.add(account.accountId));
        return Array.from(merged);
      });
    },
    [displayedAccounts, paginatedAccounts, showSelectedOnly],
  );

  const handleToggleShowSelected = useCallback((next: boolean) => {
    setShowSelectedOnly(next);
  }, []);

  const handleColumnVisibilityChange = useCallback((columnId: string, visible: boolean) => {
    setColumnState((prev) =>
      prev.map((column) =>
        column.id === columnId ? { ...column, visible: Boolean(visible) } : column,
      ),
    );
  }, []);

  const handleColumnOrderChange = useCallback((orderedVisibleIds: string[]) => {
    setColumnState((prev) => {
      if (!Array.isArray(orderedVisibleIds) || orderedVisibleIds.length === 0) {
        return prev;
      }

      const visibleLookup = new Map(orderedVisibleIds.map((id, index) => [id, index]));
      const detached = prev.slice();
      const visibleOnly = detached.filter((column) => visibleLookup.has(column.id));
      const hidden = detached.filter((column) => !visibleLookup.has(column.id));

      visibleOnly.sort(
        (a, b) => (visibleLookup.get(a.id) ?? 0) - (visibleLookup.get(b.id) ?? 0),
      );

      const merged = [...visibleOnly, ...hidden];
      return merged.map((column, index) => ({ ...column, order: index }));
    });
  }, []);

  const handleSortChange = useCallback((columnId: string | null, direction: 'asc' | 'desc' | null) => {
    if (!columnId || !direction) {
      setSortState({ columnId: null, direction: null });
      return;
    }
    setSortState({ columnId, direction });
  }, []);

  const pagination = useMemo(
    () => ({
      pageSize,
      pageSizeOptions: PAGE_SIZE_OPTIONS,
      currentPage,
      totalPages,
      onPageSizeChange: (value: number) => {
        const normalized = PAGE_SIZE_OPTIONS.includes(value) ? value : PAGE_SIZE_OPTIONS[0];
        setPageSize(normalized);
        setCurrentPage(1);
      },
      onPageChange: (page: number) => {
        const clamped = Math.min(Math.max(page, 1), totalPages);
        setCurrentPage(clamped);
      },
    }),
    [currentPage, pageSize, totalPages],
  );

  const handleRefresh = useCallback(() => {
    void refetchAccounts();
  }, [refetchAccounts]);

  // Calculate tab metrics for account type tabs
  const accountTypeTabMetrics = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    // Filter by search first
    const searchFiltered = sortedAccounts.filter((account) => {
      if (!normalizedQuery) {
        return true;
      }
      const haystack = [
        account.accountName,
        account.accountType,
        account.status,
        account.notes,
        account.accountId,
      ];
      return haystack.some((value) =>
        typeof value === 'string' && value.toLowerCase().includes(normalizedQuery),
      );
    });

    // Count by type
    const counts = new Map<string, number>();
    searchFiltered.forEach((account) => {
      const type = account.accountType;
      counts.set(type, (counts.get(type) || 0) + 1);
    });

    // Get unique types
    const uniqueTypes = Array.from(new Set(sortedAccounts.map((a) => a.accountType))).sort();

    const tabs = [
      { id: 'all', label: 'All', count: searchFiltered.length },
      ...uniqueTypes.map((type) => ({
        id: type,
        label: getAccountTypeLabel(type as any),
        count: counts.get(type) || 0,
      })),
    ];

    return tabs;
  }, [searchQuery, sortedAccounts]);

  const handleQuickActionSelect = useCallback((_: string, actionId: string) => {
    setQuickAction(actionId);
    setAddModalType('transaction');
  }, []);

  const handleCustomizeChange = useCallback(
    (columnsConfig: CustomizeColumnConfig[]) => {
      setColumnState((prev) => {
        const widthLookup = new Map(prev.map((column) => [column.id, column.width]));
        const optionalLookup = new Map(prev.map((column) => [column.id, column.optional]));

        const next: ColumnState[] = [];
        columnsConfig.forEach((column, index) => {
          if (!validColumnIds.has(column.id as ColumnState['id'])) {
            return;
          }

          const columnId = column.id as ColumnState['id'];
          next.push({
            id: columnId,
            width: widthLookup.get(columnId) ?? resolveFallbackWidth(columnId),
            visible: column.visible,
            order: index,
            pinned: column.pinned ?? null,
            optional: optionalLookup.get(columnId) ?? false,
          });
        });

        return next;
      });
    },
    [resolveFallbackWidth, validColumnIds],
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  const handleAddAccountClick = useCallback(() => {
    setQuickAction(null);
    setAddModalType('account');
  }, []);

  const handleCloseAddModal = useCallback(() => {
    setAddModalType(null);
    setQuickAction(null);
  }, []);

  const handleAddSubmit = useCallback(
    async (modalType: AddModalType, payload: Record<string, unknown>) => {
      try {
        if (modalType === 'account') {
          const accountPayload = {
            accountName: String(payload.accountName || ''),
            accountType: String(payload.accountType || 'other'),
            openingBalance: Number(payload.openingBalance || 0),
            currentBalance: Number(payload.currentBalance || 0),
            status: String(payload.status || 'active'),
            notes: payload.notes ? String(payload.notes) : undefined,
          };

          const created = await createAccount(accountPayload);
          if (!created) {
            throw new Error('Failed to create account');
          }

          console.info('Account created successfully', created);
        } else if (modalType === 'transaction') {
          console.info('Transaction quick add placeholder', {
            action: quickAction,
            payload,
          });
        } else if (modalType === 'person') {
          console.info('Person creation placeholder', payload);
        }
      } catch (error) {
        console.error('Failed to submit add modal', error);
        alert(error instanceof Error ? error.message : 'Failed to save');
      }
    },
    [createAccount, quickAction],
  );

  const handleEditAccount = useCallback(
    (account: AccountRow) => {
      if (!account) {
        return;
      }
      const match = accounts.find((row) => row.accountId === account.accountId);
      const fallback = {
        ...(account as NormalizedAccount),
        raw: (account as NormalizedAccount).raw ?? { ...account },
      };
      setEditingAccount(match ?? fallback);
    },
    [accounts],
  );

  const handleCloseEditAccount = useCallback(() => {
    setEditingAccount(null);
  }, []);

  const handleSubmitEditAccount = useCallback(
    async (payload: AccountEditPayload) => {
      setAccounts((prev) =>
        prev.map((row) =>
          row.accountId === payload.accountId
            ? {
                ...row,
                accountName: payload.accountName,
                accountType: payload.accountType,
                status: payload.status,
                notes: payload.notes,
                openingBalance: payload.openingBalance,
              }
            : row,
        ),
      );
      console.info('Account edit placeholder', payload);
    },
    [],
  );

  const filterActionButtons = (
    <div className={styles.toolbarActions} role="group" aria-label="Account quick actions">
      <button
        type="button"
        className={styles.iconPrimaryButton}
        onClick={handleAddAccountClick}
        disabled={isFetching}
        aria-label="Add account"
        title="Add account"
      >
        <FiPlus aria-hidden />
      </button>
      <QuickAddModal
        context="accounts"
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
    </div>
  );

  if (isLoading || !isAuthenticated) {
    return null;
  }

  const isAddModalOpen = addModalType !== null;
  const isEditModalOpen = editingAccount !== null;

  return (
    <AppLayout title="Accounts" subtitle="">
      <div className={styles.pageShell}>
        <div className={styles.pageContent}>
          <div className={styles.toolbarSection} role="toolbar" aria-label="Accounts controls">
            <div className={styles.toolbarPrimary}>
              <div className={styles.toolbarLead}>
                <div className={styles.searchContainer}>
                  <FiSearch className={styles.searchIcon} aria-hidden />
                  <input
                    type="search"
                    className={styles.searchInput}
                    placeholder="Search accounts..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    aria-label="Search accounts"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className={styles.searchClearButton}
                      onClick={() => handleSearchChange('')}
                      aria-label="Clear search"
                    >
                      <FiX aria-hidden />
                    </button>
                  )}
                </div>
                {filterActionButtons}
              </div>
              <div className={styles.viewToggleGroup} role="tablist" aria-label="Accounts view mode">
                <div className={styles.viewTabs}>
                  <span
                    className={styles.tabIndicator}
                    data-position={activeTab === 'cards' ? 'cards' : 'table'}
                    aria-hidden
                  />
                  <button
                    type="button"
                    className={styles.tabButton}
                    data-active={activeTab === 'table' ? 'true' : 'false'}
                    onClick={() => setActiveTab('table')}
                    role="tab"
                    aria-selected={activeTab === 'table'}
                  >
                    Table
                  </button>
                  <button
                    type="button"
                    className={styles.tabButton}
                    data-active={activeTab === 'cards' ? 'true' : 'false'}
                    onClick={() => setActiveTab('cards')}
                    role="tab"
                    aria-selected={activeTab === 'cards'}
                  >
                    Cards
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.toolbarTabsRow}>
              <div className={styles.accountTypeTabsWrapper}>
                <AccountTypeTabs
                  activeTab={activeTypeTab}
                  onTabChange={setActiveTypeTab}
                  tabs={accountTypeTabMetrics}
                />
              </div>
            </div>
          </div>
          {fetchError ? (
            <div className={styles.tableCard} role="alert">
              <div className={styles.emptyState}>
                <p>{fetchError}</p>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={handleRefresh}
                  disabled={isFetching}
                >
                  Retry
                </button>
              </div>
            </div>
          ) : activeTab === 'cards' ? (
            <AccountsCardsView
              accounts={filteredAccounts}
              onQuickAction={(actionId) => handleQuickActionSelect('accounts', actionId)}
            />
          ) : (
            <div className={styles.tableWrapper}>
              <TableAccounts
                tableScrollRef={tableScrollRef}
                accounts={displayedAccounts}
                selectedIds={selectedIds}
                onSelectRow={handleSelectRow}
                onSelectAll={handleSelectAll}
                selectionSummary={selectionSummary}
                pagination={pagination}
                columnDefinitions={ACCOUNT_COLUMN_DEFINITIONS}
                allColumns={orderedColumns}
                visibleColumns={visibleColumns}
                isColumnReorderMode={false}
                onColumnVisibilityChange={handleColumnVisibilityChange}
                onColumnOrderChange={handleColumnOrderChange}
                sortState={sortState}
                onSortChange={handleSortChange}
                isFetching={isFetching}
                isShowingSelectedOnly={showSelectedOnly}
                onToggleShowSelected={handleToggleShowSelected}
                onEditAccount={handleEditAccount}
              />
            </div>
          )}
        </div>

        <footer className={styles.pageFooter} aria-label="Accounts footer">
          <span className={styles.footerNote}>Accounts sync nightly • Preview data</span>
        </footer>
      </div>

      <AddModalGlobal
        type={addModalType ?? 'account'}
        isOpen={isAddModalOpen}
        onClose={handleCloseAddModal}
        onSubmit={handleAddSubmit}
      />
      <ColumnsCustomizeModal
        context="accounts"
        open={isCustomizeOpen}
        onClose={() => setIsCustomizeOpen(false)}
        columns={customizeColumns}
        defaultColumns={defaultCustomizeColumns}
        onChange={handleCustomizeChange}
      />
      <AccountEditModal
        account={editingAccount}
        isOpen={isEditModalOpen}
        onClose={handleCloseEditAccount}
        onSubmit={handleSubmitEditAccount}
      />
    </AppLayout>
  );
}


