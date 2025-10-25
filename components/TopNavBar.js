import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { FiLogOut, FiMoreHorizontal, FiMoon, FiSun, FiChevronDown } from 'react-icons/fi';

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
  const [dropdownMode, setDropdownMode] = useState(null);
  const listContainerRef = useRef(null);
  const moreButtonRef = useRef(null);
  const overflowDropdownRef = useRef(null);
  const mobileDropdownRef = useRef(null);
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

    const handlePointerDown = (event) => {
      const overflowNode = overflowDropdownRef.current;
      const mobileNode = mobileDropdownRef.current;
      const activeNode = dropdownMode === 'overflow' ? overflowNode : mobileNode;
      if (activeNode && activeNode.contains(event.target)) {
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

  if (flattenedNavItems.length === 0) {
    return null;
  }

  const handleToggleOverflow = () => {
    if (overflowItems.length === 0) {
      return;
    }
    setDropdownMode((prev) => (prev === 'overflow' ? null : 'overflow'));
  };

  const handleMobileToggleDropdown = () => {
    setDropdownMode((prev) => (prev === 'mobile' ? null : 'mobile'));
  };

  const renderNavLink = (item, { inOverflow = false } = {}) => {
    const isActive = activeSet.has(item.key);
    const className = `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`.trim();

    const link = (
      <Link
        href={item.href}
        className={className}
        data-overflow={inOverflow ? 'true' : undefined}
        onClick={closeDropdown}
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
      <Link
        href="/transactions"
        className={styles.brandLink}
        onClick={closeDropdown}
        aria-label="Money Flow home"
      >
        <span className={styles.brandMark}>MF</span>
      </Link>
      <div className={styles.mobileMenuWrapper} ref={mobileDropdownRef}>
        <button
          type="button"
          className={styles.mobileTrigger}
          onClick={handleMobileToggleDropdown}
          aria-haspopup="menu"
          aria-expanded={isMobileDropdown}
          aria-label="Open navigation menu"
        >
          <span className={styles.mobileLabel}>{activePageLabel}</span>
          <FiChevronDown className={styles.mobileChevron} aria-hidden="true" />
        </button>
        {isMobileDropdown ? (
          <div className={styles.mobileMenu} role="menu">
            <ul className={styles.mobileMenuList}>
              {flattenedNavItems.map((item) => renderNavLink(item, { inOverflow: true }))}
            </ul>
          </div>
        ) : null}
      </div>
      <div className={styles.navListWrapper} ref={listContainerRef}>
        <ul className={styles.navList}>
          {flattenedNavItems.map((item) => renderNavLink(item))}
        </ul>
      </div>
      <div className={styles.navActions}>
        <div
          className={styles.moreWrapper}
          data-active={overflowItems.length > 0 ? 'true' : 'false'}
          ref={overflowDropdownRef}
        >
          <button
            type="button"
            className={`${styles.iconButton} ${styles.moreTrigger}`}
            aria-haspopup="menu"
            aria-expanded={isOverflowDropdown}
            onClick={handleToggleOverflow}
            ref={moreButtonRef}
            disabled={overflowItems.length === 0}
          >
            <FiMoreHorizontal aria-hidden="true" />
            <span className={styles.visuallyHidden}>Open overflow navigation links</span>
          </button>
          {isOverflowDropdown ? (
            <div className={styles.moreMenu} role="menu">
              <ul className={styles.moreMenuList}>
                {(overflowItems.length > 0 ? overflowItems : flattenedNavItems).map((item) =>
                  renderNavLink(item, { inOverflow: true }),
                )}
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
