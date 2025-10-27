import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
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
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isHoverable, setIsHoverable] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 248 });
  const closeTimerRef = useRef<number | null>(null);
  const openTimerRef = useRef<number | null>(null);
  const instanceId = useId();

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
      const target = event.target as Node | null;
      if (!containerRef.current) {
        return;
      }
      if (containerRef.current.contains(target)) {
        return;
      }
      if (menuRef.current && menuRef.current.contains(target)) {
        return;
      }
      setIsOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const updateMenuPosition = useCallback(() => {
    if (typeof window === 'undefined' || !triggerRef.current) {
      return;
    }

    const rect = triggerRef.current.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;
    const minWidth = 248;
    const width = Math.max(rect.width, minWidth);
    const viewportLeft = scrollX + 16;
    const viewportRight = scrollX + window.innerWidth - 16;
    const clampedLeft = Math.min(
      Math.max(rect.left + scrollX, viewportLeft),
      Math.max(viewportLeft, viewportRight - width),
    );
    const top = rect.bottom + scrollY + 12;

    setMenuPosition({ top, left: clampedLeft, width });
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    updateMenuPosition();

    const handleReposition = () => updateMenuPosition();
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [isOpen, updateMenuPosition]);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const clearOpenTimer = useCallback(() => {
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      clearCloseTimer();
      clearOpenTimer();
    },
    [clearCloseTimer, clearOpenTimer],
  );

  const actionItems = useMemo(() => ACTIONS, []);

  const handleSelect = (actionId: QuickAddActionId) => {
    onSelect?.(actionId);
    setIsOpen(false);
  };

  const scheduleClose = useCallback(() => {
    if (!isHoverable) {
      setIsOpen(false);
      return;
    }
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setIsOpen(false);
      closeTimerRef.current = null;
    }, 180);
  }, [clearCloseTimer, isHoverable]);

  const openWithDelay = useCallback(() => {
    if (!isHoverable) {
      return;
    }
    clearOpenTimer();
    openTimerRef.current = window.setTimeout(() => {
      setIsOpen(true);
      updateMenuPosition();
      openTimerRef.current = null;
    }, 150);
  }, [clearOpenTimer, isHoverable, updateMenuPosition]);

  const handleToggle = () => {
    clearOpenTimer();
    clearCloseTimer();
    setIsOpen((prev) => {
      const next = !prev;
      if (next) {
        updateMenuPosition();
      }
      return next;
    });
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleExternalOpen = (event: Event) => {
      const customEvent = event as CustomEvent<{ id?: string }>;
      const eventId = customEvent.detail?.id;
      if (eventId && eventId !== instanceId) {
        setIsOpen(false);
      }
    };

    window.addEventListener('quick-add-menu:open', handleExternalOpen as EventListener);
    return () => {
      window.removeEventListener('quick-add-menu:open', handleExternalOpen as EventListener);
    };
  }, [instanceId]);

  useEffect(() => {
    if (typeof window === 'undefined' || !isOpen) {
      return undefined;
    }

    window.dispatchEvent(new CustomEvent('quick-add-menu:open', { detail: { id: instanceId } }));

    const handleScrollClose = () => {
      setIsOpen(false);
    };

    const scrollListenerOptions: AddEventListenerOptions = { capture: true, passive: true };
    window.addEventListener('scroll', handleScrollClose, scrollListenerOptions);

    return () => {
      window.removeEventListener('scroll', handleScrollClose, scrollListenerOptions);
    };
  }, [instanceId, isOpen]);

  const containerClassName = [styles.container, className].filter(Boolean).join(' ');
  const menu = (
    <div
      ref={menuRef}
      className={styles.portalAnchor}
      style={{
        top: `${menuPosition.top}px`,
        left: `${menuPosition.left}px`,
        minWidth: `${menuPosition.width}px`,
      }}
      onMouseEnter={() => {
        if (isHoverable) {
          clearCloseTimer();
        }
      }}
      onMouseLeave={() => {
        if (isHoverable) {
          scheduleClose();
        }
      }}
    >
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

  return (
    <>
      <div
        ref={containerRef}
        className={containerClassName}
        data-expanded={isOpen ? 'true' : undefined}
        onMouseEnter={() => {
          if (isHoverable) {
            clearCloseTimer();
            openWithDelay();
          }
        }}
        onMouseLeave={() => {
          if (isHoverable) {
            clearOpenTimer();
            scheduleClose();
          }
        }}
      >
        <button
          ref={triggerRef}
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
      </div>
      {typeof document !== 'undefined'
        ? createPortal(
            <div className={styles.portalRoot} data-open={isOpen ? 'true' : 'false'}>
              {menu}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

export default QuickAddMenu;
