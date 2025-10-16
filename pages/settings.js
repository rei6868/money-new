import AppLayout from '../components/AppLayout';
import PagePlaceholder from '../components/PagePlaceholder';
import { useRequireAuth } from '../hooks/useRequireAuth';

export default function SettingsPage() {
  const { isAuthenticated, isLoading } = useRequireAuth();

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <AppLayout
      title="Settings"
      subtitle="Profile, security, and automation controls will appear soon."
    >
      <PagePlaceholder title="Settings" />
    </AppLayout>
  );
}
