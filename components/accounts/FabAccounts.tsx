import React from 'react';
import {
  FiArrowDownCircle,
  FiArrowUpCircle,
  FiLayers,
  FiPlus,
  FiRefreshCw,
} from 'react-icons/fi';

import { FabSmart, FabSmartProps } from '../common/FabSmart';
import styles from '../../styles/accounts.module.css';

const ACCOUNT_FAB_ACTIONS: FabSmartProps['actions'] = [
  {
    id: 'expense',
    icon: <FiArrowUpCircle aria-hidden />,
    label: 'Log expense',
  },
  {
    id: 'income',
    icon: <FiArrowDownCircle aria-hidden />,
    label: 'Log income',
  },
  {
    id: 'transfer',
    icon: <FiLayers aria-hidden />,
    label: 'Transfer funds',
  },
  {
    id: 'loan',
    icon: <FiRefreshCw aria-hidden />,
    label: 'Loan or repayment',
  },
];

export type FabAccountsProps = {
  onAction?: (actionId: string) => void;
  isVisible?: boolean;
};

export function FabAccounts({ onAction, isVisible = true }: FabAccountsProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <FabSmart
      actions={ACCOUNT_FAB_ACTIONS}
      mainIcon={<FiPlus aria-hidden />}
      mainLabel="Quick account action"
      tooltip="Quick Add"
      onSelect={onAction}
      storageKey="accounts-fab-corner"
      className={styles.accountsFab}
      style={{
        bottom: 'clamp(1.5rem, 12vh, 6.5rem)',
        right: 'clamp(1rem, 5vw, 2.5rem)',
      }}
      hideWhenKeyboardOpens
    />
  );
}

export default FabAccounts;
