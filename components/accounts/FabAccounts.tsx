import React from 'react';
import {
  FiArrowDownCircle,
  FiArrowUpCircle,
  FiLayers,
  FiPlus,
  FiRefreshCw,
} from 'react-icons/fi';

import { FabSmart, FabSmartProps } from '../common/FabSmart';

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
};

export function FabAccounts({ onAction }: FabAccountsProps) {
  return (
    <FabSmart
      actions={ACCOUNT_FAB_ACTIONS}
      mainIcon={<FiPlus aria-hidden />}
      mainLabel="Quick account action"
      onSelect={onAction}
      storageKey="accounts-fab-corner"
    />
  );
}

export default FabAccounts;
