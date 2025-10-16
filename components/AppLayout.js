import { useState } from 'react';
import { FiMenu } from 'react-icons/fi';

import Sidebar from './Sidebar';
import styles from './AppLayout.module.css';

export default function AppLayout({ title, subtitle, children }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleCollapsed = () => setIsCollapsed((previous) => !previous);
  const toggleMobile = () => setIsMobileOpen((previous) => !previous);
  const closeMobile = () => setIsMobileOpen(false);

  return (
    <div className={styles.layout} data-collapsed={isCollapsed}>
      <Sidebar
        collapsed={isCollapsed}
        onCollapseToggle={toggleCollapsed}
        mobileOpen={isMobileOpen}
        onMobileClose={closeMobile}
      />
      <div className={styles.contentArea}>
        <header className={styles.topBar}>
          <button
            type="button"
            className={styles.menuButton}
            onClick={toggleMobile}
            aria-label="Toggle navigation menu"
          >
            <FiMenu size={20} />
          </button>
          <div className={styles.pageHeading}>
            {title ? <h1 className={styles.pageTitle}>{title}</h1> : null}
            {subtitle ? <p className={styles.pageSubtitle}>{subtitle}</p> : null}
          </div>
        </header>
        <main className={styles.mainContent}>{children}</main>
      </div>
      {isMobileOpen && <div className={styles.backdrop} onClick={closeMobile} aria-hidden="true" />}
    </div>
  );
}
