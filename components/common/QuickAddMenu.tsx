import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FiArrowDownCircle, FiArrowUpCircle, FiLayers, FiRefreshCw, FiZap } from 'react-icons/fi';

import styles from '../../styles/QuickAddMenu.module.css';

export type QuickAddActionId = 'income' | 'expense' | 'transfer' | 'loan';

export type QuickAddMenuProps = {
  onSelect?: (actionId: QuickAddActionId) => void;
  className?: string;
};

const ACTIONS: { id: QuickAddActionId; label: string; description: string; icon: React.ReactNode }[] = [
  {
    id: 'income',
    label: 'Income',
    description: 'Log incoming funds',
    icon: <FiArrowDownCircle aria-hidden />,
  },
  {
    id: 'expense',
    label: 'Expense',
    description: 'Track outgoing spend',
    icon: <FiArrowUpCircle aria-hidden />,
  },
  {
    id: 'transfer',
    label: 'Transfer',
    description: 'Move money between accounts',
    icon: <FiLayers aria-hidden />,
  },
  {
    id: 'loan',
    label: 'Loan',
    description: 'Record loans or repayments',
    icon: <FiRefreshCw aria-hidden />,
  },
];

export function QuickAddMenu({ onSelect, className }: QuickAddMenuProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isHoverable, setIsHoverable] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const media = window.matchMedia('(hover: hover)');
    const updateHoverable = () => setIsHoverable(media.matches);
    updateHoverable();
    media.addEventListener('change', updateHoverable);
    return () => media.removeEventListener('change', updateHoverable);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current) {
        return;
      }
      if (containerRef.current.contains(event.target as Node)) {
        return;
      }
      setIsOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const actionItems = useMemo(() => ACTIONS, []);

  const handleSelect = (actionId: QuickAddActionId) => {
    onSelect?.(actionId);
    setIsOpen(false);
  };

  const handleToggle = () => {
    if (isHoverable) {
      setIsOpen(true);
    } else {
      setIsOpen((prev) => !prev);
    }
  };

  return (
    <div
      ref={containerRef}
      className={[styles.container, className].filter(Boolean).join(' ')}
      onMouseEnter={() => {
        if (isHoverable) {
          setIsOpen(true);
        }
      }}
      onMouseLeave={() => {
        if (isHoverable) {
          setIsOpen(false);
        }
      }}
    >
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="true"
        aria-expanded={isOpen ? 'true' : 'false'}
        onClick={handleToggle}
      >
        <span className={styles.triggerIcon} aria-hidden>
          <FiZap />
        </span>
        <span className={styles.triggerLabel}>Quick Add</span>
      </button>

      <div
        className={styles.menu}
        role="menu"
        data-open={isOpen ? 'true' : 'false'}
        aria-hidden={isOpen ? 'false' : 'true'}
      >
        {actionItems.map((action) => (
          <button
            key={action.id}
            type="button"
            className={styles.menuItem}
            role="menuitem"
            onClick={() => handleSelect(action.id)}
          >
            <span className={styles.menuIcon}>{action.icon}</span>
            <span className={styles.menuContent}>
              <span className={styles.menuLabel}>{action.label}</span>
              <span className={styles.menuDescription}>{action.description}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default QuickAddMenu;
