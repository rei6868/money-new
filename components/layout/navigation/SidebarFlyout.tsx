import Link from 'next/link';

import { useLayoutNavigation } from './LayoutNavigationContext';
import styles from '../AppShell/AppShell.module.css';

export function SidebarFlyout(): JSX.Element | null {
  const {
    isCollapsed,
    activeFlyout,
    navItems,
    flyoutPosition,
    activeKeys,
    cancelFlyoutClose,
    scheduleFlyoutClose,
    closeFlyout,
  } = useLayoutNavigation();

  if (!isCollapsed || !activeFlyout) {
    return null;
  }

  const parent = navItems.find((item) => item.key === activeFlyout);
  if (!parent || !Array.isArray(parent.children) || parent.children.length === 0) {
    return null;
  }

  return (
    <div
      id={`sidebar-flyout-${parent.key}`}
      className={styles.flyoutMenu}
      role="group"
      aria-label={`${parent.label} submenu`}
      style={{ top: `${flyoutPosition.top}px` }}
      onMouseEnter={cancelFlyoutClose}
      onMouseLeave={scheduleFlyoutClose}
    >
      <div className={styles.flyoutHeader}>
        <span className={styles.flyoutTitle}>{parent.label}</span>
      </div>
      <div className={styles.flyoutContent}>
        {parent.children.map((child) => {
          const childActive = activeKeys.has(child.key);
          return (
            <Link
              key={child.key}
              href={child.href ?? '#'}
              className={`${styles.flyoutLink} ${childActive ? styles.flyoutLinkActive : ''}`}
              data-testid={`sidebar-flyout-link-${child.key}`}
              title={child.label}
              aria-current={childActive ? 'page' : undefined}
              onClick={closeFlyout}
            >
              {child.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
