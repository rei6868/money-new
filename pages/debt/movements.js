import PagePlaceholder from '../../components/PagePlaceholder';
import { useRequireAuth } from '../../hooks/useRequireAuth';

export default function DebtMovementsPage() {
  const { isAuthenticated, isLoading } = useRequireAuth();

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return <PagePlaceholder title="Debt Movements" />;
}

