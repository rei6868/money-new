import { formatAmountWithTrailing } from '../../lib/numberFormat';
import accountsStyles from '../../styles/accounts.module.css';
import cardStyles from '../../styles/accounts/cards.module.css';

export type AccountRow = {
  accountId: string;
  accountName: string;
  accountType: string;
  openingBalance: number;
  currentBalance: number;
  totalIn: number;
  totalOut: number;
  status: string;
  notes?: string | null;
  parentAccountId?: string | null;
  imgUrl?: string | null;
};

export type AccountColumnDefinition = {
  id: keyof AccountRow;
  label: string;
  minWidth: number;
  defaultWidth: number;
  align?: 'left' | 'center' | 'right';
  defaultVisible?: boolean;
  optional?: boolean;
  renderCell?: (account: AccountRow) => React.ReactNode;
  valueAccessor?: (account: AccountRow) => React.ReactNode;
};

export function getStatusClass(status: string | null | undefined) {
  const normalized = String(status ?? '').toLowerCase();
  if (normalized === 'active') {
    return cardStyles.statusActive;
  }
  if (normalized === 'pending' || normalized === 'pending-activation') {
    return cardStyles.statusPending;
  }
  if (
    normalized === 'void' ||
    normalized === 'canceled' ||
    normalized === 'closed' ||
    normalized === 'archived'
  ) {
    return cardStyles.statusInactive;
  }
  return cardStyles.statusNeutral;
}

function renderStatusBadge(account: AccountRow) {
  const status = account.status ?? '--';
  const className = `${cardStyles.statusBadge} ${getStatusClass(status)}`.trim();
  return <span className={className}>{status || '--'}</span>;
}

function renderAccountCell(account: AccountRow) {
  return (
    <div>
      <div>{account.accountName ?? '—'}</div>
      <div className={accountsStyles.columnSubline}>{account.accountType ?? '—'}</div>
    </div>
  );
}

function renderBalanceCell(value: number) {
  const formatted = formatAmountWithTrailing(value);
  return <strong>${formatted}</strong>;
}

const optionalColumn = (definition: AccountColumnDefinition): AccountColumnDefinition => ({
  ...definition,
  optional: true,
  defaultVisible: false,
});

export const ACCOUNT_COLUMN_DEFINITIONS: AccountColumnDefinition[] = [
  {
    id: 'accountName',
    label: 'Account',
    minWidth: 220,
    defaultWidth: 240,
    renderCell: renderAccountCell,
  },
  {
    id: 'accountType',
    label: 'Type',
    minWidth: 150,
    defaultWidth: 180,
    valueAccessor: (account) => account.accountType ?? '—',
  },
  {
    id: 'currentBalance',
    label: 'Current Balance',
    minWidth: 180,
    defaultWidth: 200,
    align: 'right',
    valueAccessor: (account) => renderBalanceCell(account.currentBalance),
  },
  {
    id: 'status',
    label: 'Status',
    minWidth: 140,
    defaultWidth: 160,
    renderCell: renderStatusBadge,
  },
  optionalColumn({
    id: 'openingBalance',
    label: 'Opening Balance',
    minWidth: 180,
    defaultWidth: 200,
    align: 'right',
    valueAccessor: (account) => renderBalanceCell(account.openingBalance),
  }),
  optionalColumn({
    id: 'totalIn',
    label: 'Total In',
    minWidth: 170,
    defaultWidth: 200,
    align: 'right',
    valueAccessor: (account) => renderBalanceCell(account.totalIn),
  }),
  optionalColumn({
    id: 'totalOut',
    label: 'Total Out',
    minWidth: 170,
    defaultWidth: 200,
    align: 'right',
    valueAccessor: (account) => renderBalanceCell(account.totalOut),
  }),
  optionalColumn({
    id: 'notes',
    label: 'Notes',
    minWidth: 220,
    defaultWidth: 260,
    valueAccessor: (account) => account.notes ?? '—',
  }),
];
