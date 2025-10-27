import styles from "./AccountCards.module.css";

type AccountCard = {
  id: string;
  name: string;
  typeLabel: string;
  status: string;
  statusLabel: string;
  ownerId: string;
  ownerName?: string | null;
  balance: string | number | null;
  notes?: string | null;
  imgUrl?: string | null;
};

interface AccountCardsProps {
  accounts: AccountCard[];
  formatCurrency: (value: string | number | null | undefined) => string;
}

function getOwnerDisplay(account: AccountCard) {
  if (account.ownerName) {
    return account.ownerName;
  }

  if (!account.ownerId) {
    return "Unassigned";
  }

  if (account.ownerId.length <= 10) {
    return account.ownerId;
  }

  return `${account.ownerId.slice(0, 6)}…${account.ownerId.slice(-4)}`;
}

export default function AccountCards({ accounts, formatCurrency }: AccountCardsProps) {
  return (
    <div className={styles.grid} data-testid="accounts-card-grid">
      {accounts.map((account) => (
        <article
          key={account.id}
          className={styles.card}
        >
          <div
            className={styles.media}
            aria-hidden
            style={
              account.imgUrl
                ? { backgroundImage: `url(${account.imgUrl})` }
                : undefined
            }
          />
          <div className={styles.overlay} aria-hidden />
          <div className={styles.cardContent}>
            <header className={styles.cardHeader}>
              <div className={styles.identityBlock}>
                <span className={styles.accountGlyph} aria-hidden>
                  {account.name.charAt(0).toUpperCase()}
                </span>
                <div>
                  <p className={styles.accountName}>{account.name}</p>
                  <p className={styles.accountMeta}>{account.typeLabel}</p>
                </div>
              </div>
              <span className={styles.statusBadge} data-status={account.status}>
                {account.statusLabel}
              </span>
            </header>

            <div className={styles.balanceRow}>
              <p className={styles.balanceLabel}>Current balance</p>
              <p className={styles.balanceValue}>{formatCurrency(account.balance)}</p>
            </div>

            <dl className={styles.metaList}>
              <div>
                <dt>Owner</dt>
                <dd>{getOwnerDisplay(account)}</dd>
              </div>
              <div>
                <dt>Account ID</dt>
                <dd className={styles.monospace}>{account.id}</dd>
              </div>
              {account.notes ? (
                <div>
                  <dt>Notes</dt>
                  <dd>{account.notes}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        </article>
      ))}
    </div>
  );
}
