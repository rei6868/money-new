import React, { useMemo } from 'react';

import PillSlider, {
  PillSliderTab,
  PillSliderVariantTokens,
} from '../common/PillSlider';
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

const VARIANT_TOKENS: Record<string, PillSliderVariantTokens> = {
  default: { background: '#2563eb', foreground: '#ffffff', shadow: '0 12px 25px rgba(37, 99, 235, 0.25)' },
  indigo: { background: '#4f46e5', foreground: '#ffffff', shadow: '0 12px 25px rgba(79, 70, 229, 0.25)' },
  danger: { background: '#dc2626', foreground: '#ffffff', shadow: '0 12px 25px rgba(220, 38, 38, 0.25)' },
  teal: { background: '#14b8a6', foreground: '#ffffff', shadow: '0 12px 25px rgba(20, 184, 166, 0.25)' },
  orange: { background: '#ea580c', foreground: '#ffffff', shadow: '0 12px 25px rgba(234, 88, 12, 0.25)' },
  purple: { background: '#7c3aed', foreground: '#ffffff', shadow: '0 12px 25px rgba(124, 58, 237, 0.25)' },
  blue: { background: '#0284c7', foreground: '#ffffff', shadow: '0 12px 25px rgba(2, 132, 199, 0.25)' },
  amber: { background: '#f59e0b', foreground: '#ffffff', shadow: '0 12px 25px rgba(245, 158, 11, 0.25)' },
  rose: { background: '#e11d48', foreground: '#ffffff', shadow: '0 12px 25px rgba(225, 29, 72, 0.25)' },
  success: { background: '#16a34a', foreground: '#ffffff', shadow: '0 12px 25px rgba(22, 163, 74, 0.25)' },
  gray: { background: '#64748b', foreground: '#ffffff', shadow: '0 12px 25px rgba(100, 116, 139, 0.25)' },
};

type AccountTypeSliderTab = AccountTypeTab & PillSliderTab & { variant: string };

export function AccountTypeTabs({ activeTab, onTabChange, tabs }: AccountTypeTabsProps) {
  const sliderTabs: AccountTypeSliderTab[] = useMemo(
    () =>
      tabs.map((tab) => ({
        ...tab,
        variant: TAB_COLOR_MAP[tab.id.toLowerCase()] || 'default',
      })),
    [tabs],
  );

  return (
    <PillSlider
      ariaLabel="Account type filters"
      className={styles.root}
      tabClassName={styles.tabButton}
      labelClassName={styles.tabLabel}
      countClassName={styles.tabCount}
      tabs={sliderTabs}
      activeTab={activeTab}
      onTabChange={onTabChange}
      variantTokens={VARIANT_TOKENS}
      getVariant={(tab) => tab.variant}
    />
  );
}

export default AccountTypeTabs;

