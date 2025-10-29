import AppLayout from '../components/layout/AppShell/AppShell';
import PagePlaceholder from '../components/PagePlaceholder';
import { useRequireAuth } from '../hooks/useRequireAuth';

export default function AttendancePage() {
  const { isAuthenticated, isLoading } = useRequireAuth();

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <AppLayout
      title="Attendance"
      subtitle="Attendance tracking, schedules, and shift summaries will be provided here."
    >
      <PagePlaceholder title="Attendance" />
    </AppLayout>
  );
}
