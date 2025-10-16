import { useEffect, useState } from 'react';
import { FiMenu } from 'react-icons/fi';

import Sidebar from './Sidebar';
import styles from './AppLayout.module.css';

const THEME_STORAGE_KEY = 'finapp-theme';

export default function AppLayout({ title, subtitle, children }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === 'light' || storedTheme === 'dark') {
      setTheme(storedTheme);
      return;
    }

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(prefersDark ? 'dark' : 'light');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(THEME_STORAGE_KEY, theme);

    if (typeof document !== 'undefined') {
      document.documentElement.dataset.appearance = theme;
      document.body.dataset.theme = theme;
    }
  }, [theme]);

  const toggleCollapsed = () => setIsCollapsed((previous) => !previous);
  const toggleMobile = () => setIsMobileOpen((previous) => !previous);
  const closeMobile = () => setIsMobileOpen(false);
  const toggleTheme = () => setTheme((current) => (current === 'dark' ? 'light' : 'dark'));

  return (
    <div
      className={styles.layout}
      data-collapsed={isCollapsed}
      data-theme={theme}
      data-testid="app-root"
    >
      <Sidebar
        collapsed={isCollapsed}
        onCollapseToggle={toggleCollapsed}
        mobileOpen={isMobileOpen}
        onMobileClose={closeMobile}
        theme={theme}
        onThemeToggle={toggleTheme}
      />
      <div className={styles.contentArea} data-testid="layout-content">
        <header className={styles.topBar}>
          <button
            type="button"
            className={styles.menuButton}
            onClick={toggleMobile}
            aria-label="Toggle navigation menu"
            aria-controls="sidebar-navigation"
            aria-expanded={isMobileOpen}
            data-testid="sidebar-toggle"
          >
            <FiMenu size={20} />
          </button>
          <div className={styles.pageHeading}>
            {title ? <h1 className={styles.pageTitle}>{title}</h1> : null}
            {subtitle ? <p className={styles.pageSubtitle}>{subtitle}</p> : null}
          </div>
        </header>
        <main className={styles.mainContent} data-testid="layout-main">
          {children}
        </main>
      </div>
      {isMobileOpen ? (
        <div
          className={styles.backdrop}
          onClick={closeMobile}
          aria-hidden="true"
          data-testid="sidebar-backdrop"
        />
      ) : null}
    </div>
  );
}
