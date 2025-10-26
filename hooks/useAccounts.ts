// hooks/useAccounts.ts
// Custom React hook for Accounts data fetching and mutations

import { useState, useEffect, useCallback } from 'react';
import {
  Account,
  NewAccount,
  UpdateAccount,
  AccountsResponse,
  AccountFilters,
  AccountSortState,
  PaginationState,
} from '@/lib/accounts/accounts.types';

interface UseAccountsOptions {
  autoFetch?: boolean;
  filters?: AccountFilters;
  sortState?: AccountSortState;
  pagination?: Partial<PaginationState>;
}

interface UseAccountsReturn {
  accounts: Account[];
  loading: boolean;
  error: string | null;
  pagination: PaginationState;
  
  // CRUD operations
  fetchAccounts: () => Promise<void>;
  createAccount: (data: NewAccount) => Promise<Account | null>;
  updateAccount: (id: string, data: UpdateAccount) => Promise<Account | null>;
  deleteAccount: (id: string) => Promise<boolean>;
  
  // State setters
  setFilters: (filters: AccountFilters) => void;
  setSortState: (sort: AccountSortState) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
}

export const useAccounts = (options: UseAccountsOptions = {}): UseAccountsReturn => {
  const {
    autoFetch = true,
    filters: initialFilters = {},
    sortState: initialSort = { column: 'created_at', direction: 'desc' },
    pagination: initialPagination = {},
  } = options;

  // State management
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AccountFilters>(initialFilters);
  const [sortState, setSortState] = useState<AccountSortState>(initialSort);
  const [pagination, setPagination] = useState<PaginationState>({
    page: initialPagination.page || 1,
    pageSize: initialPagination.pageSize || 25,
    totalPages: 0,
    totalRows: 0,
  });

  /**
   * Fetch accounts from API
   */
  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Build query params
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
        sortBy: sortState.column,
        sortDir: sortState.direction,
      });

      // Add filters
      if (filters.search) params.append('search', filters.search);
      if (filters.account_type?.length) {
        params.append('account_type', filters.account_type.join(','));
      }
      if (filters.status?.length) {
        params.append('status', filters.status.join(','));
      }
      if (filters.owner_id) params.append('owner_id', filters.owner_id);

      const response = await fetch(`/api/accounts?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch accounts: ${response.statusText}`);
      }

      const data: AccountsResponse = await response.json();

      setAccounts(data.accounts || []);
      setPagination((prev) => ({
        ...prev,
        totalRows: data.total,
        totalPages: Math.ceil(data.total / prev.pageSize),
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(message);
      console.error('Error fetching accounts:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, sortState, filters]);

  /**
   * Create new account
   */
  const createAccount = useCallback(async (data: NewAccount): Promise<Account | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed to create account: ${response.statusText}`);
      }

      const newAccount: Account = await response.json();

      // Refresh accounts list
      await fetchAccounts();

      return newAccount;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create account';
      setError(message);
      console.error('Error creating account:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchAccounts]);

  /**
   * Update existing account
   */
  const updateAccount = useCallback(
    async (id: string, data: UpdateAccount): Promise<Account | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/accounts/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error(`Failed to update account: ${response.statusText}`);
        }

        const updatedAccount: Account = await response.json();

        // Update local state
        setAccounts((prev) =>
          prev.map((acc) => (acc.account_id === id ? updatedAccount : acc))
        );

        return updatedAccount;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update account';
        setError(message);
        console.error('Error updating account:', err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Delete account
   */
  const deleteAccount = useCallback(
    async (id: string): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/accounts/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error(`Failed to delete account: ${response.statusText}`);
        }

        // Remove from local state
        setAccounts((prev) => prev.filter((acc) => acc.account_id !== id));

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete account';
        setError(message);
        console.error('Error deleting account:', err);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Update page number
   */
  const setPage = useCallback((page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  }, []);

  /**
   * Update page size
   */
  const setPageSize = useCallback((pageSize: number) => {
    setPagination((prev) => ({ ...prev, pageSize, page: 1 }));
  }, []);

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    if (autoFetch) {
      fetchAccounts();
    }
  }, [autoFetch, fetchAccounts]);

  return {
    accounts,
    loading,
    error,
    pagination,
    fetchAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
    setFilters,
    setSortState,
    setPage,
    setPageSize,
  };
};
