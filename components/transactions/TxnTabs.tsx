import React, { useMemo } from 'react';

import PillSlider, {
  PillSliderTab,
  PillSliderVariantTokens,
} from '../common/PillSlider';
import styles from './TxnTabs.module.css';

export type TxnTabKey = string;

export type TxnTab = {
  id: TxnTabKey;
  label: string;
  count: number;
};

export type TxnTabsProps = {
  activeTab: TxnTabKey;
  onTabChange: (tab: TxnTabKey) => void;
  tabs: TxnTab[];
};

// Map tab IDs to color variants
const TAB_COLOR_MAP: Record<string, string> = {
  all: 'default',
  expense: 'danger',
  income: 'success',
  transfer: 'primary',
};

const VARIANT_TOKENS: Record<string, PillSliderVariantTokens> = {
  default: { background: '#2563eb', foreground: '#ffffff', shadow: '0 12px 25px rgba(37, 99, 235, 0.25)' },
  danger: { background: '#dc2626', foreground: '#ffffff', shadow: '0 12px 25px rgba(220, 38, 38, 0.25)' },
  success: { background: '#16a34a', foreground: '#ffffff', shadow: '0 12px 25px rgba(22, 163, 74, 0.25)' },
  primary: { background: '#7c3aed', foreground: '#ffffff', shadow: '0 12px 25px rgba(124, 58, 237, 0.25)' },
};

type TxnSliderTab = TxnTab & PillSliderTab & { variant: string };

export function TxnTabs({ activeTab, onTabChange, tabs }: TxnTabsProps) {
  const sliderTabs: TxnSliderTab[] = useMemo(
    () =>
      tabs.map((tab) => ({
        ...tab,
        variant: TAB_COLOR_MAP[tab.id.toLowerCase()] || 'default',
      })),
    [tabs],
  );

  return (
    <PillSlider
      ariaLabel="Transaction views"
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

export default TxnTabs;
