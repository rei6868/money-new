import AppLayout from '../../components/AppLayout';
import PagePlaceholder from '../../components/PagePlaceholder';
import { useRequireAuth } from '../../hooks/useRequireAuth';

export default function CashbackSummaryPage() {
  const { isAuthenticated, isLoading } = useRequireAuth();

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <AppLayout
      title="Cashback Summary"
      subtitle="Track cashback performance, burn-down, and payouts."
    >
      <PagePlaceholder title="Cashback Summary" />
    </AppLayout>
  );
}
