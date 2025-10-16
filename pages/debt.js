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
      title="Debt hub"
      subtitle="Track liabilities, repayments, and related ledgers."
    >
      <PagePlaceholder title="Debt tracking coming soon" />
    </AppLayout>
  );
}
