import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { FiLogOut, FiMoreHorizontal, FiMoon, FiSun } from 'react-icons/fi';

import styles from './TopNavBar.module.css';

const MORE_TRIGGER_RESERVE = 64;

function normalizeActiveKeys(activeKeys) {
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

export function TopNavBar({
  navItems = [],
  activeKeys,
  onToggleTheme,
  onLogout,
  theme = 'light',
  settingsLink,
}) {
  const activeSet = useMemo(() => normalizeActiveKeys(activeKeys), [activeKeys]);
  const [overflowKeys, setOverflowKeys] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const listContainerRef = useRef(null);
  const moreButtonRef = useRef(null);
  const dropdownRef = useRef(null);
  const itemRefs = useRef(new Map());
  const itemWidthMapRef = useRef(new Map());

  const flattenedNavItems = useMemo(() => {
    const flattened = [];
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

  const setItemRef = useCallback((key, node) => {
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
      }
      return;
    }

    while (visibleCount > 0 && runningWidth + moreWidth > availableWidth) {
      visibleCount -= 1;
      runningWidth -= itemWidths[visibleCount] ?? 0;
    }

    const nextOverflow = flattenedNavItems.slice(visibleCount).map((item) => item.key);
    setOverflowKeys(nextOverflow);
  }, [flattenedNavItems, measureItemWidths, overflowKeys.length]);

  useEffect(() => {
    recalculateOverflow();
  }, [recalculateOverflow, theme]);

  const overflowKeySet = useMemo(() => new Set(overflowKeys), [overflowKeys]);

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

    const handlePointerDown = (event) => {
      if (!dropdownRef.current) {
        return;
      }
      if (!dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isDropdownOpen]);

  useEffect(() => {
    if (overflowKeys.length === 0 && isDropdownOpen) {
      setIsDropdownOpen(false);
    }
  }, [overflowKeys.length, isDropdownOpen]);

  if (flattenedNavItems.length === 0) {
    return null;
  }

  const overflowItems = flattenedNavItems.filter((item) => overflowKeySet.has(item.key));

  const handleToggleDropdown = () => {
    if (overflowItems.length === 0) {
      return;
    }
    setIsDropdownOpen((prev) => !prev);
  };

  const renderNavLink = (item, { inOverflow = false } = {}) => {
    const isActive = activeSet.has(item.key);
    const className = `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`.trim();

    const link = (
      <Link
        href={item.href}
        className={className}
        data-overflow={inOverflow ? 'true' : undefined}
        onClick={() => setIsDropdownOpen(false)}
      >
        {item.label}
      </Link>
    );

    if (inOverflow) {
      return <li key={`overflow-${item.key}`}>{link}</li>;
    }

    return (
      <li
        key={item.key}
        ref={(node) => setItemRef(item.key, node)}
        className={overflowKeySet.has(item.key) ? styles.navItemHidden : styles.navItem}
        data-key={item.key}
      >
        {link}
      </li>
    );
  };

  return (
    <nav className={styles.navBar} aria-label="Primary navigation">
      <Link href="/transactions" className={styles.brandLink} onClick={() => setIsDropdownOpen(false)}>
        <span className={styles.brandMark}>MF</span>
        <span className={styles.brandText}>Money Flow</span>
      </Link>
      <div className={styles.navListWrapper} ref={listContainerRef}>
        <ul className={styles.navList}>
          {flattenedNavItems.map((item) => renderNavLink(item))}
        </ul>
      </div>
      <div className={styles.navActions}>
        <div
          className={styles.moreWrapper}
          data-active={overflowItems.length > 0 ? 'true' : 'false'}
          ref={dropdownRef}
        >
          <button
            type="button"
            className={`${styles.iconButton} ${styles.moreTrigger}`}
            aria-haspopup="menu"
            aria-expanded={isDropdownOpen}
            onClick={handleToggleDropdown}
            ref={moreButtonRef}
            disabled={overflowItems.length === 0}
          >
            <FiMoreHorizontal aria-hidden="true" />
            <span className={styles.visuallyHidden}>Open overflow navigation links</span>
          </button>
          {isDropdownOpen && overflowItems.length > 0 ? (
            <div className={styles.moreMenu} role="menu">
              <ul className={styles.moreMenuList}>
                {overflowItems.map((item) => renderNavLink(item, { inOverflow: true }))}
              </ul>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          className={styles.iconButton}
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {theme === 'dark' ? <FiSun aria-hidden="true" /> : <FiMoon aria-hidden="true" />}
        </button>
        <button
          type="button"
          className={styles.iconButton}
          onClick={onLogout}
          aria-label="Log out"
        >
          <FiLogOut aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
