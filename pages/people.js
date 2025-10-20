import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';

import AppLayout from '../components/AppLayout';
import { useRequireAuth } from '../hooks/useRequireAuth';

export default function PeoplePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useRequireAuth();
  const [people, setPeople] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (authLoading || !isAuthenticated) {
      return;
    }

    let cancelled = false;

    const fetchPeople = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/people');
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = await response.json();
        const peopleList = Array.isArray(payload) ? payload : payload?.people;
        if (!cancelled) {
          setPeople(Array.isArray(peopleList) ? peopleList : []);
          if (!Array.isArray(peopleList)) {
            console.warn('Unexpected response shape when fetching people', payload);
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load people', err);
          setError('Unable to load people right now.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchPeople();

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated]);

  const handleAddNew = () => {
    router.push('/people/new').catch((err) => {
      console.error('Failed to navigate to create person page', err);
    });
  };

  const rows = useMemo(() => people ?? [], [people]);

  if (authLoading || !isAuthenticated) {
    return null;
  }

  return (
    <AppLayout
      title="People"
      subtitle="Manage individuals linked to accounts, transactions, and reimbursements."
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <button type="button" onClick={handleAddNew} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>
          Add New Person
        </button>
      </div>

      {isLoading && <p>Loading people…</p>}
      {error && !isLoading && <p style={{ color: 'red' }}>{error}</p>}

      {!isLoading && !error && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc', padding: '0.5rem' }}>Full Name</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc', padding: '0.5rem' }}>Status</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc', padding: '0.5rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: '0.75rem' }}>
                  No people found yet.
                </td>
              </tr>
            ) : (
              rows.map((person) => (
                <tr key={person.personId} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '0.75rem' }}>{person.fullName}</td>
                  <td style={{ padding: '0.75rem', textTransform: 'capitalize' }}>{person.status}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <button
                      type="button"
                      onClick={() => console.log('Edit person', person.personId)}
                      style={{ marginRight: '0.5rem', padding: '0.25rem 0.5rem', cursor: 'pointer' }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => console.log('Delete person', person.personId)}
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
