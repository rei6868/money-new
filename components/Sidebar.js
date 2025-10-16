import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  FiBarChart2,
  FiChevronLeft,
  FiChevronRight,
  FiCreditCard,
  FiGrid,
  FiRepeat,
  FiSettings,
} from 'react-icons/fi';

import { useAuth } from '../context/AuthContext';

import styles from './Sidebar.module.css';

const primaryMenu = [
  { key: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: <FiGrid size={18} /> },
  { key: 'transactions', label: 'Transactions', href: '/', icon: <FiRepeat size={18} /> },
  { key: 'accounts', label: 'Accounts', href: '/accounts', icon: <FiCreditCard size={18} /> },
];

const secondaryMenu = [
  { key: 'reports', label: 'Reports', href: '/reports', icon: <FiBarChart2 size={18} /> },
  { key: 'settings', label: 'Settings', href: '/settings', icon: <FiSettings size={18} /> },
];

export default function Sidebar({ collapsed, onCollapseToggle, mobileOpen, onMobileClose }) {
  const router = useRouter();
  const { logout } = useAuth();

  const className = [
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

  const handleLogout = () => {
    logout();
    onMobileClose();
    router.push('/login');
  };

  const handleNavigate = () => {
    if (mobileOpen) {
      onMobileClose();
    }
  };

  return (
    <aside className={className} id="sidebar-navigation" data-testid="sidebar">
      <div className={styles.brandRow}>
        <div className={styles.brandIdentity}>
          <div className={styles.brandAvatar}>MM</div>
          {!collapsed && <span className={styles.brandName}>MoneyMap</span>}
        </div>
        <button
          type="button"
          className={styles.collapseButton}
          onClick={onCollapseToggle}
          aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          aria-expanded={!collapsed}
          data-testid="sidebar-collapse-button"
        >
          {collapsed ? <FiChevronRight size={18} /> : <FiChevronLeft size={18} />}
        </button>
      </div>

      <nav className={styles.section} aria-label="Main navigation">
        {!collapsed && <p className={styles.sectionTitle}>Menu</p>}
        <ul className={styles.menuList}>
          {primaryMenu.map((item) => (
            <li key={item.key} className={styles.menuItem}>
              <Link
                href={item.href}
                className={`${styles.menuLink} ${isActive(item.href) ? styles.active : ''}`}
                data-testid={`sidebar-link-${item.key}`}
                onClick={handleNavigate}
              >
                <span className={styles.iconWrapper}>{item.icon}</span>
                <span className={styles.label}>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <nav className={styles.section} aria-label="Secondary navigation">
        {!collapsed && <p className={styles.sectionTitle}>More</p>}
        <ul className={styles.menuList}>
          {secondaryMenu.map((item) => (
            <li key={item.key} className={styles.menuItem}>
              <Link
                href={item.href}
                className={`${styles.menuLink} ${isActive(item.href) ? styles.active : ''}`}
                data-testid={`sidebar-link-${item.key}`}
                onClick={handleNavigate}
              >
                <span className={styles.iconWrapper}>{item.icon}</span>
                <span className={styles.label}>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className={styles.footerCard} data-testid="sidebar-footer">
        {!collapsed && (
          <>
            <p className={styles.footerTitle}>Need an upgrade?</p>
            <p className={styles.footerMessage}>Premium analytics and automations coming soon.</p>
          </>
        )}
        <button
          type="button"
          className={styles.logoutButton}
          onClick={handleLogout}
          data-testid="sidebar-logout-button"
        >
          Log out
        </button>
      </div>
    </aside>
  );
}
