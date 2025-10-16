import AppLayout from '../components/AppLayout';
import PagePlaceholder from '../components/PagePlaceholder';
import { useRequireAuth } from '../hooks/useRequireAuth';

export default function ReportsPage() {
  const { isAuthenticated, isLoading } = useRequireAuth();

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <AppLayout
      title="Reports"
      subtitle="Custom profit and loss reporting will be available in a future sprint."
    >
      <PagePlaceholder title="Reports" />
    </AppLayout>
  );
}
