import AppLayout from '../components/AppLayout';
import PagePlaceholder from '../components/PagePlaceholder';
import { useRequireAuth } from '../hooks/useRequireAuth';

export default function OverviewPage() {
  const { isAuthenticated, isLoading } = useRequireAuth();

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <AppLayout
      title="Overview"
      subtitle="Snapshot of current performance indicators and account health."
    >
      <PagePlaceholder title="Overview" />
    </AppLayout>
  );
}
