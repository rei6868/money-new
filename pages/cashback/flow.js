import AppLayout from '../../components/AppLayout';
import PagePlaceholder from '../../components/PagePlaceholder';
import { useRequireAuth } from '../../hooks/useRequireAuth';

export default function CashbackFlowPage() {
  const { isAuthenticated, isLoading } = useRequireAuth();

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <AppLayout
      title="Cashback Flow"
      subtitle="Review every cashback accrual, release, and allocation signal."
    >
      <PagePlaceholder title="Cashback Flow" />
    </AppLayout>
  );
}

