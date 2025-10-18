import {
  type ColumnDefinition,
  type QuickFilterPreset,
  type TransactionFilters,
  type TransactionMeta,
} from './transactions.types';

const DEFAULT_FILTERS: TransactionFilters = {
  owners: [],
  categories: [],
  types: [],
  debtTags: [],
  accounts: [],
  months: [],
  years: [],
  searchTags: [],
  dateRange: null,
};

const AVAILABLE_COLUMNS: ColumnDefinition[] = [
  { id: 'date', label: 'Date', minWidth: 132, defaultWidth: 132, sortable: true, dataType: 'date' },
  { id: 'type', label: 'Type', minWidth: 132, defaultWidth: 132, sortable: true, dataType: 'string' },
  { id: 'account', label: 'Account', minWidth: 182, defaultWidth: 182, sortable: true, dataType: 'string' },
  { id: 'shop', label: 'Shop', minWidth: 180, defaultWidth: 196, sortable: true, dataType: 'string' },
  { id: 'notes', label: 'Notes', minWidth: 240, defaultWidth: 260, sortable: true, dataType: 'string' },
  {
    id: 'amount',
    label: 'Amount',
    minWidth: 150,
    defaultWidth: 160,
    align: 'right',
    sortable: true,
    dataType: 'number',
  },
  {
    id: 'percentBack',
    label: '% Back',
    minWidth: 120,
    defaultWidth: 132,
    align: 'right',
    sortable: true,
    dataType: 'number',
  },
  {
    id: 'fixedBack',
    label: 'Fix Back',
    minWidth: 140,
    defaultWidth: 150,
    align: 'right',
    sortable: true,
    dataType: 'number',
  },
  {
    id: 'totalBack',
    label: 'Total Back',
    minWidth: 170,
    defaultWidth: 190,
    align: 'right',
    sortable: true,
    dataType: 'number',
  },
  {
    id: 'finalPrice',
    label: 'Final Price',
    minWidth: 160,
    defaultWidth: 180,
    align: 'right',
    sortable: true,
    dataType: 'number',
  },
  { id: 'debtTag', label: 'Debt Tag', minWidth: 160, defaultWidth: 170, sortable: true, dataType: 'string' },
  {
    id: 'cycleTag',
    label: 'Cycle Tag',
    minWidth: 150,
    defaultWidth: 160,
    sortable: true,
    dataType: 'string',
    defaultVisible: false,
  },
  { id: 'category', label: 'Category', minWidth: 150, defaultWidth: 160, sortable: true, dataType: 'string' },
  {
    id: 'linkedTxn',
    label: 'Linked TXN',
    minWidth: 160,
    defaultWidth: 176,
    sortable: true,
    dataType: 'string',
    defaultVisible: false,
  },
  { id: 'owner', label: 'Owner', minWidth: 130, defaultWidth: 140, sortable: true, dataType: 'string' },
  {
    id: 'id',
    label: 'ID',
    minWidth: 180,
    defaultWidth: 200,
    sortable: true,
    dataType: 'string',
    defaultVisible: false,
  },
];

const QUICK_FILTER_PRESETS: QuickFilterPreset[] = [
  {
    id: 'recent-expenses',
    label: 'Recent Expenses',
    description: 'Expense transactions from the last 30 days',
    filters: { types: ['Expense'], searchTags: ['recent-expenses'] },
  },
  {
    id: 'cashback-only',
    label: 'Cashback Credits',
    description: 'Only show cashback income entries',
    filters: { categories: ['Cashback'], types: ['Income'] },
  },
  {
    id: 'high-value',
    label: 'High Value Purchases',
    description: 'Expenses above $500',
    filters: { types: ['Expense'], searchTags: ['high-value'] },
  },
];

const TRANSACTION_META: TransactionMeta = {
  availableColumns: AVAILABLE_COLUMNS,
  stickyColumns: { left: ['date', 'shop'], right: ['amount', 'finalPrice'] },
  defaultSort: [{ id: 'date', direction: 'desc' }],
  defaultFilters: DEFAULT_FILTERS,
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
  quickFilterOptions: QUICK_FILTER_PRESETS,
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
  return JSON.parse(JSON.stringify(TRANSACTION_META));
}

export function getDefaultFilters(): TransactionFilters {
  return JSON.parse(JSON.stringify(DEFAULT_FILTERS));
}

export function getQuickFilterPresets(): QuickFilterPreset[] {
  return TRANSACTION_META.quickFilterOptions.map((preset) => ({ ...preset }));
}

export function getColumnDefinition(columnId: string): ColumnDefinition | undefined {
  return AVAILABLE_COLUMNS.find((column) => column.id === columnId);
}
