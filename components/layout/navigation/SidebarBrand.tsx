import Link from 'next/link';
import { FiMenu } from 'react-icons/fi';

import { useLayoutNavigation } from './LayoutNavigationContext';
import styles from '../AppShell/AppShell.module.css';

export function SidebarBrand(): JSX.Element {
  const { isCollapsed, toggleSidebar } = useLayoutNavigation();

  return (
    <div className={styles.brandSection}>
      <button
        type="button"
        className={styles.collapseTrigger}
        onClick={toggleSidebar}
        aria-pressed={isCollapsed}
        data-testid="sidebar-collapse-toggle"
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <FiMenu />
      </button>
      <Link
        href="/transactions"
        className={styles.brandLink}
        aria-label="Money Flow home"
        data-testid="sidebar-brand"
      >
        <div className={styles.brandCopy}>
          <span className={styles.brandName}>Money Flow</span>
        </div>
      </Link>
    </div>
  );
}
