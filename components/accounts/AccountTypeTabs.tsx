import React from 'react';

import styles from './AccountTypeTabs.module.css';

export type AccountTypeTabKey = string;

export type AccountTypeTab = {
  id: AccountTypeTabKey;
  label: string;
  count: number;
};

export type AccountTypeTabsProps = {
  activeTab: AccountTypeTabKey;
  onTabChange: (tab: AccountTypeTabKey) => void;
  tabs: AccountTypeTab[];
};

// Map tab IDs to color variants
const TAB_COLOR_MAP: Record<string, string> = {
  all: 'default',
  bank: 'indigo',
  credit: 'danger',
  saving: 'teal',
  invest: 'orange',
  'e-wallet': 'purple',
  group: 'blue',
  loan: 'amber',
  mortgage: 'rose',
  cash: 'success',
  other: 'gray',
};

export function AccountTypeTabs({ activeTab, onTabChange, tabs }: AccountTypeTabsProps) {
  return (
    <div className={styles.root} role="tablist" aria-label="Account type filters">
      {tabs.map((tab) => {
        const colorVariant = TAB_COLOR_MAP[tab.id.toLowerCase()] || 'default';
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            className={styles.tabButton}
            data-active={isActive ? 'true' : 'false'}
            data-color={colorVariant}
            onClick={() => onTabChange(tab.id)}
            role="tab"
            aria-selected={isActive}
          >
            <span className={styles.tabLabel}>{tab.label}</span>
            <span className={styles.tabCount}>{tab.count}</span>
          </button>
        );
      })}
    </div>
  );
}

export default AccountTypeTabs;

