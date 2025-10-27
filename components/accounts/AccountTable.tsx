import styles from "./AccountTable.module.css";

type AccountRow = {
  id: string;
  name: string;
  typeLabel: string;
  status: string;
  statusLabel: string;
  ownerId: string;
  ownerName?: string | null;
  balance: string | number | null;
  notes?: string | null;
};

interface AccountTableProps {
  accounts: AccountRow[];
  formatCurrency: (value: string | number | null | undefined) => string;
}

function renderOwner(account: AccountRow) {
  if (account.ownerName) {
    return account.ownerName;
  }

  if (!account.ownerId) {
    return "Unassigned";
  }

  if (account.ownerId.length <= 12) {
    return account.ownerId;
  }

  return `${account.ownerId.slice(0, 8)}…${account.ownerId.slice(-4)}`;
}

export default function AccountTable({ accounts, formatCurrency }: AccountTableProps) {
  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <caption className={`${styles.caption} hidden`}>Accounts table view</caption>
        <thead>
          <tr>
            <th scope="col">Account</th>
            <th scope="col">Type</th>
            <th scope="col">Owner</th>
            <th scope="col">Current balance</th>
            <th scope="col">Status</th>
            <th scope="col">Notes</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((account) => (
            <tr key={account.id}>
              <th scope="row">
                <span className={styles.accountName}>{account.name}</span>
                <span className={styles.accountId}>{account.id}</span>
              </th>
              <td>{account.typeLabel}</td>
              <td>{renderOwner(account)}</td>
              <td className={styles.numeric}>{formatCurrency(account.balance)}</td>
              <td>
                <span className={styles.statusBadge} data-status={account.status}>
                  {account.statusLabel}
                </span>
              </td>
              <td>{account.notes ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
