import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiCreditCard,
  FiLogOut,
  FiMoon,
  FiPercent,
  FiSun,
  FiTrendingDown,
  FiUsers,
} from 'react-icons/fi';

import { useAuth } from '../context/AuthContext';

import styles from './Sidebar.module.css';

const navigationItems = [
  { key: 'accounts', label: 'Accounts', href: '/accounts', icon: FiCreditCard },
  { key: 'people', label: 'People', href: '/people', icon: FiUsers },
  { key: 'debt', label: 'Debt', href: '/debt', icon: FiTrendingDown },
  {
    key: 'cashback',
    label: 'Cashback',
    icon: FiPercent,
    children: [
      { key: 'cashback-ledger', label: 'Cashback Ledger', href: '/cashback/ledger' },
      { key: 'cashback-summary', label: 'Cashback Summary', href: '/cashback/summary' },
    ],
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
  const [openGroups, setOpenGroups] = useState({ cashback: true });

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

  const isGroupActive = (item) =>
    Array.isArray(item.children) && item.children.some((child) => isActive(child.href));

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

  const toggleGroup = (key) => {
    setOpenGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const renderNavLink = (item) => {
    const Icon = item.icon;

    if (item.children) {
      const open = openGroups[item.key] ?? isGroupActive(item);
      const active = isGroupActive(item);

      return (
        <li key={item.key} className={`${styles.navItem} ${styles.navGroup}`}>
          <button
            type="button"
            className={`${styles.navLink} ${active ? styles.active : ''}`}
            onClick={() => toggleGroup(item.key)}
            data-testid={`sidebar-item-${item.key}`}
            aria-expanded={open}
            aria-controls={`sidebar-group-${item.key}`}
          >
            <span className={styles.linkIcon} aria-hidden="true">
              <Icon size={18} />
            </span>
            <span className={styles.linkLabel}>{item.label}</span>
            <span className={styles.groupCaret} data-open={open} aria-hidden="true">
              <FiChevronDown size={16} />
            </span>
          </button>
          <ul
            id={`sidebar-group-${item.key}`}
            className={styles.childList}
            data-open={open}
            data-collapsed={collapsed}
          >
            {item.children.map((child) => {
              const childActive = isActive(child.href);
              return (
                <li key={child.key} className={styles.childItem}>
                  <Link
                    href={child.href}
                    className={`${styles.childLink} ${childActive ? styles.childActive : ''}`}
                    data-testid={`sidebar-item-${child.key}`}
                    onClick={handleNavigate}
                  >
                    <span className={styles.childBullet} aria-hidden="true" />
                    <span className={styles.childLabel}>{child.label}</span>
                  </Link>
                </li>
              );
            })}
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

      <nav className={styles.section} aria-label="Primary menu" data-testid="sidebar-section-primary">
        <p className={styles.sectionTitle} data-collapsed={collapsed}>
          Navigation
        </p>
        <ul className={styles.navList}>{navigationItems.map(renderNavLink)}</ul>
      </nav>

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
