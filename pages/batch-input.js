import AppLayout from '../components/AppLayout';
import PagePlaceholder from '../components/PagePlaceholder';
import { useRequireAuth } from '../hooks/useRequireAuth';

export default function BatchInputPage() {
  const { isAuthenticated, isLoading } = useRequireAuth();

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <AppLayout
      title="Batch Input"
      subtitle="Upload and reconcile batch transaction imports with guardrails."
    >
      <PagePlaceholder title="Batch Input" />
    </AppLayout>
  );
}

