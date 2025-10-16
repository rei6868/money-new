import AppLayout from '../components/AppLayout';
import PagePlaceholder from '../components/PagePlaceholder';
import { useRequireAuth } from '../hooks/useRequireAuth';

export default function DebtPage() {
  const { isAuthenticated, isLoading } = useRequireAuth();

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <AppLayout
      title="Debt"
      subtitle="Monitor outstanding balances, repayments, and obligations."
    >
      <PagePlaceholder title="Debt" />
    </AppLayout>
  );
}
