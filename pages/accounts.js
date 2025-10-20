import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';

import AppLayout from '../components/AppLayout';
import { useRequireAuth } from '../hooks/useRequireAuth';

function formatCurrency(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return value ?? 'N/A';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(numeric);
}

export default function AccountsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useRequireAuth();
  const [accounts, setAccounts] = useState([]);
  const [fetchError, setFetchError] = useState(null);
  const [isFetching, setIsFetching] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadAccounts = useCallback(async () => {
    if (!isMountedRef.current) {
      return;
    }

    setIsFetching(true);
    setFetchError(null);

    try {
      const response = await fetch('/api/accounts');
      if (!response.ok) {
        let details = '';
        try {
          const body = await response.json();
          details = body?.error || body?.details || response.statusText;
        } catch {
          details = response.statusText;
        }
        throw new Error(details || 'Failed to fetch accounts');
      }

      const data = await response.json();
      const rows = Array.isArray(data?.accounts) ? data.accounts : [];
      if (isMountedRef.current) {
        setAccounts(rows);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch accounts';
      if (isMountedRef.current) {
        setFetchError(message);
        setAccounts([]);
      }
    } finally {
      if (isMountedRef.current) {
        setIsFetching(false);
      }
    }
  }, []);

  useEffect(() => {
    if (isLoading || !isAuthenticated) {
      return;
    }
    void loadAccounts();
  }, [isAuthenticated, isLoading, loadAccounts]);

  const handleAddAccount = useCallback(() => {
    router.push('/accounts/new').catch((error) => {
      console.error('Failed to navigate to /accounts/new', error);
    });
  }, [router]);

  const handleRetry = useCallback(() => {
    void loadAccounts();
  }, [loadAccounts]);

  const hasAccounts = accounts.length > 0;

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <AppLayout
      title="Accounts"
      subtitle="Manage connected bank and credit accounts from this workspace."
    >
      <div className="accounts-page">
        <div className="accounts-actions">
          <button type="button" onClick={handleAddAccount}>
            Add New Account
          </button>
        </div>

        {isFetching ? (
          <p>Loading accounts...</p>
        ) : fetchError ? (
          <div role="alert">
            <p>Unable to load accounts: {fetchError}</p>
            <button type="button" onClick={handleRetry}>
              Retry
            </button>
          </div>
        ) : hasAccounts ? (
          <div className="accounts-table-wrapper">
            <table className="accounts-table">
              <thead>
                <tr>
                  <th scope="col">Account Name</th>
                  <th scope="col">Type</th>
                  <th scope="col">Owner</th>
                  <th scope="col">Current Balance</th>
                  <th scope="col">Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.accountId}>
                    <td>{account.accountName}</td>
                    <td>{account.accountType}</td>
                    <td>{account.ownerName ?? '--'}</td>
                    <td>{formatCurrency(account.currentBalance)}</td>
                    <td>{account.status}</td>
                    <td>
                      <button type="button" disabled>
                        Edit
                      </button>
                      <button type="button" disabled>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No accounts found. Try adding a new account to get started.</p>
        )}
      </div>
    </AppLayout>
  );
}
