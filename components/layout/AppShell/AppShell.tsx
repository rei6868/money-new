import { useEffect, useMemo, useRef, useState, type ReactNode, useCallback } from 'react';
import { useRouter } from 'next/router';

import { useAuth } from '../../../context/AuthContext';
import { LayoutNavigationProvider } from '../navigation/LayoutNavigationContext';
import { Sidebar } from '../navigation/Sidebar';
import { TopBar } from '../topbar/TopBar';
import { NAV_ITEMS, SETTINGS_NAV_ITEM, type NavItem } from '../navigation/navConfig';
import styles from './AppShell.module.css';

const THEME_STORAGE_KEY = 'moneyflow-preferred-theme';
const SIDEBAR_STORAGE_KEY = 'moneyflow-sidebar-collapsed';

type ThemeMode = 'light' | 'dark';

type AppShellProps = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
};

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const storedValue = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (storedValue === 'dark' || storedValue === 'light') {
    return storedValue;
  }

  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }

  return 'light';
}

function getInitialSidebarState(): boolean {
  if (typeof window === 'undefined') {
    return true;
  }
  const storedValue = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
  if (storedValue === 'false') {
    return false;
  }
  return true;
}

function isPathActive(pathname: string, href?: string): boolean {
  if (!href) {
    return false;
  }
  if (href === '/') {
    return pathname === '/';
  }
  if (pathname === href) {
    return true;
  }
  return pathname.startsWith(`${href}/`);
}

function collectInitialExpandedGroups(pathname: string, navItems: NavItem[]): string[] {
  return navItems
    .filter((item) => item.children?.some((child) => isPathActive(pathname, child.href)))
    .map((item) => item.key);
}

export default function AppShell({ children }: AppShellProps): JSX.Element {
  const router = useRouter();
  const { logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => getInitialSidebarState());
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());
  const [activeFlyout, setActiveFlyout] = useState<string | null>(null);
  const [flyoutPosition, setFlyoutPosition] = useState<{ top: number }>({ top: 0 });
  const [expandedGroups, setExpandedGroups] = useState<string[]>(() =>
    collectInitialExpandedGroups(router.pathname, NAV_ITEMS),
  );
  const [showTopBar, setShowTopBar] = useState(false);
  const flyoutCloseTimer = useRef<number | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    document.documentElement.dataset.theme = theme;
    document.body.dataset.theme = theme;

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, isCollapsed ? 'true' : 'false');
  }, [isCollapsed]);

  useEffect(() => {
    if (!isCollapsed) {
      setExpandedGroups((prev) => {
        const next = new Set(prev);
        NAV_ITEMS.forEach((item) => {
          if (item.children?.some((child) => isPathActive(router.pathname, child.href))) {
            next.add(item.key);
          }
        });
        return Array.from(next);
      });
    }
  }, [router.pathname, isCollapsed]);

  useEffect(() => {
    setActiveFlyout(null);
  }, [router.pathname]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(max-width: 1024px)');
    const handleChange = (event: MediaQueryListEvent) => {
      setShowTopBar(event.matches);
    };

    setShowTopBar(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    }

    mediaQuery.addListener(handleChange);
    return () => {
      mediaQuery.removeListener(handleChange);
    };
  }, []);

  const activeKeys = useMemo(() => {
    const currentPath = router.pathname;
    return NAV_ITEMS.reduce<Set<string>>((acc, item) => {
      if (item.href && isPathActive(currentPath, item.href)) {
        acc.add(item.key);
      }
      item.children?.forEach((child) => {
        if (isPathActive(currentPath, child.href)) {
          acc.add(child.key);
          acc.add(item.key);
        }
      });
      return acc;
    }, new Set());
  }, [router.pathname]);

  const isSettingsActive = router.pathname.startsWith('/settings');

  const topNavActiveKeys = useMemo(() => {
    const keys = new Set(activeKeys);
    if (isSettingsActive) {
      keys.add(SETTINGS_NAV_ITEM.key);
    }
    return keys;
  }, [activeKeys, isSettingsActive]);

  const toggleGroup = useCallback(
    (groupKey: string) => {
      if (isCollapsed) {
        return;
      }
      setExpandedGroups((prev) =>
        prev.includes(groupKey) ? prev.filter((item) => item !== groupKey) : [...prev, groupKey],
      );
    },
    [isCollapsed],
  );

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsCollapsed((prev) => !prev);
    setActiveFlyout(null);
  }, []);

  const cancelFlyoutClose = useCallback(() => {
    if (flyoutCloseTimer.current) {
      window.clearTimeout(flyoutCloseTimer.current);
      flyoutCloseTimer.current = null;
    }
  }, []);

  const scheduleFlyoutClose = useCallback(() => {
    cancelFlyoutClose();
    flyoutCloseTimer.current = window.setTimeout(() => {
      setActiveFlyout(null);
    }, 150);
  }, [cancelFlyoutClose]);

  const closeFlyout = useCallback(() => {
    cancelFlyoutClose();
    setActiveFlyout(null);
  }, [cancelFlyoutClose]);

  const openFlyout = useCallback(
    (groupKey: string, trigger: HTMLElement) => {
      if (!isCollapsed) {
        return;
      }
      cancelFlyoutClose();
      const rect = trigger.getBoundingClientRect();
      setFlyoutPosition({ top: rect.top });
      setActiveFlyout(groupKey);
    },
    [isCollapsed, cancelFlyoutClose],
  );

  const handleLogout = useCallback(() => {
    logout();
    router.replace('/login');
  }, [logout, router]);

  const contextValue = useMemo(
    () => ({
      navItems: NAV_ITEMS,
      settingsLink: SETTINGS_NAV_ITEM,
      activeKeys,
      topNavActiveKeys,
      theme,
      toggleTheme,
      logout: handleLogout,
      isCollapsed,
      toggleSidebar,
      expandedGroups,
      toggleGroup,
      isSettingsActive,
      activeFlyout,
      flyoutPosition,
      openFlyout,
      scheduleFlyoutClose,
      cancelFlyoutClose,
      closeFlyout,
    }),
    [
      activeKeys,
      topNavActiveKeys,
      theme,
      toggleTheme,
      handleLogout,
      isCollapsed,
      toggleSidebar,
      expandedGroups,
      toggleGroup,
      isSettingsActive,
      activeFlyout,
      flyoutPosition,
      openFlyout,
      scheduleFlyoutClose,
      cancelFlyoutClose,
      closeFlyout,
    ],
  );

  return (
    <LayoutNavigationProvider value={contextValue}>
      <div className={styles.appShell} data-testid="app-root">
        <Sidebar />
        <div className={styles.mainColumn}>
          {showTopBar ? (
            <div className={styles.topBarContainer}>
              <TopBar />
            </div>
          ) : null}
          <main className={styles.mainContent} data-testid="layout-main">
            {children}
          </main>
        </div>
      </div>
    </LayoutNavigationProvider>
  );
}
