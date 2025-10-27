import React from 'react';

import { formatAmountWithTrailing } from '../../lib/numberFormat';
import styles from '../../styles/accounts.module.css';

export type AccountRow = {
  accountId: string;
  accountName: string;
  accountType: string;
  ownerId: string;
  ownerName?: string | null;
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
  id: keyof AccountRow | 'owner';
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
    return styles.statusActive;
  }
  if (normalized === 'pending' || normalized === 'pending-activation') {
    return styles.statusPending;
  }
  if (
    normalized === 'void' ||
    normalized === 'canceled' ||
    normalized === 'closed' ||
    normalized === 'archived'
  ) {
    return styles.statusInactive;
  }
  return styles.statusNeutral;
}

function renderStatusBadge(account: AccountRow) {
  const status = account.status ?? '--';
  const className = `${styles.statusBadge} ${getStatusClass(status)}`.trim();
  return <span className={className}>{status || '--'}</span>;
}

function renderAccountCell(account: AccountRow) {
  return (
    <div>
      <div>{account.accountName ?? '—'}</div>
      <div className={styles.columnSubline}>{account.accountType ?? '—'}</div>
    </div>
  );
}

function renderOwnerCell(account: AccountRow) {
  const owner = account.ownerName ?? account.ownerId ?? '—';
  return (
    <div>
      <div>{owner || '—'}</div>
      {account.notes ? <div className={styles.columnSubline}>{account.notes}</div> : null}
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
    id: 'owner',
    label: 'Owner',
    minWidth: 200,
    defaultWidth: 220,
    renderCell: renderOwnerCell,
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
    defaultWidth: 190,
    align: 'right',
    valueAccessor: (account) => renderBalanceCell(account.totalIn),
  }),
  optionalColumn({
    id: 'totalOut',
    label: 'Total Out',
    minWidth: 170,
    defaultWidth: 190,
    align: 'right',
    valueAccessor: (account) => renderBalanceCell(account.totalOut),
  }),
  optionalColumn({
    id: 'parentAccountId',
    label: 'Parent Account',
    minWidth: 200,
    defaultWidth: 220,
    valueAccessor: (account) => account.parentAccountId ?? '—',
  }),
  {
    id: 'notes',
    label: 'Notes',
    minWidth: 260,
    defaultWidth: 280,
    valueAccessor: (account) => account.notes ?? '—',
  },
];

export function createDefaultColumnState(definitions: AccountColumnDefinition[] = ACCOUNT_COLUMN_DEFINITIONS) {
  return definitions.map((definition, index) => {
    const minWidth = Number.isFinite(definition.minWidth) ? definition.minWidth : 160;
    const defaultWidth = Number.isFinite(definition.defaultWidth)
      ? definition.defaultWidth
      : minWidth;
    return {
      id: definition.id,
      width: Math.max(defaultWidth, minWidth),
      visible: definition.defaultVisible !== false,
      order: index,
      optional: Boolean(definition.optional),
    };
  });
}

export const ACCOUNT_SORTERS: Record<string, (account: AccountRow) => string | number> = {
  accountName: (account) => account.accountName.toLowerCase(),
  accountType: (account) => account.accountType.toLowerCase(),
  owner: (account) => (account.ownerName ?? account.ownerId ?? '').toLowerCase(),
  currentBalance: (account) => account.currentBalance,
  openingBalance: (account) => account.openingBalance,
  totalIn: (account) => account.totalIn,
  totalOut: (account) => account.totalOut,
  status: (account) => (account.status ?? '').toLowerCase(),
  notes: (account) => (account.notes ?? '').toLowerCase(),
  parentAccountId: (account) => (account.parentAccountId ?? '').toLowerCase(),
};
