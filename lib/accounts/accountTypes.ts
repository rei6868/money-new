/**
 * Account type enum values matching backend schema exactly.
 * Source: src/db/schema/accounts.ts - accountTypeEnum
 */
export const ACCOUNT_TYPE_VALUES = {
  BANK: 'bank',
  CREDIT: 'credit',
  SAVING: 'saving',
  INVEST: 'invest',
  E_WALLET: 'e-wallet',
  GROUP: 'group',
  LOAN: 'loan',
  MORTGAGE: 'mortgage',
  CASH: 'cash',
  OTHER: 'other',
} as const;

export type AccountTypeValue = (typeof ACCOUNT_TYPE_VALUES)[keyof typeof ACCOUNT_TYPE_VALUES];

/**
 * Human-readable labels for account types (frontend display only).
 * Backend operations must use the exact enum values from ACCOUNT_TYPE_VALUES.
 */
const ACCOUNT_TYPE_LABELS: Record<AccountTypeValue, string> = {
  bank: 'Bank',
  credit: 'Credit Card',
  saving: 'Savings',
  invest: 'Investment',
  'e-wallet': 'E-Wallet',
  group: 'Group',
  loan: 'Loan',
  mortgage: 'Mortgage',
  cash: 'Cash',
  other: 'Other',
};

/**
 * Color mapping for account type tabs and UI elements.
 */
export const ACCOUNT_TYPE_COLORS: Record<AccountTypeValue, string> = {
  bank: 'indigo',
  credit: 'danger',
  saving: 'teal',
  invest: 'orange',
  'e-wallet': 'purple',
  group: 'blue',
  loan: 'amber',
  mortgage: 'rose',
  cash: 'success',
  other: 'gray',
};

/**
 * Get human-readable label for an account type.
 * @param value - Account type enum value from backend
 * @returns Display label for frontend
 */
export function getAccountTypeLabel(value: AccountTypeValue | null | undefined): string {
  if (!value) {
    return ACCOUNT_TYPE_LABELS[ACCOUNT_TYPE_VALUES.OTHER];
  }
  return ACCOUNT_TYPE_LABELS[value] ?? ACCOUNT_TYPE_LABELS[ACCOUNT_TYPE_VALUES.OTHER];
}

/**
 * Get all account type options for dropdowns/selects.
 * Returns backend enum values with frontend labels.
 */
export function getAccountTypeOptions(): { value: AccountTypeValue; label: string }[] {
  return [
    ACCOUNT_TYPE_VALUES.BANK,
    ACCOUNT_TYPE_VALUES.CREDIT,
    ACCOUNT_TYPE_VALUES.SAVING,
    ACCOUNT_TYPE_VALUES.INVEST,
    ACCOUNT_TYPE_VALUES.E_WALLET,
    ACCOUNT_TYPE_VALUES.CASH,
    ACCOUNT_TYPE_VALUES.LOAN,
    ACCOUNT_TYPE_VALUES.MORTGAGE,
    ACCOUNT_TYPE_VALUES.GROUP,
    ACCOUNT_TYPE_VALUES.OTHER,
  ].map((value) => ({ value, label: getAccountTypeLabel(value) }));
}

/**
 * Account status enum values matching backend schema.
 * Source: src/db/schema/accounts.ts - accountStatusEnum
 */
export const ACCOUNT_STATUS_VALUES = {
  ACTIVE: 'active',
  CLOSED: 'closed',
  ARCHIVED: 'archived',
} as const;

export type AccountStatusValue =
  (typeof ACCOUNT_STATUS_VALUES)[keyof typeof ACCOUNT_STATUS_VALUES];

/**
 * Human-readable labels for account status.
 */
const ACCOUNT_STATUS_LABELS: Record<AccountStatusValue, string> = {
  active: 'Active',
  closed: 'Closed',
  archived: 'Archived',
};

/**
 * Get human-readable label for an account status.
 */
export function getAccountStatusLabel(value: AccountStatusValue | null | undefined): string {
  if (!value) {
    return ACCOUNT_STATUS_LABELS[ACCOUNT_STATUS_VALUES.ACTIVE];
  }
  return ACCOUNT_STATUS_LABELS[value] ?? ACCOUNT_STATUS_LABELS[ACCOUNT_STATUS_VALUES.ACTIVE];
}

/**
 * Get all account status options for dropdowns/selects.
 */
export function getAccountStatusOptions(): { value: AccountStatusValue; label: string }[] {
  return [
    ACCOUNT_STATUS_VALUES.ACTIVE,
    ACCOUNT_STATUS_VALUES.CLOSED,
    ACCOUNT_STATUS_VALUES.ARCHIVED,
  ].map((value) => ({ value, label: getAccountStatusLabel(value) }));
}

