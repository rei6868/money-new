import React, { useMemo } from 'react';
import {
  FiArrowDownCircle,
  FiArrowUpCircle,
  FiLayers,
  FiRefreshCw,
} from 'react-icons/fi';

import { AccountRow } from './accountColumns';
import cardStyles from '../../styles/accounts/cards.module.css';

type AccountsQuickActionsProps = {
  account: AccountRow;
  onAction?: (actionId: string, account: AccountRow) => void;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
};

type QuickActionItem = {
  id: 'expense' | 'income' | 'transfer' | 'loan';
  icon: React.ComponentType<{ 'aria-hidden': boolean }>;
  label: string;
};

const QUICK_ACTIONS: QuickActionItem[] = [
  {
    id: 'expense',
    icon: FiArrowUpCircle,
    label: 'Log expense',
  },
  {
    id: 'income',
    icon: FiArrowDownCircle,
    label: 'Log income',
  },
  {
    id: 'transfer',
    icon: FiLayers,
    label: 'Transfer',
  },
  {
    id: 'loan',
    icon: FiRefreshCw,
    label: 'Loan or repay',
  },
];

export function AccountsQuickActions({
  account,
  onAction,
  disabled = true,
  className = cardStyles.cardQuickActions,
  buttonClassName = cardStyles.quickActionButton,
}: AccountsQuickActionsProps) {
  const isInteractive = useMemo(() => typeof onAction === 'function' && !disabled, [onAction, disabled]);

  return (
    <div className={className}>
      {QUICK_ACTIONS.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.id}
            type="button"
            className={buttonClassName}
            onClick={(event) => {
              event.preventDefault();
              if (!isInteractive || !onAction) {
                return;
              }
              onAction(action.id, account);
            }}
            disabled={!isInteractive}
            title={isInteractive ? action.label : `${action.label} (coming soon)`}
          >
            <Icon aria-hidden />
            <span className={cardStyles.quickDockLabel}>{action.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default AccountsQuickActions;
