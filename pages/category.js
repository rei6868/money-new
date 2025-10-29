import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

import AppLayout from '../components/layout/AppShell/AppShell';
import { CategoryPageContent } from '../components/pages/category/CategoryPageContent';
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

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <AppLayout>
      <CategoryPageContent
        categories={categories}
        loading={loading}
        error={error}
        onAddNew={() =>
          router.push('/category/new').catch((err) => {
            console.error('Failed to navigate to create category page', err);
          })
        }
        onEditCategory={(category) => console.info(`Edit category ${category.categoryId}`)}
        onDeleteCategory={(category) => console.info(`Delete category ${category.categoryId}`)}
      />
    </AppLayout>
  );
}

