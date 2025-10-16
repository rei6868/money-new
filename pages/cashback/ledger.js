import AppLayout from '../../components/AppLayout';
import PagePlaceholder from '../../components/PagePlaceholder';
import { useRequireAuth } from '../../hooks/useRequireAuth';

export default function CashbackLedgerPage() {
  const { isAuthenticated, isLoading } = useRequireAuth();

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <AppLayout
      title="Cashback ledger"
      subtitle="View monthly accruals, payouts, and budget caps."
    >
      <PagePlaceholder title="Cashback ledger reporting" />
    </AppLayout>
  );
}
