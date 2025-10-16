import AppLayout from '../components/AppLayout';
import PagePlaceholder from '../components/PagePlaceholder';
import { useRequireAuth } from '../hooks/useRequireAuth';

export default function DashboardPage() {
  const { isAuthenticated, isLoading } = useRequireAuth();

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <AppLayout title="Dashboard" subtitle="High-level KPIs and analytics will be placed here.">
      <PagePlaceholder title="Dashboard" />
    </AppLayout>
  );
}
