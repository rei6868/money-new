'use client';

import { createContext, useContext, useState, useCallback, useMemo, useEffect, ReactNode, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../../context/AuthContext';

import type { NavItem } from './navConfig';
import { NAV_ITEMS, SETTINGS_NAV_ITEM } from './navConfig';

export type ThemeMode = 'light' | 'dark';

export interface LayoutNavigationContextValue {
  navItems: NavItem[];
  settingsLink: NavItem;
  activeKeys: Set<string>;
  topNavActiveKeys: Set<string>;
  theme: ThemeMode;
  toggleTheme: () => void;
  logout: () => void;
  isCollapsed: boolean;
  toggleSidebar: () => void;
  expandedGroups: string[];
  toggleGroup: (groupKey: string) => void;
  isSettingsActive: boolean;
  activeFlyout: string | null;
  flyoutPosition: { top: number };
  openFlyout: (groupKey: string, trigger: HTMLElement) => void;
  scheduleFlyoutClose: () => void;
  cancelFlyoutClose: () => void;
  closeFlyout: () => void;
}

const LayoutNavigationContext = createContext<LayoutNavigationContextValue | undefined>(
  undefined,
);

export function useLayoutNavigation(): LayoutNavigationContextValue {
  const context = useContext(LayoutNavigationContext);
  if (!context) {
    throw new Error('useLayoutNavigation must be used within a LayoutNavigationProvider');
  }
  return context;
}

interface LayoutNavigationProviderProps {
  children: ReactNode;
}

export function LayoutNavigationProvider({ children }: LayoutNavigationProviderProps) {
  const router = useRouter();
  const { logout: authLogout } = useAuth();
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [activeFlyout, setActiveFlyout] = useState<string | null>(null);
  const [flyoutPosition, setFlyoutPosition] = useState<{ top: number }>({ top: 0 });
  const flyoutCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('mf-theme') as ThemeMode | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  // Apply theme to document
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('mf-theme', theme);
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  const toggleGroup = useCallback((groupKey: string) => {
    setExpandedGroups((prev) =>
      prev.includes(groupKey) ? prev.filter((k) => k !== groupKey) : [...prev, groupKey]
    );
  }, []);

  const openFlyout = useCallback((groupKey: string, trigger: HTMLElement) => {
    setActiveFlyout(groupKey);
    const rect = trigger.getBoundingClientRect();
    setFlyoutPosition({ top: rect.top });
  }, []);

  const scheduleFlyoutClose = useCallback(() => {
    flyoutCloseTimeoutRef.current = setTimeout(() => {
      setActiveFlyout(null);
    }, 300);
  }, []);

  const cancelFlyoutClose = useCallback(() => {
    if (flyoutCloseTimeoutRef.current) {
      clearTimeout(flyoutCloseTimeoutRef.current);
      flyoutCloseTimeoutRef.current = null;
    }
  }, []);

  const closeFlyout = useCallback(() => {
    setActiveFlyout(null);
  }, []);

  const logout = useCallback(() => {
    authLogout();
    router.push('/login');
  }, [authLogout, router]);

  // Determine active keys based on current route
  const activeKeys = useMemo(() => {
    const keys = new Set<string>();
    const pathname = router.pathname;

    NAV_ITEMS.forEach((item) => {
      if (item.href === pathname) {
        keys.add(item.key);
      }
      item.children?.forEach((child) => {
        if (child.href === pathname) {
          keys.add(item.key);
          keys.add(child.key);
        }
      });
    });

    if (SETTINGS_NAV_ITEM.href === pathname) {
      keys.add(SETTINGS_NAV_ITEM.key);
    }

    return keys;
  }, [router.pathname]);

  const topNavActiveKeys = activeKeys;
  const isSettingsActive = activeKeys.has(SETTINGS_NAV_ITEM.key);

  const value: LayoutNavigationContextValue = {
    navItems: NAV_ITEMS,
    settingsLink: SETTINGS_NAV_ITEM,
    activeKeys,
    topNavActiveKeys,
    theme,
    toggleTheme,
    logout,
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
  };

  return (
    <LayoutNavigationContext.Provider value={value}>
      {children}
    </LayoutNavigationContext.Provider>
  );
}
