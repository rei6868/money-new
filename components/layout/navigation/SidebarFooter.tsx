import Link from 'next/link';
import { FiLogOut, FiMoon, FiSun } from 'react-icons/fi';

import { useLayoutNavigation } from './LayoutNavigationContext';
import styles from '../AppShell/AppShell.module.css';

export function SidebarFooter(): JSX.Element {
  const { theme, toggleTheme, logout, isSettingsActive, settingsLink } = useLayoutNavigation();
  const SettingsIcon = settingsLink.icon;

  return (
    <div className={styles.sidebarFooter}>
      <Link
        href={settingsLink.href ?? '#'}
        className={`${styles.navLink} ${isSettingsActive ? styles.navLinkActive : ''}`}
        data-testid="sidebar-link-settings"
        title={settingsLink.label}
        aria-label={settingsLink.label}
        aria-current={isSettingsActive ? 'page' : undefined}
      >
        <span className={styles.iconSlot}>{SettingsIcon ? <SettingsIcon /> : null}</span>
        <span className={styles.linkLabel}>{settingsLink.label}</span>
      </Link>

      <button
        type="button"
        className={styles.navLink}
        onClick={toggleTheme}
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
        onClick={logout}
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
  );
}
