import styles from './TxnTabs.module.css';

export type TxnTabKey = 'all' | 'income' | 'expenses' | 'transfer';

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

export function TxnTabs({ activeTab, onTabChange, tabs }: TxnTabsProps) {
  return (
    <div className={styles.root} role="tablist" aria-label="Transaction views">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={styles.tabButton}
          data-active={tab.id === activeTab ? 'true' : undefined}
          onClick={() => onTabChange(tab.id)}
          role="tab"
          aria-selected={tab.id === activeTab}
        >
          <span className={styles.tabLabel}>{tab.label}</span>
          <span className={styles.tabCount}>{tab.count}</span>
        </button>
      ))}
    </div>
  );
}

export default TxnTabs;
