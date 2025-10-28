import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { CSSProperties } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FiArrowDownCircle,
  FiArrowUpCircle,
  FiBriefcase,
  FiCreditCard,
  FiLayers,
  FiRefreshCw,
  FiTrendingUp,
  FiZap,
} from 'react-icons/fi';

import styles from '../../styles/QuickAddModal.module.css';

export type QuickAddContext = 'transactions' | 'accounts';
export type TransactionQuickAddAction = 'income' | 'expense' | 'transfer' | 'refund';
export type AccountQuickAddAction =
  | 'cashAccount'
  | 'bankAccount'
  | 'creditLine'
  | 'loanAccount';
export type QuickAddActionId = TransactionQuickAddAction | AccountQuickAddAction;

export type QuickAddModalProps = {
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

function isMobileViewport() {
  if (typeof window === 'undefined') {
    return false;
  }
  return window.matchMedia('(max-width: 720px)').matches;
}

export function QuickAddModal({
  context,
  onSelect,
  className,
  disabled = false,
  triggerLabel = 'Quick add',
  triggerAriaLabel,
}: QuickAddModalProps) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => isMobileViewport());
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    const handleResize = () => {
      const mobile = isMobileViewport();
      setIsMobile(mobile);
      if (!mobile) {
        updatePosition();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updatePosition]);

  const actions = useMemo(() => ACTIONS[context] ?? [], [context]);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) {
      return;
    }
    const rect = trigger.getBoundingClientRect();
    const offset = 12;
    const minWidth = Math.max(rect.width, 320);
    const top = rect.bottom + offset;
    const viewportWidth = window.innerWidth;
    const maxLeft = Math.max(viewportWidth - minWidth - offset, offset);
    const left = Math.min(Math.max(rect.left, offset), maxLeft);
    setPanelStyle({
      '--qa-top': `${top}px`,
      '--qa-left': `${left}px`,
      '--qa-min-width': `${minWidth}px`,
    } as CSSProperties);
  }, []);

  const openModal = () => {
    if (disabled) {
      return;
    }
    setIsOpen(true);
    if (!isMobile) {
      updatePosition();
    }
  };

  const closeModal = () => {
    setIsOpen(false);
  };

  useEffect(() => {
    if (!isOpen || isMobile) {
      return;
    }
    updatePosition();
    const handleScroll = () => updatePosition();
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [isOpen, isMobile, updatePosition]);

  const handleSelect = (actionId: QuickAddActionId) => {
    onSelect?.(context, actionId);
    closeModal();
  };

  const renderPanel = () => (
    <Transition show={isOpen} as={Fragment} appear>
      <Dialog as="div" className={styles.root} onClose={closeModal} static>
        <Transition.Child
          as={Fragment}
          enter={styles.backdropEnter}
          enterFrom={styles.backdropEnterFrom}
          enterTo={styles.backdropEnterTo}
          leave={styles.backdropLeave}
          leaveFrom={styles.backdropLeaveFrom}
          leaveTo={styles.backdropLeaveTo}
        >
          <div className={styles.backdrop} aria-hidden />
        </Transition.Child>

        <div
          className={styles.wrapper}
          data-mobile={isMobile ? 'true' : undefined}
          style={isMobile ? undefined : (panelStyle as CSSProperties)}
        >
          <Transition.Child
            as={Fragment}
            enter={styles.panelEnter}
            enterFrom={styles.panelEnterFrom}
            enterTo={styles.panelEnterTo}
            leave={styles.panelLeave}
            leaveFrom={styles.panelLeaveFrom}
            leaveTo={styles.panelLeaveTo}
          >
            <Dialog.Panel
              className={styles.panel}
              data-mobile={isMobile ? 'true' : undefined}
            >
              <header className={styles.header}>
                <span className={styles.headerIcon} aria-hidden>
                  <FiZap />
                </span>
                <div>
                  <Dialog.Title className={styles.title}>Quick add</Dialog.Title>
                  <p className={styles.subtitle}>Choose an action to jump straight into a new entry.</p>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className={styles.closeButton}
                  aria-label="Close quick add"
                >
                  ×
                </button>
              </header>
              <motion.ul
                className={styles.actionList}
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: {
                    transition: {
                      staggerChildren: 0.06,
                      delayChildren: 0.05,
                    },
                  },
                }}
              >
                <AnimatePresence>
                  {actions.map((action) => (
                    <motion.li
                      key={action.id}
                      variants={{
                        hidden: { opacity: 0, y: 12 },
                        visible: { opacity: 1, y: 0 },
                      }}
                      exit={{ opacity: 0, y: -8 }}
                    >
                      <button
                        type="button"
                        className={styles.actionButton}
                        onClick={() => handleSelect(action.id)}
                      >
                        <span className={styles.actionIcon}>{action.icon}</span>
                        <span className={styles.actionMeta}>
                          <span className={styles.actionLabel}>{action.label}</span>
                          <span className={styles.actionDescription}>{action.description}</span>
                        </span>
                      </button>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </motion.ul>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );

  return (
    <div className={className}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        disabled={disabled}
        onClick={openModal}
        aria-label={triggerAriaLabel ?? triggerLabel}
      >
        <span className={styles.triggerIcon} aria-hidden>
          <FiZap />
        </span>
        <span className={styles.triggerLabel}>{triggerLabel}</span>
      </button>
      {hasMounted ? renderPanel() : null}
    </div>
  );
}

export default QuickAddModal;
