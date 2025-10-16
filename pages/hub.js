import AppLayout from '../components/AppLayout';
import PagePlaceholder from '../components/PagePlaceholder';
import { useRequireAuth } from '../hooks/useRequireAuth';

export default function HubPage() {
  const { isAuthenticated, isLoading } = useRequireAuth();

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <AppLayout
      title="Hub"
      subtitle="Central workspace for collaboration, tasks, and shared resources."
    >
      <PagePlaceholder title="Hub" />
    </AppLayout>
  );
}
