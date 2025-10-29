import AppLayout from '../components/layout/AppShell/AppShell';
import PagePlaceholder from '../components/PagePlaceholder';
import { useRequireAuth } from '../hooks/useRequireAuth';

export default function ProductPage() {
  const { isAuthenticated, isLoading } = useRequireAuth();

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <AppLayout
      title="Product"
      subtitle="Configure product data, pricing, and catalog visibility from this screen."
    >
      <PagePlaceholder title="Product" />
    </AppLayout>
  );
}
