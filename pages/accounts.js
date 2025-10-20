import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';

import AppLayout from '../components/AppLayout';
import { useRequireAuth } from '../hooks/useRequireAuth';

export default function AccountsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useRequireAuth();
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (authLoading || !isAuthenticated) {
      return;
    }

    let cancelled = false;

    const fetchAccounts = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/accounts');
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = await response.json();
        const accountsList = Array.isArray(payload) ? payload : payload?.accounts;
        if (!cancelled) {
          setAccounts(Array.isArray(accountsList) ? accountsList : []);
          if (!Array.isArray(accountsList)) {
            console.warn('Unexpected response shape when fetching accounts', payload);
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load accounts', err);
          setError('Unable to load accounts right now.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchAccounts();

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated]);

  const handleAddNew = () => {
    router.push('/accounts/new').catch((err) => {
      console.error('Failed to navigate to create account page', err);
    });
  };

  const rows = useMemo(() => accounts ?? [], [accounts]);

  const formatBalance = (value) => {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return numeric.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return value ?? '-';
  };

  if (authLoading || !isAuthenticated) {
    return null;
  }

  return (
    <AppLayout
      title="Accounts"
      subtitle="Manage connected bank and credit accounts from this workspace."
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <button type="button" onClick={handleAddNew} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>
          Add New Account
        </button>
      </div>

      {isLoading && <p>Loading accounts...</p>}
      {error && !isLoading && <p style={{ color: 'red' }}>{error}</p>}

      {!isLoading && !error && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc', padding: '0.5rem' }}>Account Name</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc', padding: '0.5rem' }}>Type</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc', padding: '0.5rem' }}>Owner</th>
              <th style={{ textAlign: 'right', borderBottom: '1px solid #ccc', padding: '0.5rem' }}>Current Balance</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc', padding: '0.5rem' }}>Status</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc', padding: '0.5rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '0.75rem' }}>
                  No accounts found yet.
                </td>
              </tr>
            ) : (
              rows.map((account) => (
                <tr key={account.accountId} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '0.75rem' }}>{account.accountName}</td>
                  <td style={{ padding: '0.75rem', textTransform: 'capitalize' }}>{account.accountType}</td>
                  <td style={{ padding: '0.75rem' }}>{account.ownerName || account.ownerId}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>{formatBalance(account.currentBalance)}</td>
                  <td style={{ padding: '0.75rem', textTransform: 'capitalize' }}>{account.status}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <button
                      type="button"
                      onClick={() => console.log('Edit account', account.accountId)}
                      style={{ marginRight: '0.5rem', padding: '0.25rem 0.5rem', cursor: 'pointer' }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => console.log('Delete account', account.accountId)}
                      style={{ padding: '0.25rem 0.5rem', cursor: 'pointer' }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </AppLayout>
  );
}
