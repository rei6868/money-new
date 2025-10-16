import AppLayout from '../components/AppLayout';
import { useRequireAuth } from '../hooks/useRequireAuth';

import styles from '../styles/Transactions.module.css';

const summaryStats = [
  { label: 'Total Balance', value: 48250.21 },
  { label: 'Monthly Spend', value: 18974.32 },
  { label: 'Rewards Earned', value: 2485.5 },
];

const transactions = [
  {
    id: 'TRX-00452',
    date: '2025-10-02',
    description: 'Amazon Web Services',
    category: 'Cloud Services',
    amount: -1423.45,
    status: 'success',
  },
  {
    id: 'TRX-00451',
    date: '2025-10-02',
    description: 'Stripe Payout',
    category: 'Revenue',
    amount: 4821,
    status: 'success',
  },
  {
    id: 'TRX-00450',
    date: '2025-10-01',
    description: 'Delta Corporate Travel',
    category: 'Travel',
    amount: -968.32,
    status: 'pending',
  },
  {
    id: 'TRX-00449',
    date: '2025-09-30',
    description: 'Figma Annual Plan',
    category: 'Software',
    amount: -720,
    status: 'success',
  },
  {
    id: 'TRX-00448',
    date: '2025-09-28',
    description: 'Salesforce Subscription',
    category: 'CRM',
    amount: -2150,
    status: 'failed',
  },
];

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const statusStyles = {
  success: `${styles.status} ${styles.statusSuccess}`,
  pending: `${styles.status} ${styles.statusPending}`,
  failed: `${styles.status} ${styles.statusFailed}`,
};

export default function HomePage() {
  const { isAuthenticated, isLoading } = useRequireAuth();

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <AppLayout
      title="Transactions overview"
      subtitle="Monitor spend, rewards, and reimbursements at a glance."
    >
      <section className={styles.summary}>
        {summaryStats.map((stat) => (
          <article key={stat.label} className={styles.summaryCard}>
            <p className={styles.summaryLabel}>{stat.label}</p>
            <p className={styles.summaryValue}>{currencyFormatter.format(stat.value)}</p>
          </article>
        ))}
      </section>

      <section className={styles.tableCard}>
        <header className={styles.tableHeader}>
          <h2>Transactions History</h2>
          <p>Latest activity across corporate and employee cards.</p>
        </header>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>ID</th>
                <th>Description</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => {
                const amountClass =
                  transaction.amount >= 0 ? styles.positive : styles.negative;

                return (
                  <tr key={transaction.id}>
                    <td>{transaction.date}</td>
                    <td>{transaction.id}</td>
                    <td>{transaction.description}</td>
                    <td>{transaction.category}</td>
                    <td className={amountClass}>{currencyFormatter.format(transaction.amount)}</td>
                    <td>
                      <span className={statusStyles[transaction.status]}>
                        {transaction.status === 'success' && 'Completed'}
                        {transaction.status === 'pending' && 'Pending'}
                        {transaction.status === 'failed' && 'Failed'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {transactions.length === 0 && (
          <div className={styles.emptyState}>No transactions logged yet.</div>
        )}
      </section>
    </AppLayout>
  );
}
