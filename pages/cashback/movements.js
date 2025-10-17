import AppLayout from '../../components/AppLayout';
import PagePlaceholder from '../../components/PagePlaceholder';
import { useRequireAuth } from '../../hooks/useRequireAuth';

export default function CashbackMovementsPage() {
  const { isAuthenticated, isLoading } = useRequireAuth();

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <AppLayout
      title="Cashback Movements"
      subtitle="Trace the lifecycle of each cashback movement inside Money Flow."
    >
      <PagePlaceholder title="Cashback Movements" />
    </AppLayout>
  );
}

