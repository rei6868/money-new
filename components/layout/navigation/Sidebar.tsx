import Link from 'next/link';
import { useMemo } from 'react';
import { FiChevronDown } from 'react-icons/fi';

import { useLayoutNavigation } from './LayoutNavigationContext';
import { SidebarBrand } from './SidebarBrand';
import { SidebarFooter } from './SidebarFooter';
import { SidebarFlyout } from './SidebarFlyout';
import styles from '../AppShell/AppShell.module.css';

export function Sidebar(): JSX.Element {
  const {
    navItems,
    activeKeys,
    expandedGroups,
    toggleGroup,
    isCollapsed,
    openFlyout,
    scheduleFlyoutClose,
    cancelFlyoutClose,
  } = useLayoutNavigation();

  const collapsedClass = useMemo(
    () => (isCollapsed ? ` ${styles.sidebarCollapsed}` : ''),
    [isCollapsed],
  );

  return (
    <aside
      id="moneyflow-sidebar"
      className={`${styles.sidebar}${collapsedClass}`}
    >
      <SidebarBrand />

      <nav className={styles.nav} role="navigation" aria-label="Primary">
        {navItems.map((item) => {
          if (!item.children) {
            const Icon = item.icon;
            const isActive = activeKeys.has(item.key);
            return (
              <Link
                key={item.key}
                href={item.href ?? '#'}
                className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
                data-testid={`sidebar-link-${item.key}`}
                title={item.description ?? item.label}
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.description ?? item.label}
              >
                <span className={styles.iconSlot}>{Icon ? <Icon /> : null}</span>
                <span className={styles.linkLabel}>{item.label}</span>
              </Link>
            );
          }

          const Icon = item.icon;
          const isExpanded = expandedGroups.includes(item.key);
          const parentActive = activeKeys.has(item.key);

          return (
            <div
              key={item.key}
              className={styles.navGroup}
              onMouseLeave={() => {
                if (isCollapsed) {
                  scheduleFlyoutClose();
                }
              }}
            >
              <button
                type="button"
                className={`${styles.navGroupTrigger} ${parentActive ? styles.navLinkActive : ''}`}
                onClick={() => toggleGroup(item.key)}
                onMouseEnter={(event) => {
                  if (!isCollapsed) {
                    return;
                  }
                  cancelFlyoutClose();
                  openFlyout(item.key, event.currentTarget);
                }}
                aria-expanded={isCollapsed ? undefined : isExpanded}
                aria-controls={
                  isCollapsed ? `sidebar-flyout-${item.key}` : `sidebar-submenu-${item.key}`
                }
                data-testid={`sidebar-group-${item.key}`}
                title={item.description ?? item.label}
                aria-label={item.description ?? item.label}
              >
                <span className={styles.iconSlot}>
                  {Icon ? <Icon /> : null}
                  {isCollapsed && <span className={styles.collapsedIndicator} aria-hidden="true" />}
                </span>
                <span className={styles.linkLabel}>{item.label}</span>
                <FiChevronDown
                  className={`${styles.chevron} ${isExpanded ? styles.chevronOpen : ''}`}
                />
              </button>

              {!isCollapsed && (
                <div
                  id={`sidebar-submenu-${item.key}`}
                  className={`${styles.subNav} ${isExpanded ? styles.subNavOpen : ''}`}
                  role="group"
                >
                  {item.children.map((child) => {
                    const childActive = activeKeys.has(child.key);
                    return (
                      <Link
                        key={child.key}
                        href={child.href ?? '#'}
                        className={`${styles.subNavLink} ${childActive ? styles.navLinkActive : ''}`}
                        data-testid={`sidebar-link-${child.key}`}
                        title={child.label}
                        aria-current={childActive ? 'page' : undefined}
                        aria-label={child.label}
                      >
                        <span className={styles.bullet} aria-hidden />
                        <span className={styles.linkLabel}>{child.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <SidebarFooter />
      <SidebarFlyout />
    </aside>
  );
}
