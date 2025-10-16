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
      title="Cashback Ledger"
      subtitle="Review accrued cashback entries and settlement cycles."
    >
      <PagePlaceholder title="Cashback Ledger" />
    </AppLayout>
  );
}
