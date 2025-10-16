import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  FiArchive,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiFileText,
  FiGrid,
  FiLayers,
  FiLogOut,
  FiMapPin,
  FiMoon,
  FiPackage,
  FiPieChart,
  FiSettings,
  FiShoppingBag,
  FiSun,
  FiUsers,
} from 'react-icons/fi';

import { useAuth } from '../context/AuthContext';

import styles from './Sidebar.module.css';

const primaryNavigation = [
  { key: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: FiGrid },
  { key: 'overview', label: 'Overview', href: '/overview', icon: FiPieChart },
  { key: 'geo', label: 'Geo Information', href: '/geo-information', icon: FiMapPin },
  { key: 'hub', label: 'Hub', href: '/hub', icon: FiLayers },
  { key: 'users', label: 'Users', href: '/users', icon: FiUsers },
  { key: 'product', label: 'Product', href: '/product', icon: FiPackage },
  { key: 'orders', label: 'Order List', href: '/orders', icon: FiShoppingBag },
  { key: 'inventory', label: 'Inventory', href: '/inventory', icon: FiArchive },
  { key: 'invoice', label: 'Invoice', href: '/invoice', icon: FiFileText },
];

const supportingNavigation = [
  { key: 'attendance', label: 'Attendance', href: '/attendance', icon: FiCalendar },
  { key: 'settings', label: 'Settings', href: '/settings', icon: FiSettings },
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

  const renderNavLink = (item) => {
    const Icon = item.icon;
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
          Menu
        </p>
        <ul className={styles.navList}>{primaryNavigation.map(renderNavLink)}</ul>
      </nav>

      <div className={styles.sectionDivider} aria-hidden="true" />

      <nav
        className={styles.section}
        aria-label="Secondary menu"
        data-testid="sidebar-section-secondary"
      >
        <p className={styles.sectionTitle} data-collapsed={collapsed}>
          General
        </p>
        <ul className={styles.navList}>{supportingNavigation.map(renderNavLink)}</ul>
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
