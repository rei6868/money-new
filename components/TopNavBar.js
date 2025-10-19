import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  FiLogOut,
  FiMoreHorizontal,
  FiMoon,
  FiSearch,
  FiSun,
} from 'react-icons/fi';

import styles from './TopNavBar.module.css';

const PRIMARY_LINK_LIMIT = 4;

function buildLinkList(navItems = [], settingsLink) {
  const directLinks = [];
  const nestedLinks = [];

  navItems.forEach((item) => {
    if (item?.href) {
      directLinks.push({ key: item.key, label: item.label, href: item.href });
    }

    if (Array.isArray(item?.children)) {
      item.children.forEach((child) => {
        if (child?.href) {
          nestedLinks.push({ key: child.key, label: child.label, href: child.href });
        }
      });
    }
  });

  const combined = [...directLinks, ...nestedLinks];
  if (settingsLink?.href) {
    combined.push(settingsLink);
  }

  return combined;
}

export function TopNavBar({
  navItems = [],
  activeKeys = new Set(),
  onToggleTheme,
  onLogout,
  theme = 'light',
  settingsLink,
  onSearch,
}) {
  const normalizedActiveKeys = useMemo(() => new Set(activeKeys), [activeKeys]);

  const links = useMemo(() => buildLinkList(navItems, settingsLink), [navItems, settingsLink]);
  const primaryLinks = links.slice(0, PRIMARY_LINK_LIMIT);
  const overflowLinks = links.slice(PRIMARY_LINK_LIMIT);

  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const overflowRef = useRef(null);

  useEffect(() => {
    if (!isOverflowOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!overflowRef.current) {
        return;
      }
      if (!overflowRef.current.contains(event.target)) {
        setIsOverflowOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOverflowOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOverflowOpen]);

  const handleToggleOverflow = () => {
    setIsOverflowOpen((prev) => !prev);
  };

  const handleOverflowNavigate = () => {
    setIsOverflowOpen(false);
  };

  const hasSearchAction = typeof onSearch === 'function';
  const handleSearchClick = () => {
    if (hasSearchAction) {
      onSearch();
    }
  };

  const handleThemeToggle = () => {
    onToggleTheme?.();
  };

  const handleLogoutClick = () => {
    onLogout?.();
  };

  return (
    <nav className={styles.topNavBar} aria-label="Mobile navigation">
      <Link href="/transactions" className={styles.brandLink} aria-label="Money Flow home">
        <span className={styles.brandInitials}>MF</span>
      </Link>

      <div className={styles.navLinks}>
        <div className={styles.navLinksScroll}>
          {primaryLinks.map((link) => {
            const isActive = normalizedActiveKeys.has(link.key);
            const className = `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`.trim();
            return (
              <Link key={link.key} href={link.href} className={className} aria-current={isActive ? 'page' : undefined}>
                {link.label}
              </Link>
            );
          })}
        </div>
        {overflowLinks.length > 0 ? (
          <div className={styles.moreMenu} ref={overflowRef}>
            <button
              type="button"
              className={`${styles.moreMenuButton} ${isOverflowOpen ? styles.moreMenuButtonActive : ''}`.trim()}
              onClick={handleToggleOverflow}
              aria-haspopup="menu"
              aria-expanded={isOverflowOpen}
              aria-label="Show more navigation links"
            >
              <FiMoreHorizontal aria-hidden />
            </button>
            {isOverflowOpen ? (
              <div className={styles.moreMenuPopover} role="menu">
                {overflowLinks.map((link) => {
                  const isActive = normalizedActiveKeys.has(link.key);
                  const className = `${styles.moreMenuLink} ${isActive ? styles.moreMenuLinkActive : ''}`.trim();
                  return (
                    <Link
                      key={link.key}
                      href={link.href}
                      className={className}
                      role="menuitem"
                      aria-current={isActive ? 'page' : undefined}
                      onClick={handleOverflowNavigate}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className={styles.navActions}>
        <button
          type="button"
          className={styles.iconButton}
          onClick={handleSearchClick}
          aria-label="Search"
          disabled={!hasSearchAction}
        >
          <FiSearch aria-hidden />
        </button>
        <button
          type="button"
          className={`${styles.iconButton} ${styles.iconButtonPrimary}`.trim()}
          onClick={handleThemeToggle}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <FiSun aria-hidden /> : <FiMoon aria-hidden />}
        </button>
        <button
          type="button"
          className={styles.iconButton}
          onClick={handleLogoutClick}
          aria-label="Logout"
        >
          <FiLogOut aria-hidden />
        </button>
      </div>
    </nav>
  );
}
