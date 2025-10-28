import { useCallback, useEffect, useState } from 'react';

export type Account = {
  accountId: string;
  accountName: string;
  accountType: string;
  ownerId: string;
  ownerName: string | null;
  openingBalance: number;
  currentBalance: number;
  totalIn: number;
  totalOut: number;
  status: string;
  notes: string | null;
  parentAccountId: string | null;
  imgUrl: string | null;
};

export type UseAccountsResult = {
  accounts: Account[];
  activeAccounts: Account[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createAccount: (payload: CreateAccountPayload) => Promise<Account | null>;
};

export type CreateAccountPayload = {
  accountName: string;
  accountType: string;
  ownerId: string;
  openingBalance: number;
  currentBalance: number;
  status: string;
  notes?: string;
  imgUrl?: string;
  parentAccountId?: string;
  assetRef?: string;
};

/**
 * Custom hook for fetching and managing accounts with real-time sync.
 * Provides active accounts filtering and account creation functionality.
 */
export function useAccounts(): UseAccountsResult {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

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

      // Normalize numeric fields
      const normalized = rows.map((row: any) => ({
        ...row,
        openingBalance: Number(row.openingBalance ?? 0),
        currentBalance: Number(row.currentBalance ?? 0),
        totalIn: Number(row.totalIn ?? 0),
        totalOut: Number(row.totalOut ?? 0),
      }));

      setAccounts(normalized);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to fetch accounts';
      setError(message);
      setAccounts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createAccount = useCallback(
    async (payload: CreateAccountPayload): Promise<Account | null> => {
      try {
        const response = await fetch('/api/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || errorData.details || 'Failed to create account');
        }

        const created = await response.json();

        // Normalize numeric fields
        const normalized: Account = {
          ...created,
          openingBalance: Number(created.openingBalance ?? 0),
          currentBalance: Number(created.currentBalance ?? 0),
          totalIn: Number(created.totalIn ?? 0),
          totalOut: Number(created.totalOut ?? 0),
        };

        // Optimistically update local state
        setAccounts((prev) => [...prev, normalized]);

        return normalized;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create account';
        setError(message);
        return null;
      }
    },
    [],
  );

  useEffect(() => {
    void fetchAccounts();
  }, [fetchAccounts]);

  // Filter only active accounts
  const activeAccounts = accounts.filter((account) => account.status === 'active');

  return {
    accounts,
    activeAccounts,
    isLoading,
    error,
    refetch: fetchAccounts,
    createAccount,
  };
}

