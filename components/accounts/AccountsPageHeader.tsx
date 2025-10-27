import React from 'react';
import { FiPlus, FiRefreshCw } from 'react-icons/fi';

import styles from '../../styles/accounts.module.css';

type ActiveTab = 'table' | 'cards';

type AccountsPageHeaderProps = {
  accountCount: number;
  totalBalance: number;
  activeTab: ActiveTab;
  onTabChange?: (tab: ActiveTab) => void;
  onRefresh?: () => void;
  onAddAccount?: () => void;
  isRefreshing?: boolean;
};

function formatCountLabel(count: number) {
  if (!Number.isFinite(count)) {
    return '0 accounts';
  }
  if (count === 1) {
    return '1 account';
  }
  return `${count} accounts`;
}

export function AccountsPageHeader({
  accountCount,
  totalBalance,
  activeTab,
  onTabChange,
  onRefresh,
  onAddAccount,
  isRefreshing = false,
}: AccountsPageHeaderProps) {
  const formattedBalance = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(totalBalance) || 0);

  return (
    <header className={styles.pageHeader}>
      <div className={styles.pageTitleGroup}>
        <h1 className={styles.pageTitle}>Accounts overview</h1>
        <p className={styles.pageSubtitle}>
          Monitor balances across every connected account, switch between detailed rows and cards,
          and keep financial insights in sync with your transactions workspace.
        </p>
        <div className={styles.headerMeta}>
          <span className={styles.summaryPill}>{formatCountLabel(accountCount)}</span>
          <span className={styles.summaryPill}>
            Total balance <span className={styles.summaryValue}>{formattedBalance}</span>
          </span>
        </div>
      </div>

      <div className={styles.pageHeaderActions}>
        <div className={styles.headerTabGroup} role="tablist" aria-label="Accounts view mode">
          <div className={styles.viewTabs}>
            <button
              type="button"
              className={styles.tabButton}
              data-active={activeTab === 'table' ? 'true' : 'false'}
              onClick={() => onTabChange?.('table')}
              role="tab"
              aria-selected={activeTab === 'table'}
            >
              Table
            </button>
            <button
              type="button"
              className={styles.tabButton}
              data-active={activeTab === 'cards' ? 'true' : 'false'}
              onClick={() => onTabChange?.('cards')}
              role="tab"
              aria-selected={activeTab === 'cards'}
            >
              Cards
            </button>
          </div>
        </div>

        <div className={styles.headerActionButtons}>
          <button
            type="button"
            className={`${styles.secondaryButton} ${styles.toolbarIconButton}`.trim()}
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <FiRefreshCw aria-hidden />
            Refresh
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={onAddAccount}
            disabled
          >
            <FiPlus aria-hidden />
            Add account (coming soon)
          </button>
        </div>
      </div>
    </header>
  );
}

export default AccountsPageHeader;
