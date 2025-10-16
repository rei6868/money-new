import AppLayout from '../components/AppLayout';
import PagePlaceholder from '../components/PagePlaceholder';
import { useRequireAuth } from '../hooks/useRequireAuth';

export default function OrdersPage() {
  const { isAuthenticated, isLoading } = useRequireAuth();

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <AppLayout
      title="Order List"
      subtitle="Monitor orders, fulfillment status, and customer notes in one place."
    >
      <PagePlaceholder title="Order List" />
    </AppLayout>
  );
}
