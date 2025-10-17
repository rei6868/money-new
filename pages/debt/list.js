import AppLayout from '../../components/AppLayout';
import PagePlaceholder from '../../components/PagePlaceholder';
import { useRequireAuth } from '../../hooks/useRequireAuth';

export default function DebtListPage() {
  const { isAuthenticated, isLoading } = useRequireAuth();

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <AppLayout
      title="Debt List"
      subtitle="All open and closed debt records aligned with their repayment cadence."
    >
      <PagePlaceholder title="Debt List" />
    </AppLayout>
  );
}

