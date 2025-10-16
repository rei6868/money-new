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
      subtitle="Track employees, contractors, and spending relationships."
    >
      <PagePlaceholder title="People" />
    </AppLayout>
  );
}
