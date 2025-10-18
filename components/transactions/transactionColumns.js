export const TRANSACTION_COLUMN_DEFINITIONS = [
  {
    id: 'date',
    label: 'Date',
    minWidth: 132,
    defaultWidth: 132,
    defaultFormat: 'DD/MM/YY',
    formatOptions: ['DD/MM/YY', 'MM/DD/YY', 'YYYY-MM-DD'],
  },
  {
    id: 'type',
    label: 'Type',
    minWidth: 132,
    defaultWidth: 132,
  },
  {
    id: 'account',
    label: 'Account',
    minWidth: 182,
    defaultWidth: 182,
  },
  {
    id: 'owner',
    label: 'Owner',
    minWidth: 130,
    defaultWidth: 140,
  },
  {
    id: 'shop',
    label: 'Shop',
    minWidth: 180,
    defaultWidth: 196,
  },
  {
    id: 'notes',
    label: 'Notes',
    minWidth: 240,
    defaultWidth: 260,
  },
  {
    id: 'amount',
    label: 'Amount',
    minWidth: 150,
    defaultWidth: 160,
    align: 'right',
  },
  {
    id: 'percentBack',
    label: '% Back',
    minWidth: 120,
    defaultWidth: 132,
    align: 'right',
  },
  {
    id: 'fixedBack',
    label: 'Fix Back',
    minWidth: 140,
    defaultWidth: 150,
    align: 'right',
  },
  {
    id: 'totalBack',
    label: 'Total Back',
    minWidth: 170,
    defaultWidth: 190,
    align: 'right',
  },
  {
    id: 'finalPrice',
    label: 'Final Price',
    minWidth: 160,
    defaultWidth: 180,
    align: 'right',
  },
  {
    id: 'debtTag',
    label: 'Debt Tag',
    minWidth: 160,
    defaultWidth: 170,
  },
  {
    id: 'cycleTag',
    label: 'Cycle Tag',
    minWidth: 150,
    defaultWidth: 160,
    defaultVisible: false,
  },
  {
    id: 'category',
    label: 'Category',
    minWidth: 150,
    defaultWidth: 160,
  },
  {
    id: 'linkedTxn',
    label: 'Linked TXN',
    minWidth: 160,
    defaultWidth: 176,
    defaultVisible: false,
  },
  {
    id: 'id',
    label: 'ID',
    minWidth: 180,
    defaultWidth: 200,
    defaultVisible: false,
  },
];

export function getDefaultColumnState() {
  return TRANSACTION_COLUMN_DEFINITIONS.map((definition, index) => ({
    id: definition.id,
    width: definition.defaultWidth,
    visible: definition.defaultVisible !== false,
    order: index,
    format: definition.defaultFormat,
  }));
}
export {
  TRANSACTION_COLUMN_DEFINITIONS,
  getDefaultColumnState,
  DEFAULT_TRANSACTION_SORT,
  MANDATORY_TRANSACTION_COLUMNS,
} from '../../lib/transactions/columns';
