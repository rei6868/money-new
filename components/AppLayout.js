import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  FiGrid,
  FiRepeat,
  FiGift,
  FiTrendingUp,
  FiUsers,
  FiShoppingBag,
  FiTag,
  FiCreditCard,
  FiUploadCloud,
  FiSettings,
  FiLogOut,
  FiMoon,
  FiSun,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiMenu,
  FiX,
} from 'react-icons/fi';

import { useAuth } from '../context/AuthContext';

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
    key: 'cashback',
    label: 'Cashback',
    icon: FiGift,
    children: [
      { key: 'cashback-flow', label: 'Cashback Flow', href: '/cashback/flow' },
      { key: 'cashback-movements', label: 'Movements', href: '/cashback/movements' },
    ],
  },
  {
    key: 'debt',
    label: 'Debt',
    icon: FiTrendingUp,
    children: [
      { key: 'debt-list', label: 'Debt List', href: '/debt/list' },
      { key: 'debt-movements', label: 'Debt Movements', href: '/debt/movements' },
    ],
  },
  {
    key: 'people',
    label: 'People',
    href: '/people',
    icon: FiUsers,
  },
  {
    key: 'shop',
    label: 'Shop',
    href: '/shop',
    icon: FiShoppingBag,
  },
  {
    key: 'category',
    label: 'Category',
    href: '/category',
    icon: FiTag,
  },
  {
    key: 'subscription',
    label: 'Subscription',
    href: '/subscription',
    icon: FiCreditCard,
  },
  {
    key: 'batch-input',
    label: 'Batch Input',
    href: '/batch-input',
    icon: FiUploadCloud,
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
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [theme, setTheme] = useState(() => getInitialTheme());

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
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      NAV_ITEMS.forEach((item) => {
        if (item.children?.some((child) => isPathActive(router.pathname, child.href))) {
          next.add(item.key);
        }
      });
      return Array.from(next);
    });
  }, [router.pathname]);

  useEffect(() => {
    if (!isMobileNavOpen) {
      return;
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsMobileNavOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isMobileNavOpen]);

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

  const handleToggleGroup = (groupKey) => {
    setExpandedGroups((prev) =>
      prev.includes(groupKey) ? prev.filter((item) => item !== groupKey) : [...prev, groupKey],
    );
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
  };

  const handleMobileNavToggle = () => {
    setIsMobileNavOpen((prev) => !prev);
  };

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [router.pathname]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const { body } = document;
    const previousOverflow = body.style.overflow;
    if (isMobileNavOpen) {
      body.style.overflow = 'hidden';
    } else {
      body.style.overflow = '';
    }

    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [isMobileNavOpen]);

  const renderNavLink = (item) => {
    const Icon = item.icon;
    const isActive = activeKeys.has(item.key);

    return (
      <Link
        key={item.key}
        href={item.href}
        className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
        data-testid={`sidebar-link-${item.key}`}
        title={item.label}
        aria-current={isActive ? 'page' : undefined}
        aria-label={item.label}
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

    return (
      <div key={item.key} className={styles.navGroup}>
        <button
          type="button"
          className={`${styles.navGroupTrigger} ${parentActive ? styles.navLinkActive : ''}`}
          onClick={() => handleToggleGroup(item.key)}
          aria-expanded={isExpanded}
          aria-controls={`sidebar-submenu-${item.key}`}
          data-testid={`sidebar-group-${item.key}`}
          title={item.label}
          aria-label={item.label}
        >
          <span className={styles.iconSlot}>
            <Icon />
          </span>
          <span className={styles.linkLabel}>{item.label}</span>
          <FiChevronDown className={`${styles.chevron} ${isExpanded ? styles.chevronOpen : ''}`} />
        </button>
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
      </div>
    );
  };

  return (
    <div className={styles.appShell} data-testid="app-root">
      <aside
        id="moneyflow-sidebar"
        className={`${styles.sidebar} ${isCollapsed ? styles.sidebarCollapsed : ''} ${
          isMobileNavOpen ? styles.sidebarMobileOpen : ''
        }`}
      >
        <div className={styles.brandSection}>
          <Link
            href="/transactions"
            className={styles.brandLink}
            aria-label="Money Flow home"
            data-testid="sidebar-brand"
          >
            <div className={styles.brandAvatar} aria-hidden>
              <span className={styles.brandInitials}>MF</span>
            </div>
            <div className={styles.brandCopy}>
              <span className={styles.brandName}>Money Flow</span>
              <span className={styles.brandTagline}>Cash intelligence hub</span>
            </div>
          </Link>
          <button
            type="button"
            className={styles.collapseTrigger}
            onClick={handleCollapse}
            aria-pressed={isCollapsed}
            data-testid="sidebar-collapse-toggle"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <FiChevronRight /> : <FiChevronLeft />}
          </button>
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

      {isMobileNavOpen ? (
        <div
          className={styles.mobileOverlay}
          role="presentation"
          onClick={handleMobileNavToggle}
          onPointerDown={(event) => {
            if (event.pointerType === 'touch') {
              event.preventDefault();
              handleMobileNavToggle();
            }
          }}
          data-testid="mobile-sidebar-overlay"
        />
      ) : null}

      <div className={styles.mainColumn}>
        <header className={styles.topBar}>
          <button
            type="button"
            className={styles.mobileToggle}
            onClick={handleMobileNavToggle}
            data-testid="mobile-sidebar-toggle"
            aria-expanded={isMobileNavOpen}
            aria-controls="moneyflow-sidebar"
            aria-label="Toggle navigation"
            onPointerDown={(event) => {
              if (event.pointerType === 'touch') {
                event.preventDefault();
                handleMobileNavToggle();
              }
            }}
          >
            {isMobileNavOpen ? <FiX /> : <FiMenu />}
          </button>

          <div className={styles.pageHeading}>
            {title ? (
              <h1 className={styles.pageTitle} data-testid="layout-title">
                {title}
              </h1>
            ) : null}
            {subtitle ? (
              <p className={styles.pageSubtitle} data-testid="layout-subtitle">
                {subtitle}
              </p>
            ) : null}
          </div>
        </header>

        <main className={styles.mainContent} data-testid="layout-main">
          {children}
        </main>
      </div>
    </div>
  );
}
