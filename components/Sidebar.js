import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo } from 'react';
import {
  FiChevronLeft,
  FiChevronRight,
  FiCreditCard,
  FiFileText,
  FiGift,
  FiLogOut,
  FiPieChart,
  FiRepeat,
  FiSettings,
  FiSun,
  FiMoon,
  FiTrendingDown,
  FiUsers,
} from 'react-icons/fi';

import { useAuth } from '../context/AuthContext';

import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { key: 'overview', label: 'Overview', href: '/overview', icon: FiPieChart },
  { key: 'accounts', label: 'Accounts', href: '/accounts', icon: FiCreditCard },
  { key: 'people', label: 'People', href: '/people', icon: FiUsers },
  {
    key: 'transactions-history',
    label: 'Transactions History',
    href: '/transactions-history',
    icon: FiRepeat,
  },
  { key: 'cashback-ledger', label: 'Cashback Ledger', href: '/cashback/ledger', icon: FiGift },
  { key: 'cashback-summary', label: 'Cashback Summary', href: '/cashback/summary', icon: FiGift },
  { key: 'debt', label: 'Debt', href: '/debt', icon: FiTrendingDown },
  { key: 'reports', label: 'Reports', href: '/reports', icon: FiFileText },
  { key: 'settings', label: 'Settings', href: '/settings', icon: FiSettings },
];

const isRouteActive = (pathname, href) => {
  if (href === '/') {
    return pathname === '/';
  }
  if (href === '/transactions' && pathname === '/') {
    return true;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
};

export default function Sidebar({
  collapsed,
  onCollapseToggle,
  mobileOpen,
  onMobileClose,
  theme,
  onThemeToggle,
}) {
  const router = useRouter();
  const { logout } = useAuth();

  useEffect(() => {
    if (!mobileOpen) {
      return undefined;
    }

    const handleRouteChange = () => {
      onMobileClose();
    };

    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [mobileOpen, onMobileClose, router]);

  const activeKey = useMemo(() => {
    return NAV_ITEMS.find((item) => isRouteActive(router.pathname, item.href))?.key ?? null;
  }, [router.pathname]);

  const containerClassName = [
    styles.sidebar,
    collapsed ? styles.collapsed : '',
    mobileOpen ? styles.mobileOpen : '',
  ]
    .filter(Boolean)
    .join(' ');

  const handleLogout = () => {
    logout();
    if (mobileOpen) {
      onMobileClose();
    }
    router.push('/login');
  };

  const handleThemeToggle = () => {
    onThemeToggle();
    if (mobileOpen) {
      onMobileClose();
    }
  };

  const handleNavigate = () => {
    if (mobileOpen) {
      onMobileClose();
    }
  };

  const isDarkMode = theme === 'dark';

  return (
    <aside className={containerClassName} id="sidebar-navigation" data-testid="sidebar" data-theme={theme}>
      <div className={styles.header}>
        <span className={styles.menuLabel} data-collapsed={collapsed}>
          Menu
        </span>
        <button
          type="button"
          className={styles.collapseToggle}
          onClick={onCollapseToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          data-testid="sidebar-collapse-button"
        >
          {collapsed ? <FiChevronRight size={18} /> : <FiChevronLeft size={18} />}
        </button>
      </div>

      <nav className={styles.navigation} aria-label="Primary menu">
        <ul className={styles.navList}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeKey === item.key;
            return (
              <li key={item.key} className={styles.navItem}>
                <Link
                  href={item.href}
                  className={`${styles.navLink} ${isActive ? styles.active : ''}`}
                  data-testid={`sidebar-item-${item.key}`}
                  onClick={handleNavigate}
                  aria-label={item.label}
                >
                  <span className={styles.iconWrap} aria-hidden="true">
                    <Icon size={18} />
                  </span>
                  <span className={styles.linkLabel}>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className={styles.utilitySection}>
        <button
          type="button"
          role="switch"
          aria-checked={isDarkMode}
          className={styles.utilityButton}
          onClick={handleThemeToggle}
          data-testid="sidebar-theme-toggle"
          aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <span className={styles.iconWrap} aria-hidden="true">
            {isDarkMode ? <FiMoon size={18} /> : <FiSun size={18} />}
          </span>
          <span className={styles.linkLabel}>{isDarkMode ? 'Dark Mode' : 'Light Mode'}</span>
        </button>

        <button
          type="button"
          className={`${styles.utilityButton} ${styles.logout}`}
          onClick={handleLogout}
          data-testid="sidebar-logout"
          aria-label="Log out"
        >
          <span className={styles.iconWrap} aria-hidden="true">
            <FiLogOut size={18} />
          </span>
          <span className={styles.linkLabel}>Log Out</span>
        </button>
      </div>
    </aside>
  );
}
