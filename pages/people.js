import AppLayout from '../components/AppLayout';
import PagePlaceholder from '../components/PagePlaceholder';
import { useRequireAuth } from '../hooks/useRequireAuth';

export default function PeoplePage() {
  const { isAuthenticated, isLoading } = useRequireAuth();

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <AppLayout
      title="People"
      subtitle="Manage individuals linked to accounts, transactions, and reimbursements."
    >
      <PagePlaceholder title="People management workspace" />
    </AppLayout>
  );
}
