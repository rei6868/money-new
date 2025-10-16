import AppLayout from '../components/AppLayout';
import { useRequireAuth } from '../hooks/useRequireAuth';

import styles from '../styles/TransactionsHistoryPage.module.css';

export default function TransactionsHistoryPage() {
  const { isAuthenticated, isLoading } = useRequireAuth();

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <AppLayout title="Transactions History">
      <div className={styles.container}>
        <p className={styles.message}>
          Feature in development – Transactions History coming soon!
        </p>
      </div>
    </AppLayout>
  );
}
