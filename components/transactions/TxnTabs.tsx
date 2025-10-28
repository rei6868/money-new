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

export function TxnTabs({ activeTab, onTabChange, tabs }: TxnTabsProps) {
  return (
    <div className={styles.root} role="tablist" aria-label="Transaction views">
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

export default TxnTabs;
