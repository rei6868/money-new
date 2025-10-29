import AppLayout from '../../components/layout/AppShell/AppShell';
import PagePlaceholder from '../../components/PagePlaceholder';
import { useRequireAuth } from '../../hooks/useRequireAuth';

export default function DebtMovementsPage() {
  const { isAuthenticated, isLoading } = useRequireAuth();

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <AppLayout
      title="Debt Movements"
      subtitle="Track payments, adjustments, and owner changes for each liability."
    >
      <PagePlaceholder title="Debt Movements" />
    </AppLayout>
  );
}

