import React, { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Popover, Portal, Transition } from '@headlessui/react';
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
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [isHoverable, setIsHoverable] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 248 });
  const closeTimerRef = useRef<number | null>(null);

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

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  const actionItems = useMemo(() => ACTIONS, []);

  const handleSelect = (actionId: QuickAddActionId) => {
    onSelect?.(actionId);
  };

  const containerClassName = [styles.container, className].filter(Boolean).join(' ');
  return (
    <Popover>
      {({ open, close }) => (
        <>
          <div
            ref={containerRef}
            className={containerClassName}
            data-expanded={open ? 'true' : undefined}
            onMouseEnter={() => {
              if (!isHoverable) {
                return;
              }
              clearCloseTimer();
              if (!open) {
                triggerRef.current?.click();
              }
            }}
            onMouseLeave={() => {
              if (!isHoverable) {
                return;
              }
              clearCloseTimer();
              closeTimerRef.current = window.setTimeout(() => {
                close();
                closeTimerRef.current = null;
              }, 180);
            }}
          >
            <Popover.Button
              ref={triggerRef}
              type="button"
              className={styles.trigger}
              aria-haspopup="true"
              aria-expanded={open ? 'true' : 'false'}
              onClick={() => {
                clearCloseTimer();
                if (!open) {
                  updateMenuPosition();
                }
              }}
              onMouseEnter={() => {
                if (!isHoverable || open) {
                  return;
                }
                clearCloseTimer();
                triggerRef.current?.click();
              }}
            >
              <span className={styles.triggerIcon} aria-hidden>
                <FiZap />
              </span>
              <span className={styles.triggerLabel}>Quick Add</span>
            </Popover.Button>
          </div>
          <QuickAddPanel
            actionItems={actionItems}
            anchorClassName={styles.portalAnchor}
            clearCloseTimer={clearCloseTimer}
            close={close}
            closeTimerRef={closeTimerRef}
            handleSelect={handleSelect}
            isHoverable={isHoverable}
            menuPosition={menuPosition}
            onReposition={updateMenuPosition}
            open={open}
            panelRef={panelRef}
          />
        </>
      )}
    </Popover>
  );
}

export default QuickAddMenu;

type QuickAddPanelProps = {
  actionItems: typeof ACTIONS;
  anchorClassName: string;
  clearCloseTimer: () => void;
  close: (
    focusableElement?:
      | HTMLElement
      | React.MutableRefObject<HTMLElement | null>
      | React.MouseEvent<HTMLElement>,
  ) => void;
  closeTimerRef: React.MutableRefObject<number | null>;
  handleSelect: (actionId: QuickAddActionId) => void;
  isHoverable: boolean;
  menuPosition: { top: number; left: number; width: number };
  onReposition: () => void;
  open: boolean;
  panelRef: React.MutableRefObject<HTMLDivElement | null>;
};

function QuickAddPanel({
  actionItems,
  anchorClassName,
  clearCloseTimer,
  close,
  closeTimerRef,
  handleSelect,
  isHoverable,
  menuPosition,
  onReposition,
  open,
  panelRef,
}: QuickAddPanelProps) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    onReposition();

    const handleReposition = () => onReposition();
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [onReposition, open]);

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  return (
    <Portal>
      <div className={styles.portalRoot} data-open={open ? 'true' : 'false'}>
        <Transition
          as={Fragment}
          show={open}
          enter={styles.menuEnter}
          enterFrom={styles.menuEnterFrom}
          enterTo={styles.menuEnterTo}
          leave={styles.menuLeave}
          leaveFrom={styles.menuLeaveFrom}
          leaveTo={styles.menuLeaveTo}
        >
          <div
            className={anchorClassName}
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
              if (!isHoverable) {
                return;
              }
              clearCloseTimer();
              closeTimerRef.current = window.setTimeout(() => {
                close();
                closeTimerRef.current = null;
              }, 180);
            }}
          >
            <Popover.Panel
              static
              ref={(node) => {
                panelRef.current = node;
              }}
              className={styles.menu}
              role="menu"
              aria-hidden={open ? 'false' : 'true'}
            >
              {actionItems.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className={styles.menuItem}
                  role="menuitem"
                  onClick={() => {
                    handleSelect(action.id);
                    close();
                  }}
                >
                  <span className={styles.menuIcon}>{action.icon}</span>
                  <span className={styles.menuContent}>
                    <span className={styles.menuLabel}>{action.label}</span>
                    <span className={styles.menuDescription}>{action.description}</span>
                  </span>
                </button>
              ))}
            </Popover.Panel>
          </div>
        </Transition>
      </div>
    </Portal>
  );
}
