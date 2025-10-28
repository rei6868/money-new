import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import AppLayout from '../../components/AppLayout';
import AccountsCardsView from '../../components/accounts/AccountsCardsView';
import AccountsPageHeader from '../../components/accounts/AccountsPageHeader';
import TableAccounts from '../../components/accounts/TableAccounts';
import AccountEditModal, { AccountEditPayload } from '../../components/accounts/AccountEditModal';
import AddModalGlobal, { AddModalType } from '../../components/common/AddModalGlobal';
import HeaderActionBar from '../../components/common/HeaderActionBar';
import CustomizeColumnsModal, {
  ColumnConfig as CustomizeColumnConfig,
} from '../../components/common/CustomizeColumnsModal';
import FilterComingSoonModal from '../../components/common/FilterComingSoonModal';
import {
  ACCOUNT_COLUMN_DEFINITIONS,
  ACCOUNT_SORTERS,
  AccountColumnDefinition,
  AccountRow,
  createDefaultColumnState,
} from '../../components/accounts/accountColumns';
import { useRequireAuth } from '../../hooks/useRequireAuth';
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
    ownerId:
      (raw.ownerId as string | undefined) ??
      (raw.owner_id as string | undefined) ??
      'unknown',
    ownerName: (raw.ownerName as string | undefined) ?? null,
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
  const [addModalType, setAddModalType] = useState<AddModalType | null>(null);
  const [quickAction, setQuickAction] = useState<string | null>(null);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [previousSearchQuery, setPreviousSearchQuery] = useState('');
  const [editingAccount, setEditingAccount] = useState<NormalizedAccount | null>(null);

  const tableScrollRef = useRef<HTMLDivElement | null>(null);

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
        locked: column.id === 'notes',
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
        locked: column.id === 'notes',
      };
    });
  }, [defaultColumnState, definitionLookup, customizeColumns]);

  const fetchAccounts = useCallback(async () => {
    setIsFetching(true);
    setFetchError(null);
    try {
      const response = await fetch('/api/accounts');
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Failed to load accounts');
      }
      const payload = await response.json();
      const rows = Array.isArray(payload) ? payload : payload?.accounts;
      if (!Array.isArray(rows)) {
        setAccounts([]);
        return;
      }
      const normalized = rows
        .map((row) => normalizeAccount(row as Record<string, unknown>))
        .filter((row): row is NormalizedAccount => Boolean(row));
      setAccounts(normalized);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to fetch accounts at the moment.';
      setFetchError(message);
      setAccounts([]);
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    void fetchAccounts();
  }, [isAuthenticated, fetchAccounts]);

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
    if (!normalizedQuery) {
      return sortedAccounts;
    }

    return sortedAccounts.filter((account) => {
      const haystack = [
        account.accountName,
        account.accountType,
        account.ownerName,
        account.status,
        account.notes,
        account.accountId,
      ];
      return haystack.some((value) =>
        typeof value === 'string' && value.toLowerCase().includes(normalizedQuery),
      );
    });
  }, [sortedAccounts, searchQuery]);

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
    void fetchAccounts();
  }, [fetchAccounts]);

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

  const handleSearchClear = useCallback(() => {
    setPreviousSearchQuery(searchQuery);
    setSearchQuery('');
  }, [searchQuery]);

  const handleSearchRestore = useCallback(() => {
    setSearchQuery(previousSearchQuery);
  }, [previousSearchQuery]);

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
          console.info('Account creation placeholder', payload);
          await fetchAccounts();
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
      }
    },
    [fetchAccounts, quickAction],
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

  if (isLoading || !isAuthenticated) {
    return null;
  }

  const isAddModalOpen = addModalType !== null;
  const isEditModalOpen = editingAccount !== null;

  return (
    <AppLayout title="Accounts" subtitle="">
      <div className={styles.pageShell}>
        <div className={styles.pageContent}>
          <AccountsPageHeader activeTab={activeTab} onTabChange={setActiveTab} />

          <HeaderActionBar
            context="accounts"
            onAdd={handleAddAccountClick}
            addLabel="Add Account"
            addDisabled={isFetching}
            onQuickAddSelect={handleQuickActionSelect}
            quickAddDisabled={isFetching}
            searchValue={searchQuery}
            onSearchChange={handleSearchChange}
            onSearchClear={handleSearchClear}
            onSearchRestore={handleSearchRestore}
            searchPlaceholder="Search accounts"
            onFilterClick={() => setIsFilterOpen(true)}
            onCustomizeClick={() => setIsCustomizeOpen(true)}
          />

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
      <CustomizeColumnsModal
        context="accounts"
        open={isCustomizeOpen}
        onClose={() => setIsCustomizeOpen(false)}
        columns={customizeColumns}
        defaultColumns={defaultCustomizeColumns}
        onChange={handleCustomizeChange}
      />
      <FilterComingSoonModal
        context="accounts"
        open={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
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


