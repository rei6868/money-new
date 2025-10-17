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
      title="Cashback summary"
      subtitle="Monitor cashback KPIs and highlight program performance."
    >
      <PagePlaceholder title="Cashback summary dashboards" />
    </AppLayout>
  );
}
