import AppLayout from '../components/layout/AppShell/AppShell';
import PagePlaceholder from '../components/PagePlaceholder';
import { useRequireAuth } from '../hooks/useRequireAuth';

export default function GeoInformationPage() {
  const { isAuthenticated, isLoading } = useRequireAuth();

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <AppLayout
      title="Geo Information"
      subtitle="Geographic analytics, coverage maps, and related filters will live here."
    >
      <PagePlaceholder title="Geo Information" />
    </AppLayout>
  );
}
