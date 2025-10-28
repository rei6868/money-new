export const TRANSACTION_TYPE_VALUES = {
  INCOME: 'income',
  EXPENSES: 'expenses',
  TRANSFER: 'transfer',
  DEBT: 'debt',
  CASHBACK: 'cashback',
  ADJUSTMENT: 'adjustment',
  OTHER: 'other',
} as const;

export type TransactionTypeValue =
  (typeof TRANSACTION_TYPE_VALUES)[keyof typeof TRANSACTION_TYPE_VALUES];

const LABELS: Record<TransactionTypeValue, string> = {
  income: 'Income',
  expenses: 'Expenses',
  transfer: 'Transfer',
  debt: 'Debt',
  cashback: 'Cashback',
  adjustment: 'Adjustment',
  other: 'Other',
};

const TYPE_SYNONYMS = new Map<string, TransactionTypeValue>([
  ['income', 'income'],
  ['inflow', 'income'],
  ['earnings', 'income'],
  ['revenue', 'income'],
  ['salary', 'income'],
  ['expense', 'expenses'],
  ['expenses', 'expenses'],
  ['spend', 'expenses'],
  ['spending', 'expenses'],
  ['outflow', 'expenses'],
  ['transfer', 'transfer'],
  ['moved', 'transfer'],
  ['movement', 'transfer'],
  ['debt', 'debt'],
  ['loan', 'debt'],
  ['liability', 'debt'],
  ['cashback', 'cashback'],
  ['reward', 'cashback'],
  ['rebate', 'cashback'],
  ['adjustment', 'adjustment'],
  ['adjust', 'adjustment'],
  ['balance', 'adjustment'],
  ['other', 'other'],
]);

function sanitize(raw: unknown): string {
  if (typeof raw === 'string') {
    return raw.trim().toLowerCase();
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return String(raw);
  }
  return '';
}

export function normalizeTransactionType(raw: unknown): TransactionTypeValue {
  const sanitized = sanitize(raw);
  if (!sanitized) {
    return TRANSACTION_TYPE_VALUES.OTHER;
  }

  if (TYPE_SYNONYMS.has(sanitized)) {
    return TYPE_SYNONYMS.get(sanitized) ?? TRANSACTION_TYPE_VALUES.OTHER;
  }

  const compact = sanitized.replace(/[^a-z]/g, '');
  if (TYPE_SYNONYMS.has(compact)) {
    return TYPE_SYNONYMS.get(compact) ?? TRANSACTION_TYPE_VALUES.OTHER;
  }

  return (TYPE_SYNONYMS.get(sanitized.split(' ')[0]) ?? TRANSACTION_TYPE_VALUES.OTHER);
}

export function getTransactionTypeLabel(value: TransactionTypeValue | null | undefined): string {
  if (!value) {
    return LABELS[TRANSACTION_TYPE_VALUES.OTHER];
  }
  return LABELS[value] ?? LABELS[TRANSACTION_TYPE_VALUES.OTHER];
}

export function getTransactionTypeOptions(): { value: TransactionTypeValue; label: string }[] {
  return [
    TRANSACTION_TYPE_VALUES.INCOME,
    TRANSACTION_TYPE_VALUES.EXPENSES,
    TRANSACTION_TYPE_VALUES.TRANSFER,
    TRANSACTION_TYPE_VALUES.DEBT,
    TRANSACTION_TYPE_VALUES.CASHBACK,
    TRANSACTION_TYPE_VALUES.ADJUSTMENT,
  ].map((value) => ({ value, label: getTransactionTypeLabel(value) }));
}
