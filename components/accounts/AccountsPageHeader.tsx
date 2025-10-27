import React from 'react';

import styles from '../../styles/accounts.module.css';

type ActiveTab = 'table' | 'cards';

type AccountsPageHeaderProps = {
  activeTab: ActiveTab;
  onTabChange?: (tab: ActiveTab) => void;
};

export function AccountsPageHeader({ activeTab, onTabChange }: AccountsPageHeaderProps) {
  return (
    <header className={styles.pageHeader}>
      <div className={styles.pageTitleGroup}>
        <h1 className={styles.pageTitle}>Accounts</h1>
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

      </div>
    </header>
  );
}

export default AccountsPageHeader;
