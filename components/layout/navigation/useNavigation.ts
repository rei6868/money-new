import { useEffect, useMemo } from 'react';

import { useLayoutNavigation } from './LayoutNavigationContext';
import { useOverflowNavigation } from './useOverflowNavigation';

export interface NavigationLink {
  key: string;
  label: string;
  href: string;
}

export function useNavigation() {
  const { navItems, settingsLink, topNavActiveKeys, theme } = useLayoutNavigation();

  const items = useMemo<NavigationLink[]>(() => {
    const flattened: NavigationLink[] = [];

    navItems.forEach((item) => {
      if (item?.href) {
        flattened.push({ key: item.key, label: item.label, href: item.href });
      }

      item?.children?.forEach((child) => {
        if (child?.href) {
          flattened.push({ key: child.key, label: child.label, href: child.href });
        }
      });
    });

    if (settingsLink?.href) {
      flattened.push({
        key: settingsLink.key,
        label: settingsLink.label,
        href: settingsLink.href,
      });
    }

    return flattened;
  }, [navItems, settingsLink]);

  const activeKeys = useMemo(() => new Set(topNavActiveKeys), [topNavActiveKeys]);

  const { recalculateOverflow, ...overflow } = useOverflowNavigation(items);

  useEffect(() => {
    recalculateOverflow();
  }, [recalculateOverflow, theme]);

  return {
    items,
    activeKeys,
    settingsLink,
    recalculateOverflow,
    ...overflow,
  };
}
