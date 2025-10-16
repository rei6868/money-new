import AppLayout from '../components/AppLayout';
import PagePlaceholder from '../components/PagePlaceholder';
import { useRequireAuth } from '../hooks/useRequireAuth';

export default function InvoicePage() {
  const { isAuthenticated, isLoading } = useRequireAuth();

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <AppLayout
      title="Invoice"
      subtitle="Invoice drafts, payment timelines, and reminders will appear here."
    >
      <PagePlaceholder title="Invoice" />
    </AppLayout>
  );
}
