import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { FiChevronDown, FiLogOut, FiMoon, FiMoreHorizontal, FiSun } from 'react-icons/fi';

import { useLayoutNavigation } from './LayoutNavigationContext';
import styles from './TopNavBar.module.css';

const MORE_TRIGGER_RESERVE = 64;

function normalizeActiveKeys(activeKeys: Set<string> | string[] | string | undefined): Set<string> {
  if (!activeKeys) {
    return new Set();
  }
  if (activeKeys instanceof Set) {
    return activeKeys;
  }
  if (Array.isArray(activeKeys)) {
    return new Set(activeKeys);
  }
  return new Set([activeKeys]);
}

export function TopNavBar(): JSX.Element | null {
  const { navItems, topNavActiveKeys, toggleTheme, logout, theme, settingsLink } =
    useLayoutNavigation();

  const activeSet = useMemo(() => normalizeActiveKeys(topNavActiveKeys), [topNavActiveKeys]);
  const [overflowKeys, setOverflowKeys] = useState<string[]>([]);
  const [dropdownMode, setDropdownMode] = useState<'overflow' | 'mobile' | null>(null);
  const listContainerRef = useRef<HTMLDivElement | null>(null);
  const moreButtonRef = useRef<HTMLButtonElement | null>(null);
  const overflowDropdownRef = useRef<HTMLDivElement | null>(null);
  const mobileDropdownRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Map<string, HTMLAnchorElement | null>>(new Map());
  const itemWidthMapRef = useRef<Map<string, number>>(new Map());

  const flattenedNavItems = useMemo(() => {
    const flattened: { key: string; label: string; href: string }[] = [];
    navItems.forEach((item) => {
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
  }, [navItems, settingsLink]);

  const setItemRef = useCallback((key: string, node: HTMLAnchorElement | null) => {
    if (!itemRefs.current) {
      itemRefs.current = new Map();
    }
    if (node) {
      itemRefs.current.set(key, node);
    } else {
      itemRefs.current.delete(key);
    }
  }, []);

  const measureItemWidths = useCallback(() => {
    const nextMap = new Map(itemWidthMapRef.current);
    flattenedNavItems.forEach((item) => {
      const node = itemRefs.current.get(item.key);
      if (node) {
        const rect = node.getBoundingClientRect();
        if (rect.width > 0) {
          nextMap.set(item.key, rect.width);
        }
      }
    });
    itemWidthMapRef.current = nextMap;
  }, [flattenedNavItems]);

  const recalculateOverflow = useCallback(() => {
    const container = listContainerRef.current;
    if (!container) {
      return;
    }

    measureItemWidths();

    const availableWidth = container.offsetWidth;
    const moreWidth = moreButtonRef.current?.offsetWidth || MORE_TRIGGER_RESERVE;
    const itemWidths = flattenedNavItems.map((item) => itemWidthMapRef.current.get(item.key) || 0);

    let visibleCount = itemWidths.length;
    let runningWidth = itemWidths.reduce((sum, value) => sum + value, 0);

    if (runningWidth <= availableWidth) {
      if (overflowKeys.length !== 0) {
        setOverflowKeys([]);
        if (dropdownMode === 'overflow') {
          setDropdownMode(null);
        }
      }
      return;
    }

    while (visibleCount > 0 && runningWidth + moreWidth > availableWidth) {
      visibleCount -= 1;
      runningWidth -= itemWidths[visibleCount] ?? 0;
    }

    const nextOverflow = flattenedNavItems.slice(visibleCount).map((item) => item.key);
    setOverflowKeys(nextOverflow);
    if (nextOverflow.length === 0 && dropdownMode === 'overflow') {
      setDropdownMode(null);
    }
  }, [flattenedNavItems, measureItemWidths, overflowKeys.length, dropdownMode]);

  useEffect(() => {
    recalculateOverflow();
  }, [recalculateOverflow, theme]);

  const overflowKeySet = useMemo(() => new Set(overflowKeys), [overflowKeys]);
  const isDropdownOpen = dropdownMode !== null;
  const isOverflowDropdown = dropdownMode === 'overflow';
  const isMobileDropdown = dropdownMode === 'mobile';

  useEffect(() => {
    const container = listContainerRef.current;
    if (!container) {
      return undefined;
    }

    const observer = new ResizeObserver(() => {
      recalculateOverflow();
    });
    observer.observe(container);
    window.addEventListener('resize', recalculateOverflow);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', recalculateOverflow);
    };
  }, [recalculateOverflow]);

  useEffect(() => {
    if (!isDropdownOpen) {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const overflowNode = overflowDropdownRef.current;
      const mobileNode = mobileDropdownRef.current;
      const activeNode = dropdownMode === 'overflow' ? overflowNode : mobileNode;
      if (activeNode && event.target instanceof Node && activeNode.contains(event.target)) {
        return;
      }
      setDropdownMode(null);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isDropdownOpen, dropdownMode]);

  useEffect(() => {
    if (overflowKeys.length === 0 && dropdownMode === 'overflow') {
      setDropdownMode(null);
    }
  }, [overflowKeys.length, dropdownMode]);

  const overflowItems = flattenedNavItems.filter((item) => overflowKeySet.has(item.key));

  const activePageLabel = useMemo(() => {
    const activePage = flattenedNavItems.find((item) => activeSet.has(item.key));
    return activePage?.label || 'Menu';
  }, [flattenedNavItems, activeSet]);

  const closeDropdown = useCallback(() => {
    setDropdownMode(null);
  }, []);

  const mobileMenuId = useId();

  if (flattenedNavItems.length === 0) {
    return null;
  }

  const handleToggleOverflow = () => {
    if (overflowItems.length === 0) {
      return;
    }

    setDropdownMode((prev) => (prev === 'overflow' ? null : 'overflow'));
  };

  const handleToggleMobile = () => {
    setDropdownMode((prev) => (prev === 'mobile' ? null : 'mobile'));
  };

  return (
    <header className={styles.wrapper}>
      <div className={styles.primaryRow}>
        <div className={styles.linksContainer} ref={listContainerRef}>
          <div className={styles.desktopLinks}>
            {flattenedNavItems.map((item) => {
              const isActive = activeSet.has(item.key);
              const isHidden = overflowKeySet.has(item.key);
              return (
                <Link
                  key={item.key}
                  ref={(node) => setItemRef(item.key, node)}
                  href={item.href}
                  className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''} ${
                    isHidden ? styles.navLinkHidden : ''
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.iconButton}
            onClick={toggleTheme}
            aria-pressed={theme === 'dark'}
            aria-label="Toggle dark mode"
            title="Toggle dark mode"
            data-testid="navbar-dark-mode-toggle"
          >
            {theme === 'dark' ? <FiSun /> : <FiMoon />}
          </button>

          <button
            type="button"
            className={styles.iconButton}
            onClick={logout}
            aria-label="Logout"
            title="Logout"
            data-testid="navbar-logout-button"
          >
            <FiLogOut />
          </button>

          <button
            type="button"
            className={`${styles.iconButton} ${overflowItems.length === 0 ? styles.iconButtonHidden : ''}`}
            onClick={handleToggleOverflow}
            aria-haspopup="menu"
            aria-expanded={isOverflowDropdown}
            aria-controls={`${mobileMenuId}-overflow`}
            ref={moreButtonRef}
          >
            <FiMoreHorizontal />
          </button>
        </div>
      </div>

      <div className={styles.mobileRow}>
        <button
          type="button"
          className={styles.mobileTrigger}
          onClick={handleToggleMobile}
          aria-expanded={isMobileDropdown}
          aria-controls={mobileMenuId}
        >
          <span className={styles.mobileTriggerLabel}>{activePageLabel}</span>
          <FiChevronDown className={`${styles.mobileChevron} ${isMobileDropdown ? styles.mobileChevronOpen : ''}`} />
        </button>
      </div>

      {isOverflowDropdown && overflowItems.length > 0 && (
        <div
          id={`${mobileMenuId}-overflow`}
          className={styles.overflowDropdown}
          ref={overflowDropdownRef}
          role="menu"
        >
          {overflowItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={styles.dropdownLink}
              onClick={closeDropdown}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}

      {isMobileDropdown && (
        <div
          id={mobileMenuId}
          className={styles.mobileDropdown}
          ref={mobileDropdownRef}
          role="menu"
        >
          {flattenedNavItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={styles.dropdownLink}
              aria-current={activeSet.has(item.key) ? 'page' : undefined}
              onClick={closeDropdown}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
