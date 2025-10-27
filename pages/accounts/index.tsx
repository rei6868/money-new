import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import AppLayout from '../../components/AppLayout';
import AccountsCardsView from '../../components/accounts/AccountsCardsView';
import AccountsPageHeader from '../../components/accounts/AccountsPageHeader';
import TableAccounts from '../../components/accounts/TableAccounts';
import AddModalGlobal, { AddModalType } from '../../components/common/AddModalGlobal';
import QuickAddMenu, { QuickAddActionId } from '../../components/common/QuickAddMenu';
import {
  ACCOUNT_COLUMN_DEFINITIONS,
  ACCOUNT_SORTERS,
  AccountColumnDefinition,
  AccountRow,
  createDefaultColumnState,
} from '../../components/accounts/accountColumns';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import styles from '../../styles/accounts.module.css';
import headerStyles from '../../styles/HeaderActionBar.module.css';
import { FiPlus } from 'react-icons/fi';

type ColumnState = ReturnType<typeof createDefaultColumnState>[number];

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
  const [columnState, setColumnState] = useState(() =>
    createDefaultColumnState(ACCOUNT_COLUMN_DEFINITIONS),
  );
  const [defaultColumnState] = useState(() =>
    createDefaultColumnState(ACCOUNT_COLUMN_DEFINITIONS),
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
  const [quickAction, setQuickAction] = useState<QuickAddActionId | null>(null);

  const tableScrollRef = useRef<HTMLDivElement | null>(null);

  const definitionLookup = useMemo(
    () => new Map(ACCOUNT_COLUMN_DEFINITIONS.map((definition) => [definition.id, definition])),
    [],
  );

  const orderedColumns = useMemo<ColumnState[]>(() => {
    if (columnState.length === 0) {
      return [];
    }
    return columnState
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((state) => {
        const definition = definitionLookup.get(state.id) as AccountColumnDefinition | undefined;
        const minWidth = definition?.minWidth ?? 160;
        const defaultVisible = definition?.defaultVisible !== false;
        const normalizedWidth = Math.max(
          state.width ?? definition?.defaultWidth ?? minWidth,
          minWidth,
        );

        return {
          ...state,
          width: normalizedWidth,
          visible: state.visible ?? defaultVisible,
          optional: Boolean(state.optional ?? definition?.optional),
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

  const totalPages = useMemo(() => {
    if (sortedAccounts.length === 0) {
      return 1;
    }
    return Math.max(1, Math.ceil(sortedAccounts.length / pageSize));
  }, [sortedAccounts.length, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedAccounts = useMemo(() => {
    if (activeTab === 'cards') {
      return sortedAccounts;
    }
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return sortedAccounts.slice(start, end);
  }, [sortedAccounts, currentPage, pageSize, activeTab]);

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

  const handleQuickActionSelect = useCallback((actionId: QuickAddActionId) => {
    setQuickAction(actionId);
    setAddModalType('transaction');
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

  if (isLoading || !isAuthenticated) {
    return null;
  }

  const isAddModalOpen = addModalType !== null;

  return (
    <AppLayout title="Accounts" subtitle="">
      <div className={styles.pageShell}>
        <div className={styles.pageContent}>
          <AccountsPageHeader activeTab={activeTab} onTabChange={setActiveTab} />

          <div className={headerStyles.headerBar}>
            <div className={headerStyles.headerLeft}>
              <QuickAddMenu onSelect={handleQuickActionSelect} />
            </div>
            <div className={headerStyles.headerRight}>
              <button
                type="button"
                className={headerStyles.addButton}
                onClick={handleAddAccountClick}
                disabled={isFetching}
              >
                <FiPlus aria-hidden />
                <span>Add Account</span>
              </button>
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
              accounts={sortedAccounts}
              onQuickAction={(actionId) => handleQuickActionSelect(actionId as QuickAddActionId)}
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
                onQuickAction={(actionId) => handleQuickActionSelect(actionId as QuickAddActionId)}
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
    </AppLayout>
  );
}


