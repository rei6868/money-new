import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { FiChevronDown, FiLogOut, FiMoreHorizontal, FiMoon, FiSun } from 'react-icons/fi';

import { useNavigation } from '../navigation/useNavigation';
import { useOverflowNavigation } from '../navigation/useOverflowNavigation';

import styles from './TopBar.module.css';

type TopBarProps = {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onLogout: () => void;
};

type DropdownMode = 'overflow' | 'mobile' | null;

export function TopBar({ theme, onToggleTheme, onLogout }: TopBarProps) {
  const { activeKeySet } = useNavigation();
  const {
    listContainerRef,
    moreButtonRef,
    registerItemRef,
    recalculate,
    overflowKeySet,
    items: flattenedNavItems,
  } = useOverflowNavigation();

  const [dropdownMode, setDropdownMode] = useState<DropdownMode>(null);
  const overflowDropdownRef = useRef<HTMLDivElement | null>(null);
  const mobileDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    recalculate();
  }, [recalculate, theme]);

  const overflowItems = useMemo(
    () => flattenedNavItems.filter((item) => overflowKeySet.has(item.key)),
    [flattenedNavItems, overflowKeySet],
  );

  useEffect(() => {
    if (overflowItems.length === 0 && dropdownMode === 'overflow') {
      setDropdownMode(null);
    }
  }, [overflowItems.length, dropdownMode]);

  const isDropdownOpen = dropdownMode !== null;
  const isOverflowDropdown = dropdownMode === 'overflow';
  const isMobileDropdown = dropdownMode === 'mobile';

  useEffect(() => {
    if (!isDropdownOpen) {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const overflowNode = overflowDropdownRef.current;
      const mobileNode = mobileDropdownRef.current;
      const activeNode = dropdownMode === 'overflow' ? overflowNode : mobileNode;
      if (activeNode && activeNode.contains(event.target as Node)) {
        return;
      }
      setDropdownMode(null);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [dropdownMode, isDropdownOpen]);

  const closeDropdown = useCallback(() => {
    setDropdownMode(null);
  }, []);

  const mobileMenuId = useId();

  const activePageLabel = useMemo(() => {
    const activePage = flattenedNavItems.find((item) => activeKeySet.has(item.key));
    return activePage?.label ?? 'Menu';
  }, [flattenedNavItems, activeKeySet]);

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

  const renderNavLink = (item: typeof flattenedNavItems[number], { inOverflow = false } = {}) => {
    const isActive = activeKeySet.has(item.key);
    const className = [styles.navLink, isActive ? styles.navLinkActive : ''].filter(Boolean).join(' ');

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
        ref={(node) => registerItemRef(item.key, node)}
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
          aria-controls={mobileMenuId}
          aria-label="Open navigation menu"
        >
          <span className={styles.mobileLabel}>{activePageLabel}</span>
          <FiChevronDown className={styles.mobileChevron} aria-hidden="true" />
        </button>
        {isMobileDropdown ? (
          <div className={styles.mobileMenu} role="menu" id={mobileMenuId}>
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
            className={[styles.iconButton, styles.moreTrigger].join(' ')}
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
