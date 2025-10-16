import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import {
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiCreditCard,
  FiFileText,
  FiGift,
  FiMoon,
  FiLogOut,
  FiPieChart,
  FiRepeat,
  FiSettings,
  FiSun,
  FiTrendingDown,
  FiUsers,
} from 'react-icons/fi';

import { useAuth } from '../context/AuthContext';

import styles from './Sidebar.module.css';

const navigationSections = [
  {
    key: 'core',
    title: 'Core',
    items: [
      { key: 'overview', label: 'Overview', href: '/overview', icon: FiPieChart },
      { key: 'accounts', label: 'Accounts', href: '/accounts', icon: FiCreditCard },
      { key: 'people', label: 'People', href: '/people', icon: FiUsers },
      { key: 'transactions', label: 'Transactions', href: '/transactions', icon: FiRepeat },
      {
        key: 'cashback',
        label: 'Cashback',
        icon: FiGift,
        children: [
          { key: 'cashback-ledger', label: 'Ledger', href: '/cashback/ledger' },
          { key: 'cashback-summary', label: 'Summary', href: '/cashback/summary' },
        ],
      },
      { key: 'debt', label: 'Debt', href: '/debt', icon: FiTrendingDown },
      { key: 'reports', label: 'Reports', href: '/reports', icon: FiFileText },
    ],
  },
  {
    key: 'workspace',
    title: 'Workspace',
    items: [{ key: 'settings', label: 'Settings', href: '/settings', icon: FiSettings }],
  },
];

const PROFILE = {
  initials: 'SR',
  name: 'Samsad Rashid',
  email: 'samsad.rashid@example.com',
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
  const [openSubmenus, setOpenSubmenus] = useState(() => []);

  const ensureActiveParents = useCallback(() => {
    const activeParents = navigationSections
      .flatMap((section) => section.items)
      .filter((item) =>
        Array.isArray(item.children)
          ? item.children.some((child) => router.pathname.startsWith(child.href))
          : false,
      )
      .map((item) => item.key);

    setOpenSubmenus((previous) => {
      const merged = Array.from(new Set([...previous, ...activeParents]));
      if (merged.length === previous.length && merged.every((key, index) => previous[index] === key)) {
        return previous;
      }
      return merged;
    });
  }, [router.pathname]);

  useEffect(() => {
    ensureActiveParents();
  }, [ensureActiveParents]);

  const computedClassName = [
    styles.sidebar,
    collapsed ? styles.collapsed : '',
    mobileOpen ? styles.mobileOpen : '',
  ]
    .filter(Boolean)
    .join(' ');

  const isActive = (href) => {
    if (href === '/') {
      return router.pathname === '/';
    }
    return router.pathname.startsWith(href);
  };

  const handleNavigate = () => {
    if (mobileOpen) {
      onMobileClose();
    }
  };

  const handleLogout = () => {
    logout();
    if (mobileOpen) {
      onMobileClose();
    }
    router.push('/login');
  };

  const toggleSubmenu = (key) => {
    setOpenSubmenus((previous) => {
      if (previous.includes(key)) {
        return previous.filter((entry) => entry !== key);
      }
      return [...previous, key];
    });
  };

  const renderNavItem = (item) => {
    const Icon = item.icon;
    if (Array.isArray(item.children) && item.children.length > 0) {
      const isOpen = openSubmenus.includes(item.key);
      const isParentActive = item.children.some((child) => isActive(child.href));
      return (
        <li key={item.key} className={`${styles.navItem} ${styles.hasChildren}`}>
          <button
            type="button"
            className={`${styles.navLink} ${styles.navButton} ${isParentActive ? styles.active : ''}`}
            data-testid={`sidebar-item-${item.key}`}
            onClick={() => toggleSubmenu(item.key)}
            aria-label={`${item.label} navigation`}
            aria-expanded={isOpen}
          >
            <span className={styles.linkIcon} aria-hidden="true">
              <Icon size={18} />
            </span>
            <span className={styles.linkLabel}>{item.label}</span>
            <span className={`${styles.caret} ${isOpen ? styles.caretOpen : ''}`} aria-hidden="true">
              <FiChevronDown size={16} />
            </span>
          </button>
          <ul className={styles.subNavList} data-open={isOpen} aria-label={`${item.label} submenu`}>
            {item.children.map((child) => (
              <li key={child.key} className={styles.subNavItem}>
                <Link
                  href={child.href}
                  className={`${styles.subNavLink} ${isActive(child.href) ? styles.active : ''}`}
                  data-testid={`sidebar-item-${child.key}`}
                  onClick={handleNavigate}
                  aria-label={child.label}
                >
                  <span className={styles.bullet} aria-hidden="true" />
                  <span className={styles.linkLabel}>{child.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </li>
      );
    }

    return (
      <li key={item.key} className={styles.navItem}>
        <Link
          href={item.href}
          className={`${styles.navLink} ${isActive(item.href) ? styles.active : ''}`}
          data-testid={`sidebar-item-${item.key}`}
          onClick={handleNavigate}
          aria-label={item.label}
        >
          <span className={styles.linkIcon} aria-hidden="true">
            <Icon size={18} />
          </span>
          <span className={styles.linkLabel}>{item.label}</span>
        </Link>
      </li>
    );
  };

  const isDarkMode = theme === 'dark';

  return (
    <aside
      className={computedClassName}
      id="sidebar-navigation"
      data-testid="sidebar"
      data-theme={theme}
    >
      <div className={styles.logoRow}>
        <Link
          href="/"
          className={styles.brand}
          aria-label="Navigate to dashboard"
          onClick={handleNavigate}
        >
          <span className={styles.brandMark} aria-hidden="true">
            AH
          </span>
          <span className={styles.brandCopy} data-collapsed={collapsed}>
            <span className={styles.brandName}>AHLFAGON</span>
            <span className={styles.brandSubtitle}>Control Panel</span>
          </span>
        </Link>
        <button
          type="button"
          className={styles.collapseButton}
          onClick={onCollapseToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          data-testid="sidebar-collapse-button"
        >
          {collapsed ? <FiChevronRight size={18} /> : <FiChevronLeft size={18} />}
        </button>
      </div>

      {navigationSections.map((section) => (
        <nav
          key={section.key}
          className={styles.section}
          aria-label={`${section.title} menu`}
          data-testid={`sidebar-section-${section.key}`}
        >
          <p className={styles.sectionTitle} data-collapsed={collapsed}>
            {section.title}
          </p>
          <ul className={styles.navList}>{section.items.map(renderNavItem)}</ul>
        </nav>
      ))}

      <button
        type="button"
        className={styles.logoutControl}
        onClick={handleLogout}
        data-testid="sidebar-logout"
        aria-label="Log out"
      >
        <span className={styles.linkIcon} aria-hidden="true">
          <FiLogOut size={18} />
        </span>
        <span className={styles.linkLabel}>Log Out</span>
      </button>

      <div className={styles.profileCard} data-testid="sidebar-profile">
        <div className={styles.profileAvatar} aria-hidden="true">
          <span>{PROFILE.initials}</span>
        </div>
        <div className={styles.profileDetails} data-collapsed={collapsed}>
          <p className={styles.profileName}>{PROFILE.name}</p>
          <p className={styles.profileEmail}>{PROFILE.email}</p>
        </div>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={isDarkMode}
        className={styles.themeControl}
        onClick={onThemeToggle}
        data-testid="sidebar-theme-toggle"
        aria-label="Toggle dark mode"
      >
        <span className={styles.themeIcon} aria-hidden="true">
          {isDarkMode ? <FiMoon size={18} /> : <FiSun size={18} />}
        </span>
        <span className={styles.themeLabel}>{isDarkMode ? 'Dark Mode' : 'Light Mode'}</span>
        <span className={styles.themeSwitch} data-active={isDarkMode} aria-hidden="true">
          <span className={styles.themeThumb} />
        </span>
      </button>
    </aside>
  );
}
