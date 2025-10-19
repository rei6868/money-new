import { type ColumnDefinition, type TransactionMeta } from './transactions.types';

const AVAILABLE_COLUMNS: ColumnDefinition[] = [
  { id: 'date', label: 'Date', minWidth: 132, defaultWidth: 132 },
  { id: 'type', label: 'Type', minWidth: 132, defaultWidth: 132 },
  { id: 'account', label: 'Account', minWidth: 182, defaultWidth: 182 },
  { id: 'shop', label: 'Shop', minWidth: 180, defaultWidth: 196 },
  { id: 'notes', label: 'Notes', minWidth: 240, defaultWidth: 260 },
  { id: 'amount', label: 'Amount', minWidth: 150, defaultWidth: 160, align: 'right' },
  { id: 'percentBack', label: '% Back', minWidth: 120, defaultWidth: 132, align: 'right' },
  { id: 'fixedBack', label: 'Fix Back', minWidth: 140, defaultWidth: 150, align: 'right' },
  { id: 'totalBack', label: 'Total Back', minWidth: 170, defaultWidth: 190, align: 'right' },
  { id: 'finalPrice', label: 'Final Price', minWidth: 160, defaultWidth: 180, align: 'right' },
  { id: 'debtTag', label: 'Debt Tag', minWidth: 160, defaultWidth: 170 },
  { id: 'cycleTag', label: 'Cycle Tag', minWidth: 150, defaultWidth: 160, defaultVisible: false },
  { id: 'category', label: 'Category', minWidth: 150, defaultWidth: 160 },
  { id: 'linkedTxn', label: 'Linked TXN', minWidth: 160, defaultWidth: 176, defaultVisible: false },
  { id: 'owner', label: 'Owner', minWidth: 130, defaultWidth: 140 },
  { id: 'id', label: 'ID', minWidth: 180, defaultWidth: 200, defaultVisible: false },
];

const TRANSACTION_META: TransactionMeta = {
  availableColumns: AVAILABLE_COLUMNS,
  stickyColumns: { left: ['date', 'shop'], right: ['amount', 'finalPrice'] },
  availableActions: [
    {
      id: 'quickEdit',
      label: 'Quick Edit',
      scope: 'row',
      requiresSelection: true,
      description: 'Update transaction notes, category, or owner inline.',
    },
    {
      id: 'delete',
      label: 'Delete',
      scope: 'row',
      requiresSelection: true,
      description: 'Delete a single transaction.',
    },
    {
      id: 'bulkDelete',
      label: 'Bulk Delete',
      scope: 'bulk',
      requiresSelection: true,
      description: 'Delete all selected transactions in a single operation.',
    },
    {
      id: 'syncSelection',
      label: 'Selection Summary',
      scope: 'bulk',
      requiresSelection: true,
      description: 'Calculate total amount, cashback, and net for selected rows.',
    },
    {
      id: 'syncPermissions',
      label: 'Sync Permissions',
      scope: 'bulk',
      requiresSelection: false,
      description: 'Refresh the action permissions for the current user.',
    },
  ],
  fieldMapping: {
    id: 'id',
    date: 'occurredOn',
    displayDate: 'displayDate',
    type: 'type',
    account: 'account',
    shop: 'shop',
    notes: 'notes',
    amount: 'amount',
    percentBack: 'percentBack',
    fixedBack: 'fixedBack',
    totalBack: 'totalBack',
    finalPrice: 'finalPrice',
    debtTag: 'debtTag',
    cycleTag: 'cycleTag',
    category: 'category',
    linkedTxn: 'linkedTxn',
    owner: 'owner',
  },
  formatSettings: {
    currency: {
      locale: 'en-US',
      currency: 'USD',
      minimumFractionDigits: 2,
    },
    date: {
      locale: 'en-US',
      options: { year: 'numeric', month: 'short', day: '2-digit' },
    },
  },
  pagination: {
    defaultPageSize: 25,
    maxPageSize: 200,
  },
};

export function getTransactionMeta(): TransactionMeta {
  return TRANSACTION_META;
}
