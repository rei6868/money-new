// lib/accounts/accounts.types.ts
// TypeScript types and interfaces for Accounts module

export type AccountType = 'account' | 'cc' | 'emoney' | 'paylater' | 'investment' | 'other';
export type AccountStatus = 'active' | 'closed' | 'frozen' | 'pending';

/**
 * Core Account interface matching Neon database schema
 */
export interface Account {
  account_id: string; // UUID, PRIMARY KEY
  account_name: string; // VARCHAR(120), NOT NULL
  img_url?: string; // TEXT, nullable - Cloudinary URL
  account_type: AccountType; // ENUM, NOT NULL
  owner_id: string; // VARCHAR(36), FK -> people.person_id
  parent_account_id?: string; // VARCHAR(36), FK -> accounts.account_id (self-reference)
  asset_ref?: string; // VARCHAR(36), FK -> assets.asset_id
  opening_balance: number; // NUMERIC(18,2), NOT NULL
  current_balance: number; // NUMERIC(18,2), NOT NULL
  status: AccountStatus; // ENUM, NOT NULL
  total_in: number; // NUMERIC(18,2), NOT NULL, DEFAULT '0'
  total_out: number; // NUMERIC(18,2), NOT NULL, DEFAULT '0'
  created_at: string; // TIMESTAMP, DEFAULT now()
  updated_at: string; // TIMESTAMP, DEFAULT now()
  notes?: string; // TEXT, nullable
}

/**
 * Payload for creating new account (POST /api/accounts)
 */
export interface NewAccount {
  account_name: string;
  account_type: AccountType;
  owner_id: string;
  opening_balance: number;
  status: AccountStatus;
  img_url?: string;
  parent_account_id?: string;
  asset_ref?: string;
  notes?: string;
}

/**
 * Payload for updating account (PUT/PATCH /api/accounts/:id)
 */
export interface UpdateAccount {
  account_name?: string;
  account_type?: AccountType;
  owner_id?: string;
  opening_balance?: number;
  current_balance?: number;
  status?: AccountStatus;
  img_url?: string;
  parent_account_id?: string;
  asset_ref?: string;
  notes?: string;
}

/**
 * Account with extended data (for UI display)
 */
export interface AccountWithOwner extends Account {
  owner_name?: string; // Joined from people.full_name
  parent_account_name?: string; // Joined from parent account
  asset_name?: string; // Joined from assets table
}

/**
 * Card view data structure
 */
export interface AccountCard {
  account_id: string;
  account_name: string;
  account_type: AccountType;
  current_balance: number;
  img_url?: string;
  status: AccountStatus;
  deadline?: string; // Optional: for paylater/cc billing cycle
}

/**
 * Quick action button configuration
 */
export interface QuickAction {
  type: 'income' | 'expense' | 'transfer' | 'debt';
  label: string;
  icon: string;
  enabled: boolean; // Based on account_type
  handler: () => void;
}

/**
 * API Response types
 */
export interface AccountsResponse {
  accounts: Account[];
  total: number;
}

export interface AccountResponse {
  account: Account;
}

/**
 * Table column configuration
 */
export interface AccountColumn {
  id: string;
  label: string;
  visible: boolean;
  sortable: boolean;
  width?: string;
}

/**
 * Filter and sort state
 */
export interface AccountFilters {
  search?: string;
  account_type?: AccountType[];
  status?: AccountStatus[];
  owner_id?: string;
}

export interface AccountSortState {
  column: string;
  direction: 'asc' | 'desc';
}

/**
 * Pagination state
 */
export interface PaginationState {
  page: number;
  pageSize: number;
  totalPages: number;
  totalRows: number;
}
