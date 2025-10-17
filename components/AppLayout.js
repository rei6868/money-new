import styles from './AppLayout.module.css';

export default function AppLayout({ title, subtitle, children }) {
  return (
    <div className={styles.layout} data-testid="app-root">
      <header className={styles.topBar}>
        <div className={styles.pageHeading}>
          {title ? <h1 className={styles.pageTitle}>{title}</h1> : null}
          {subtitle ? <p className={styles.pageSubtitle}>{subtitle}</p> : null}
        </div>
      </header>
      <main className={styles.mainContent} data-testid="layout-main">
        {children}
      </main>
    </div>
  );
}
