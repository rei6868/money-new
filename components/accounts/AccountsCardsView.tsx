import React from 'react';

import { resolveCloudinaryImage } from '../../lib/cloudinary';
import { formatAmountWithTrailing } from '../../lib/numberFormat';
import styles from '../../styles/accounts.module.css';
import AccountsQuickActions from './AccountsQuickActions';
import { AccountRow, getStatusClass } from './accountColumns';

type AccountsCardsViewProps = {
  accounts: AccountRow[];
  onQuickAction?: (actionId: string, account: AccountRow) => void;
};

function resolveOwner(account: AccountRow) {
  return account.ownerName ?? account.ownerId ?? 'Unassigned';
}

function resolveStatus(account: AccountRow) {
  return account.status ?? 'inactive';
}

function resolveBalance(account: AccountRow) {
  return `$${formatAmountWithTrailing(account.currentBalance ?? 0)}`;
}

export function AccountsCardsView({ accounts, onQuickAction }: AccountsCardsViewProps) {
  if (!accounts || accounts.length === 0) {
    return (
      <div className={styles.cardsEmpty}>
        No accounts available yet. Connect a bank, wallet, or add an offline account to see it
        appear here.
      </div>
    );
  }

  return (
    <div className={styles.cardsGrid}>
      {accounts.map((account) => {
        const status = resolveStatus(account);
        const statusClass = `${styles.statusBadge} ${getStatusClass(status)}`.trim();
        const backgroundImage = resolveCloudinaryImage(account.imgUrl);
        return (
          <article key={account.accountId} className={styles.accountCard}>
            <div className={styles.cardMedia} style={{ backgroundImage }}>
              <span className={styles.cardOverlay} aria-hidden />
              <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>{account.accountName ?? 'Unnamed account'}</h3>
                <div className={styles.cardMeta}>
                  <span>{account.accountType ?? 'Unknown type'}</span>
                  <span>Owner: {resolveOwner(account)}</span>
                </div>
                <div className={styles.cardBalance}>{resolveBalance(account)}</div>
              </div>
            </div>
            <footer className={styles.cardFooter}>
              <span className={statusClass}>{status}</span>
              <AccountsQuickActions
                account={account}
                onAction={onQuickAction}
                disabled={!onQuickAction}
              />
            </footer>
          </article>
        );
      })}
    </div>
  );
}

export default AccountsCardsView;
