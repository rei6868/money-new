import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { useRequireAuth } from '../hooks/useRequireAuth';

export default function ShopPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useRequireAuth();
  const [shops, setShops] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (authLoading || !isAuthenticated) {
      return;
    }

    let cancelled = false;

    const fetchShops = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/shops');
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = await response.json();
        const shopList = Array.isArray(payload) ? payload : payload?.shops;
        if (!cancelled) {
          setShops(Array.isArray(shopList) ? shopList : []);
          if (!Array.isArray(shopList)) {
            console.warn('Unexpected response shape when fetching shops', payload);
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load shops', err);
          setError('Unable to load shops right now.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchShops();

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated]);

  const handleAddNew = () => {
    router.push('/shop/new').catch((err) => {
      console.error('Failed to navigate to create shop page', err);
    });
  };

  const rows = useMemo(() => shops ?? [], [shops]);

  if (authLoading || !isAuthenticated) {
    return null;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <button type="button" onClick={handleAddNew} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>
          Add New Shop
        </button>
      </div>

      {isLoading && <p>Loading shops...</p>}
      {error && !isLoading && <p style={{ color: 'red' }}>{error}</p>}

      {!isLoading && !error && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc', padding: '0.5rem' }}>Shop Name</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc', padding: '0.5rem' }}>Type</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc', padding: '0.5rem' }}>Status</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc', padding: '0.5rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '0.75rem' }}>
                  No shops found yet.
                </td>
              </tr>
            ) : (
              rows.map((shop) => (
                <tr key={shop.shopId} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '0.75rem' }}>{shop.shopName}</td>
                  <td style={{ padding: '0.75rem', textTransform: 'capitalize' }}>{shop.shopType}</td>
                  <td style={{ padding: '0.75rem', textTransform: 'capitalize' }}>{shop.status}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <button
                      type="button"
                      onClick={() => console.log('Edit shop', shop.shopId)}
                      style={{ marginRight: '0.5rem', padding: '0.25rem 0.5rem', cursor: 'pointer' }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => console.log('Delete shop', shop.shopId)}
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
    </div>
  );
}

