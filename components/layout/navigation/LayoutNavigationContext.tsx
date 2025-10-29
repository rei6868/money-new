import { createContext, useContext } from 'react';

import type { NavItem } from './navConfig';

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

export const LayoutNavigationProvider = LayoutNavigationContext.Provider;
