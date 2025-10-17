import AppLayout from '../components/AppLayout';
import PagePlaceholder from '../components/PagePlaceholder';
import { useRequireAuth } from '../hooks/useRequireAuth';

export default function CategoryPage() {
  const { isAuthenticated, isLoading } = useRequireAuth();

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <AppLayout
      title="Category"
      subtitle="Curate categories used across transactions and analytics."
    >
      <PagePlaceholder title="Category" />
    </AppLayout>
  );
}

