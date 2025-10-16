import AppLayout from '../components/AppLayout';
import PagePlaceholder from '../components/PagePlaceholder';
import { useRequireAuth } from '../hooks/useRequireAuth';

export default function AccountsPage() {
  const { isAuthenticated, isLoading } = useRequireAuth();

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <AppLayout
      title="Accounts"
      subtitle="Manage connected bank and credit accounts from this workspace."
    >
      <PagePlaceholder title="Accounts" />
    </AppLayout>
  );
}
