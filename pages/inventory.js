import AppLayout from '../components/layout/AppShell/AppShell';
import PagePlaceholder from '../components/PagePlaceholder';
import { useRequireAuth } from '../hooks/useRequireAuth';

export default function InventoryPage() {
  const { isAuthenticated, isLoading } = useRequireAuth();

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <AppLayout
      title="Inventory"
      subtitle="Track stock levels, replenishment alerts, and warehouse insights."
    >
      <PagePlaceholder title="Inventory" />
    </AppLayout>
  );
}
