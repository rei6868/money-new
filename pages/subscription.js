import AppLayout from '../components/AppLayout';
import PagePlaceholder from '../components/PagePlaceholder';
import { useRequireAuth } from '../hooks/useRequireAuth';

export default function SubscriptionPage() {
  const { isAuthenticated, isLoading } = useRequireAuth();

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <AppLayout
      title="Subscription"
      subtitle="Control recurring spend, renewals, and cashback routing."
    >
      <PagePlaceholder title="Subscription" />
    </AppLayout>
  );
}

