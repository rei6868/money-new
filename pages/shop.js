import AppLayout from '../components/AppLayout';
import PagePlaceholder from '../components/PagePlaceholder';
import { useRequireAuth } from '../hooks/useRequireAuth';

export default function ShopPage() {
  const { isAuthenticated, isLoading } = useRequireAuth();

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <AppLayout title="Shop" subtitle="Manage partner shops and on-site purchases.">
      <PagePlaceholder title="Shop" />
    </AppLayout>
  );
}

