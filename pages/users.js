import AppLayout from '../components/layout/AppShell/AppShell';
import PagePlaceholder from '../components/PagePlaceholder';
import { useRequireAuth } from '../hooks/useRequireAuth';

export default function UsersPage() {
  const { isAuthenticated, isLoading } = useRequireAuth();

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <AppLayout
      title="Users"
      subtitle="Manage teammates, roles, and approval workflows across the platform."
    >
      <PagePlaceholder title="Users" />
    </AppLayout>
  );
}
