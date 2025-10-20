import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';

import AppLayout from '../components/AppLayout';
import { useRequireAuth } from '../hooks/useRequireAuth';

const fetchCategories = async () => {
  const response = await fetch('/api/categories');
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  const data = await response.json();
  return Array.isArray(data?.categories) ? data.categories : [];
};

export default function CategoryPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useRequireAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let ignore = false;

    const loadCategories = async () => {
      setLoading(true);
      setError(null);

      try {
        const items = await fetchCategories();
        if (!ignore) {
          setCategories(items);
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to load categories');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadCategories();

    return () => {
      ignore = true;
    };
  }, [isAuthenticated]);

  const parentLookup = useMemo(() => {
    return new Map(categories.map((category) => [category.categoryId, category]));
  }, [categories]);

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <AppLayout
      title="Categories"
      subtitle="Curate categories used across transactions and analytics."
    >
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Categories</h1>
        <button
          type="button"
          onClick={() => router.push('/category/new')}
          className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-500"
        >
          Add New Category
        </button>
      </div>

      {loading && <p className="text-sm text-gray-600">Loading categories...</p>}
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && categories.length === 0 && (
        <p className="text-sm text-gray-600">No categories found yet.</p>
      )}

      {!loading && !error && categories.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-2 text-left font-medium text-gray-700">
                  Name
                </th>
                <th scope="col" className="px-4 py-2 text-left font-medium text-gray-700">
                  Kind
                </th>
                <th scope="col" className="px-4 py-2 text-left font-medium text-gray-700">
                  Parent Category
                </th>
                <th scope="col" className="px-4 py-2 text-left font-medium text-gray-700">
                  Description
                </th>
                <th scope="col" className="px-4 py-2 text-right font-medium text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {categories.map((category) => {
                const parent =
                  category.parentCategoryId != null
                    ? parentLookup.get(category.parentCategoryId)
                    : null;

                return (
                  <tr key={category.categoryId}>
                    <td className="px-4 py-2 font-medium text-gray-900">{category.name}</td>
                    <td className="px-4 py-2 capitalize text-gray-700">{category.kind}</td>
                    <td className="px-4 py-2 text-gray-700">
                      {parent
                        ? `${parent.name} (${category.parentCategoryId})`
                        : category.parentCategoryId ?? 'None'}
                    </td>
                    <td className="px-4 py-2 text-gray-700">
                      {category.description ? category.description : 'None'}
                    </td>
                    <td className="px-4 py-2 text-right text-sm text-blue-600">
                      <button
                        type="button"
                        className="mr-2 hover:underline"
                        onClick={() => console.info(`Edit category ${category.categoryId}`)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-red-600 hover:underline"
                        onClick={() => console.info(`Delete category ${category.categoryId}`)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  );
}

