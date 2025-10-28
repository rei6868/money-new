import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Popover, Transition } from '@headlessui/react';
import {
  FiArrowDownCircle,
  FiArrowUpCircle,
  FiBriefcase,
  FiChevronRight,
  FiCreditCard,
  FiLayers,
  FiRefreshCw,
  FiTrendingUp,
  FiZap,
} from 'react-icons/fi';

import styles from '../../styles/QuickAddMenu.module.css';

export type QuickAddContext = 'transactions' | 'accounts';
export type TransactionQuickAddAction = 'income' | 'expense' | 'transfer' | 'refund';
export type AccountQuickAddAction = 'cashAccount' | 'bankAccount' | 'creditLine' | 'loanAccount';
export type QuickAddActionId = TransactionQuickAddAction | AccountQuickAddAction;

export type QuickAddMenuProps = {
  context: QuickAddContext;
  onSelect?: (context: QuickAddContext, actionId: QuickAddActionId) => void;
  className?: string;
  disabled?: boolean;
  triggerLabel?: string;
  triggerAriaLabel?: string;
};

type QuickAddAction = {
  id: QuickAddActionId;
  label: string;
  description: string;
  icon: JSX.Element;
};

type Placement = 'left' | 'right';

type ActionMap = Record<QuickAddContext, QuickAddAction[]>;

const ACTIONS: ActionMap = {
  transactions: [
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
      id: 'refund',
      label: 'Refund',
      description: 'Credit back a transaction',
      icon: <FiRefreshCw aria-hidden />, 
    },
  ],
  accounts: [
    {
      id: 'cashAccount',
      label: 'Cash Wallet',
      description: 'Create a cash account',
      icon: <FiBriefcase aria-hidden />, 
    },
    {
      id: 'bankAccount',
      label: 'Bank Account',
      description: 'Connect or add bank ledger',
      icon: <FiTrendingUp aria-hidden />, 
    },
    {
      id: 'creditLine',
      label: 'Credit Line',
      description: 'Add a credit or charge card',
      icon: <FiCreditCard aria-hidden />, 
    },
    {
      id: 'loanAccount',
      label: 'Loan',
      description: 'Track a loan or liability',
      icon: <FiLayers aria-hidden />, 
    },
  ],
};

export function QuickAddMenu({
  context,
  onSelect,
  className,
  disabled = false,
  triggerLabel = 'Quick add',
  triggerAriaLabel,
}: QuickAddMenuProps) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [placement, setPlacement] = useState<Placement>('left');
  const [isMobile, setIsMobile] = useState(false);
  const [supportsHover, setSupportsHover] = useState(false);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});

  const updatePlacement = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const triggerEl = triggerRef.current;
    if (!triggerEl) {
      return;
    }
    const rect = triggerEl.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;
    const viewportWidth = window.innerWidth;
    const viewportCenter = viewportWidth / 2;
    const resolvedPlacement: Placement = rect.left > viewportCenter ? 'right' : 'left';
    setPlacement(resolvedPlacement);

    const minEdge = 12;
    const defaultWidth = Math.min(Math.max(rect.width, 288), viewportWidth - minEdge * 2);
    const top = rect.bottom + scrollY + (isMobile ? 8 : 12);

    if (isMobile) {
      setPanelStyle({
        top,
        left: scrollX + minEdge,
        right: minEdge,
        width: defaultWidth,
      });
      return;
    }

    if (resolvedPlacement === 'right') {
      const distanceFromRight = viewportWidth - rect.right + scrollX;
      setPanelStyle({
        top,
        right: Math.max(distanceFromRight, minEdge),
        width: defaultWidth,
      });
      return;
    }

    setPanelStyle({
      top,
      left: Math.max(rect.left + scrollX, scrollX + minEdge),
      width: defaultWidth,
    });
  }, [isMobile]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const mobileQuery = window.matchMedia('(max-width: 600px)');
    const hoverQuery = window.matchMedia('(hover: hover) and (pointer: fine)');

    const updateMatches = () => {
      setIsMobile(mobileQuery.matches);
      setSupportsHover(hoverQuery.matches);
    };

    updateMatches();

    const handleMobileChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    const handleHoverChange = (event: MediaQueryListEvent) => setSupportsHover(event.matches);

    mobileQuery.addEventListener('change', handleMobileChange);
    hoverQuery.addEventListener('change', handleHoverChange);

    return () => {
      mobileQuery.removeEventListener('change', handleMobileChange);
      hoverQuery.removeEventListener('change', handleHoverChange);
    };
  }, []);

  const actions = useMemo(() => ACTIONS[context] ?? [], [context]);

  useEffect(() => {
    updatePlacement();
  }, [updatePlacement]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    const handleReposition = () => {
      updatePlacement();
    };
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [updatePlacement]);


  const handleSelect = useCallback(
    (action: QuickAddActionId, close: () => void) => {
      window.requestAnimationFrame(() => {
        close();
        onSelect?.(context, action);
      });
    },
    [context, onSelect],
  );

  const containerClassName = [styles.container, className].filter(Boolean).join(' ');

  return (
    <Popover className={containerClassName}>
      {({ open, close }) => (
        <div
          className={styles.shell}
          data-open={open ? 'true' : undefined}
          onMouseEnter={() => {
            if (supportsHover && !disabled && !open) {
              updatePlacement();
              triggerRef.current?.click();
            }
          }}
        >
          <Popover.Button
            ref={triggerRef}
            type="button"
            className={styles.trigger}
            aria-label={triggerAriaLabel ?? triggerLabel}
            aria-expanded={open}
            disabled={disabled}
            onClick={() => {
              updatePlacement();
            }}
            onFocus={() => {
              if (!open) {
                updatePlacement();
              }
            }}
            onMouseEnter={() => {
              if (!open && supportsHover && !disabled) {
                updatePlacement();
              }
            }}
          >
            <span className={styles.triggerIcon} aria-hidden>
              <FiZap />
            </span>
            <span className={styles.triggerLabel}>{triggerLabel}</span>
          </Popover.Button>

          <Transition
            as={Fragment}
            enter={styles.transitionEnter}
            enterFrom={styles.transitionEnterFrom}
            enterTo={styles.transitionEnterTo}
            leave={styles.transitionLeave}
            leaveFrom={styles.transitionLeaveFrom}
            leaveTo={styles.transitionLeaveTo}
          >
            <Popover.Panel
              static
              className={styles.panel}
              data-placement={placement}
              data-open={open ? 'true' : undefined}
              data-mobile={isMobile ? 'true' : undefined}
              style={panelStyle}
            >
              <div className={styles.panelSurface} role="menu" aria-label="Quick add shortcuts">
                <header className={styles.panelHeader}>
                  <span className={styles.panelTitle}>Quick actions</span>
                </header>
                <ul className={styles.actionList}>
                  {actions.map((action) => (
                    <li key={action.id}>
                      <button
                        type="button"
                        className={styles.actionItem}
                        onClick={() => handleSelect(action.id, close)}
                        role="menuitem"
                      >
                        <span className={styles.actionIcon}>{action.icon}</span>
                        <span className={styles.actionContent}>
                          <span className={styles.actionLabel}>{action.label}</span>
                          <span className={styles.actionDescription}>{action.description}</span>
                        </span>
                        <span className={styles.actionGlyph} aria-hidden>
                          <FiChevronRight />
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </Popover.Panel>
          </Transition>
        </div>
      )}
    </Popover>
  );
}

export default QuickAddMenu;
