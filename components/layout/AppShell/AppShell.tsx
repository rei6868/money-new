'use client';

import { Sidebar } from '../navigation/Sidebar';
import { TopBar } from '../topbar/TopBar';
import { LayoutNavigationProvider } from '../navigation/LayoutNavigationContext';
import styles from './AppShell.module.css';

type AppShellProps = {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
};

export default function AppShell({ children }: AppShellProps) {
  return (
    <LayoutNavigationProvider>
      <div className={styles.appShell}>
        <Sidebar />
        <div className={styles.mainColumn}>
          <div className={styles.topBarContainer}>
            <TopBar />
          </div>
          <div className={styles.mainContent}>
            {children}
          </div>
        </div>
      </div>
    </LayoutNavigationProvider>
  );
}
