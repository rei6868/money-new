import { useEffect, useMemo, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  FiGrid,
  FiRepeat,
  FiSettings,
  FiLogOut,
  FiMoon,
  FiSun,
  FiChevronDown,
  FiMenu,
  FiCreditCard,
} from 'react-icons/fi';

import { useAuth } from '../context/AuthContext';
import { TopNavBar } from './TopNavBar';

import styles from './AppLayout.module.css';

const NAV_ITEMS = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: FiGrid,
  },
  {
    key: 'transactions',
    label: 'Transactions History',
    href: '/transactions',
    icon: FiRepeat,
  },
  {
    key: 'accounts',
    label: 'Accounts',
    href: '/accounts',
    icon: FiCreditCard,
    description: 'Accounts – overview and management',
  },
];

const THEME_STORAGE_KEY = 'moneyflow-preferred-theme';
const SIDEBAR_STORAGE_KEY = 'moneyflow-sidebar-collapsed';

function getInitialTheme() {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const storedValue = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (storedValue === 'dark' || storedValue === 'light') {
    return storedValue;
  }

  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }

  return 'light';
}

function getInitialSidebarState() {
  if (typeof window === 'undefined') {
    return true;
  }
  const storedValue = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
  if (storedValue === 'false') {
    return false;
  }
  return true;
}

function isPathActive(pathname, href) {
  if (href === '/') {
    return pathname === '/';
  }
  if (pathname === href) {
    return true;
  }
  return pathname.startsWith(`${href}/`);
}

export default function AppLayout({ title, subtitle, children }) {
  const router = useRouter();
  const { logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(() => getInitialSidebarState());
  const [theme, setTheme] = useState(() => getInitialTheme());
  const [activeFlyout, setActiveFlyout] = useState(null);
  const [flyoutPosition, setFlyoutPosition] = useState({ top: 0 });
  const navGroupRefs = useRef({});
  const flyoutCloseTimer = useRef(null);

  const [expandedGroups, setExpandedGroups] = useState(() => {
    const currentPath = router.pathname;
    return NAV_ITEMS.filter((item) =>
      item.children?.some((child) => isPathActive(currentPath, child.href)),
    ).map((item) => item.key);
  });

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    document.documentElement.dataset.theme = theme;
    document.body.dataset.theme = theme;

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, isCollapsed ? 'true' : 'false');
  }, [isCollapsed]);

  useEffect(() => {
    if (!isCollapsed) {
      setExpandedGroups((prev) => {
        const next = new Set(prev);
        NAV_ITEMS.forEach((item) => {
          if (item.children?.some((child) => isPathActive(router.pathname, child.href))) {
            next.add(item.key);
          }
        });
        return Array.from(next);
      });
    }
  }, [router.pathname, isCollapsed]);

  const activeKeys = useMemo(() => {
    const currentPath = router.pathname;
    return NAV_ITEMS.reduce((acc, item) => {
      if (item.href && isPathActive(currentPath, item.href)) {
        acc.add(item.key);
      }
      item.children?.forEach((child) => {
        if (isPathActive(currentPath, child.href)) {
          acc.add(child.key);
          acc.add(item.key);
        }
      });
      return acc;
    }, new Set());
  }, [router.pathname]);

  const isSettingsActive = router.pathname.startsWith('/settings');

  const topNavActiveKeys = useMemo(() => {
    const keys = new Set(activeKeys);
    if (isSettingsActive) {
      keys.add('settings');
    }
    return keys;
  }, [activeKeys, isSettingsActive]);

  const handleToggleGroup = (groupKey) => {
    // Only handle accordion toggle in expanded mode
    if (!isCollapsed) {
      setExpandedGroups((prev) =>
        prev.includes(groupKey) ? prev.filter((item) => item !== groupKey) : [...prev, groupKey],
      );
    }
  };

  const handleMouseEnterGroup = (groupKey) => {
    if (isCollapsed) {
      if (flyoutCloseTimer.current) {
        clearTimeout(flyoutCloseTimer.current);
        flyoutCloseTimer.current = null;
      }
      const buttonElement = navGroupRefs.current[groupKey];
      if (buttonElement) {
        const rect = buttonElement.getBoundingClientRect();
        setFlyoutPosition({ top: rect.top });
      }
      setActiveFlyout(groupKey);
    }
  };

  const handleMouseLeaveGroup = () => {
    if (isCollapsed) {
      flyoutCloseTimer.current = setTimeout(() => {
        setActiveFlyout(null);
      }, 150);
    }
  };

  const handleCloseFlyout = () => {
    setActiveFlyout(null);
  };

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleCollapse = () => {
    setIsCollapsed((prev) => !prev);
    setActiveFlyout(null); // Close any open flyouts when toggling collapse
  };

  const handleFlyoutMouseEnter = () => {
    if (flyoutCloseTimer.current) {
      clearTimeout(flyoutCloseTimer.current);
      flyoutCloseTimer.current = null;
    }
  };

  const handleFlyoutMouseLeave = () => {
    if (isCollapsed) {
      flyoutCloseTimer.current = setTimeout(() => {
        setActiveFlyout(null);
      }, 150);
    }
  };

  // Close flyout when route changes
  useEffect(() => {
    setActiveFlyout(null);
  }, [router.pathname]);

  const renderNavLink = (item) => {
    const Icon = item.icon;
    const isActive = activeKeys.has(item.key);

    return (
      <Link
        key={item.key}
        href={item.href}
        className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
        data-testid={`sidebar-link-${item.key}`}
        title={item.description ?? item.label}
        aria-current={isActive ? 'page' : undefined}
        aria-label={item.description ?? item.label}
      >
        <span className={styles.iconSlot}>
          <Icon />
        </span>
        <span className={styles.linkLabel}>{item.label}</span>
      </Link>
    );
  };

  const renderNavGroup = (item) => {
    const Icon = item.icon;
    const isExpanded = expandedGroups.includes(item.key);
    const parentActive = activeKeys.has(item.key);
    const isFlyoutOpen = isCollapsed && activeFlyout === item.key;

    return (
      <div 
        key={item.key} 
        className={styles.navGroup}
        onMouseEnter={() => handleMouseEnterGroup(item.key)}
        onMouseLeave={handleMouseLeaveGroup}
      >
        <button
          ref={(el) => { navGroupRefs.current[item.key] = el; }}
          type="button"
          className={`${styles.navGroupTrigger} ${parentActive ? styles.navLinkActive : ''}`}
          onClick={() => handleToggleGroup(item.key)}
          aria-expanded={isCollapsed ? isFlyoutOpen : isExpanded}
          aria-controls={isCollapsed ? `sidebar-flyout-${item.key}` : `sidebar-submenu-${item.key}`}
          data-testid={`sidebar-group-${item.key}`}
          title={item.description ?? item.label}
          aria-label={item.description ?? item.label}
        >
          <span className={styles.iconSlot}>
            <Icon />
            {isCollapsed && (
              <span className={styles.collapsedIndicator} aria-hidden="true" />
            )}
          </span>
          <span className={styles.linkLabel}>{item.label}</span>
          <FiChevronDown className={`${styles.chevron} ${isExpanded ? styles.chevronOpen : ''}`} />
        </button>
        
        {/* Regular accordion submenu for expanded state */}
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
                  href={child.href}
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
        
        {/* Flyout menu for collapsed state */}
        {isCollapsed && isFlyoutOpen && (
          <div
            id={`sidebar-flyout-${item.key}`}
            className={styles.flyoutMenu}
            role="group"
            aria-label={`${item.label} submenu`}
            style={{
              top: `${flyoutPosition.top}px`
            }}
            onMouseEnter={handleFlyoutMouseEnter}
            onMouseLeave={handleFlyoutMouseLeave}
          >
            <div className={styles.flyoutHeader}>
              <span className={styles.flyoutTitle}>{item.label}</span>
            </div>
            <div className={styles.flyoutContent}>
              {item.children.map((child) => {
                const childActive = activeKeys.has(child.key);
                return (
                  <Link
                    key={child.key}
                    href={child.href}
                    className={`${styles.flyoutLink} ${childActive ? styles.flyoutLinkActive : ''}`}
                    data-testid={`sidebar-flyout-link-${child.key}`}
                    title={child.label}
                    aria-current={childActive ? 'page' : undefined}
                    onClick={handleCloseFlyout}
                  >
                    {child.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.appShell} data-testid="app-root">
      <aside
        id="moneyflow-sidebar"
        className={`${styles.sidebar} ${isCollapsed ? styles.sidebarCollapsed : ''}`}
      >
        <div className={styles.brandSection}>
          <button
            type="button"
            className={styles.collapseTrigger}
            onClick={handleCollapse}
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

        <nav className={styles.nav} role="navigation" aria-label="Primary">
          {NAV_ITEMS.map((item) =>
            item.children ? renderNavGroup(item) : renderNavLink(item),
          )}
        </nav>

        <div className={styles.sidebarFooter}>
          <Link
            href="/settings"
            className={`${styles.navLink} ${isSettingsActive ? styles.navLinkActive : ''}`}
            data-testid="sidebar-link-settings"
            title="Settings"
            aria-label="Settings"
            aria-current={isSettingsActive ? 'page' : undefined}
          >
            <span className={styles.iconSlot}>
              <FiSettings />
            </span>
            <span className={styles.linkLabel}>Settings</span>
          </Link>

          <button
            type="button"
            className={styles.navLink}
            onClick={handleToggleTheme}
            data-testid="dark-mode-toggle"
            aria-pressed={theme === 'dark'}
            aria-label="Toggle dark mode"
            title="Toggle dark mode"
          >
            <span className={styles.iconSlot}>{theme === 'dark' ? <FiSun /> : <FiMoon />}</span>
            <span className={styles.linkLabel}>Dark Mode</span>
          </button>

          <button
            type="button"
            className={styles.navLink}
            onClick={handleLogout}
            data-testid="logout-button"
            aria-label="Logout"
            title="Logout"
          >
            <span className={styles.iconSlot}>
              <FiLogOut />
            </span>
            <span className={styles.linkLabel}>Logout</span>
          </button>
        </div>
      </aside>
      <div className={styles.mainColumn}>
        <div className={styles.topNavBarContainer}>
          <TopNavBar
            navItems={NAV_ITEMS}
            activeKeys={topNavActiveKeys}
            onToggleTheme={handleToggleTheme}
            onLogout={handleLogout}
            theme={theme}
            settingsLink={{ key: 'settings', label: 'Settings', href: '/settings' }}
          />
        </div>


        <main className={styles.mainContent} data-testid="layout-main">
          {children}
        </main>
      </div>
    </div>
  );
}

