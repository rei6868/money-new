import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { FiChevronDown, FiLogOut, FiMoon, FiMoreHorizontal, FiSun } from 'react-icons/fi';

import { useLayoutNavigation } from '../navigation/LayoutNavigationContext';
import { useNavigation } from '../navigation/useNavigation';
import styles from './TopBar.module.css';

type DropdownMode = 'overflow' | 'mobile' | null;

export function TopBar(): JSX.Element | null {
  const { theme, toggleTheme, logout } = useLayoutNavigation();
  const { items, activeKeys, overflowKeys, containerRef, triggerRef, registerItemRef } = useNavigation();

  const [dropdownMode, setDropdownMode] = useState<DropdownMode>(null);
  const overflowDropdownRef = useRef<HTMLDivElement | null>(null);
  const mobileDropdownRef = useRef<HTMLDivElement | null>(null);

  const overflowKeySet = useMemo(() => new Set(overflowKeys), [overflowKeys]);
  const overflowItems = useMemo(
    () => items.filter((item) => overflowKeySet.has(item.key)),
    [items, overflowKeySet],
  );

  const activePageLabel = useMemo(() => {
    const activePage = items.find((item) => activeKeys.has(item.key));
    return activePage?.label ?? 'Menu';
  }, [items, activeKeys]);

  useEffect(() => {
    if (overflowKeys.length === 0 && dropdownMode === 'overflow') {
      setDropdownMode(null);
    }
  }, [overflowKeys.length, dropdownMode]);

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

  const closeDropdown = useCallback(() => {
    setDropdownMode(null);
  }, []);

  const handleToggleOverflow = useCallback(() => {
    if (overflowItems.length === 0) {
      return;
    }
    setDropdownMode((prev) => (prev === 'overflow' ? null : 'overflow'));
  }, [overflowItems.length]);

  const handleToggleMobile = useCallback(() => {
    setDropdownMode((prev) => (prev === 'mobile' ? null : 'mobile'));
  }, []);

  const mobileMenuId = useId();

  if (items.length === 0) {
    return null;
  }

  return (
    <header className={styles.wrapper}>
      <div className={styles.primaryRow}>
        <div className={styles.linksContainer} ref={containerRef}>
          <div className={styles.desktopLinks}>
            {items.map((item) => {
              const isActive = activeKeys.has(item.key);
              const isHidden = overflowKeySet.has(item.key);
              return (
                <Link
                  key={item.key}
                  ref={(node) => registerItemRef(item.key, node)}
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

        <div className={styles.controls}>
          <button
            type="button"
            className={styles.mobileTrigger}
            onClick={handleToggleMobile}
            aria-expanded={isMobileDropdown}
            aria-controls={mobileMenuId}
          >
            <span className={styles.mobileTriggerLabel}>{activePageLabel}</span>
            <FiChevronDown
              className={`${styles.mobileChevron} ${isMobileDropdown ? styles.mobileChevronOpen : ''}`}
            />
          </button>

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
              className={`${styles.iconButton} ${
                overflowItems.length === 0 ? styles.iconButtonHidden : ''
              }`}
              onClick={handleToggleOverflow}
              aria-haspopup="menu"
              aria-expanded={isOverflowDropdown}
              aria-controls={`${mobileMenuId}-overflow`}
              ref={triggerRef}
            >
              <FiMoreHorizontal />
              <span className={styles.visuallyHidden}>More navigation items</span>
            </button>
          </div>
        </div>
      </div>

      {isOverflowDropdown && overflowItems.length > 0 && (
        <div
          id={`${mobileMenuId}-overflow`}
          className={styles.overflowDropdown}
          ref={overflowDropdownRef}
          role="menu"
        >
          {overflowItems.map((item) => (
            <Link key={item.key} href={item.href} className={styles.dropdownLink} onClick={closeDropdown}>
              {item.label}
            </Link>
          ))}
        </div>
      )}

      {isMobileDropdown && (
        <div id={mobileMenuId} className={styles.mobileDropdown} ref={mobileDropdownRef} role="menu">
          {items.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={styles.dropdownLink}
              aria-current={activeKeys.has(item.key) ? 'page' : undefined}
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
