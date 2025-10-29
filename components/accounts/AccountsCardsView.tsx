import React from 'react';

import { resolveCloudinaryImage } from '../../lib/cloudinary';
import { formatAmountWithTrailing } from '../../lib/numberFormat';
import { EmptyStateCard } from '../layout/panels';
import cardStyles from '../../styles/accounts/cards.module.css';
import AccountsQuickActions from './AccountsQuickActions';
import { AccountRow, getStatusClass } from './accountColumns';

type AccountsCardsViewProps = {
  accounts: AccountRow[];
  onQuickAction?: (actionId: string, account: AccountRow) => void;
};

function resolveStatus(account: AccountRow) {
  return account.status ?? 'inactive';
}

function resolveBalance(account: AccountRow) {
  return `$${formatAmountWithTrailing(account.currentBalance ?? 0)}`;
}

export function AccountsCardsView({ accounts, onQuickAction }: AccountsCardsViewProps) {
  if (!accounts || accounts.length === 0) {
    return (
      <EmptyStateCard className={cardStyles.cardsEmpty}>
        No accounts available yet. Connect a bank, wallet, or add an offline account to see it appear
        here.
      </EmptyStateCard>
    );
  }

  return (
    <div className={cardStyles.cardsGrid}>
      {accounts.map((account) => {
        const status = resolveStatus(account);
        const statusClass = `${cardStyles.statusBadge} ${getStatusClass(status)}`.trim();
        const backgroundImage = resolveCloudinaryImage(account.imgUrl);
        return (
          <article key={account.accountId} className={cardStyles.accountCard}>
            <div className={cardStyles.cardMedia} style={{ backgroundImage }}>
              <span className={cardStyles.cardOverlay} aria-hidden />
              <div className={cardStyles.cardContent}>
                <h3 className={cardStyles.cardTitle}>{account.accountName ?? 'Unnamed account'}</h3>
                <div className={cardStyles.cardMeta}>
                  <span>{account.accountType ?? 'Unknown type'}</span>
                </div>
                <div className={cardStyles.cardBalance}>{resolveBalance(account)}</div>
              </div>
            </div>
            <footer className={cardStyles.cardFooter}>
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
