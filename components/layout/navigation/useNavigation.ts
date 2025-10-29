import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export type NavigationLeaf = {
  key: string;
  label: string;
  href: string;
};

export type NavigationNode = NavigationLeaf & {
  children?: NavigationLeaf[];
  // Optional metadata for consumers such as the sidebar where icons are displayed.
  icon?: unknown;
};

export type NavigationSettingsLink = NavigationLeaf | null | undefined;

export type FlattenedNavigationItem = NavigationLeaf;

function arraysMatch(a: string[], b: string[]) {
  if (a === b) {
    return true;
  }
  if (a.length !== b.length) {
    return false;
  }
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) {
      return false;
    }
  }
  return true;
}

export type NavigationContextValue = {
  items: NavigationNode[];
  flattenedItems: FlattenedNavigationItem[];
  activeKeySet: Set<string>;
  overflowKeys: string[];
  overflowKeySet: Set<string>;
  setOverflowKeys: (keys: string[]) => void;
  settingsLink: NavigationLeaf | null;
};

const NavigationContext = createContext<NavigationContextValue | null>(null);

export type NavigationProviderProps = {
  items: NavigationNode[];
  activeKeys?: Set<string>;
  settingsLink?: NavigationSettingsLink;
  children: ReactNode;
};

export function NavigationProvider({
  items,
  activeKeys,
  settingsLink,
  children,
}: NavigationProviderProps) {
  const [overflowKeysState, setOverflowKeysState] = useState<string[]>([]);

  const activeKeyArray = useMemo(() => Array.from(activeKeys ?? []), [activeKeys]);
  const activeKeySet = useMemo(() => new Set(activeKeyArray), [activeKeyArray]);

  const flattenedItems = useMemo<FlattenedNavigationItem[]>(() => {
    const flattened: FlattenedNavigationItem[] = [];

    items.forEach((item) => {
      if (item && item.href) {
        flattened.push({ key: item.key, label: item.label, href: item.href });
      }
      if (Array.isArray(item?.children)) {
        item.children.forEach((child) => {
          if (child && child.href) {
            flattened.push({ key: child.key, label: child.label, href: child.href });
          }
        });
      }
    });

    if (settingsLink?.href) {
      flattened.push({
        key: settingsLink.key,
        label: settingsLink.label,
        href: settingsLink.href,
      });
    }

    return flattened;
  }, [items, settingsLink]);

  const settingsLinkValue = settingsLink?.href ? settingsLink : null;

  useEffect(() => {
    setOverflowKeysState((prev) => {
      if (prev.length === 0) {
        return prev;
      }
      return [];
    });
  }, [flattenedItems]);

  const setOverflowKeys = useCallback((keys: string[]) => {
    setOverflowKeysState((prev) => {
      if (arraysMatch(prev, keys)) {
        return prev;
      }
      return keys;
    });
  }, []);

  const overflowKeySet = useMemo(() => new Set(overflowKeysState), [overflowKeysState]);

  const value = useMemo<NavigationContextValue>(
    () => ({
      items,
      flattenedItems,
      activeKeySet,
      overflowKeys: overflowKeysState,
      overflowKeySet,
      setOverflowKeys,
      settingsLink: settingsLinkValue,
    }),
    [
      items,
      flattenedItems,
      activeKeySet,
      overflowKeysState,
      overflowKeySet,
      setOverflowKeys,
      settingsLinkValue,
    ],
  );

  return createElement(NavigationContext.Provider, { value }, children);
}

export function useNavigation(): NavigationContextValue {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}
