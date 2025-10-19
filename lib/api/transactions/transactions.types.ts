import type { NextApiRequest } from 'next';

export interface TransactionRecord {
  id: string;
  date: string;
  occurredOn: string;
  displayDate: string;
  sortDate: number;
  year: string;
  month: string;
  account: string;
  shop: string;
  notes: string;
  amount: number;
  percentBack: number;
  fixedBack: number;
  totalBack: number;
  finalPrice: number;
  debtTag: string;
  cycleTag: string;
  category: string;
  linkedTxn: string;
  owner: string;
  type: string;
  amountDirection: 'credit' | 'debit';
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginationInfo extends PaginationParams {
  totalRows: number;
  totalPages: number;
}

export interface TransactionTotals {
  count: number;
  amount: number;
  totalBack: number;
  finalPrice: number;
}

export interface TransactionTableState {
  searchTerm: string;
  pagination: PaginationParams;
  sort: TransactionSortState;
}

export interface TransactionRestorePayload {
  token: string;
  state: TransactionTableState;
}

export interface TransactionActionDefinition {
  id: string;
  label: string;
  scope: 'row' | 'bulk';
  requiresSelection: boolean;
  description: string;
}

export interface ColumnDefinition {
  id: string;
  label: string;
  minWidth: number;
  defaultWidth: number;
  align?: 'left' | 'center' | 'right';
  defaultVisible?: boolean;
}

export interface CurrencyFormatSettings {
  locale: string;
  currency: string;
  minimumFractionDigits: number;
}

export interface DateFormatSettings {
  locale: string;
  options: Intl.DateTimeFormatOptions;
}

export interface FormatSettings {
  currency: CurrencyFormatSettings;
  date: DateFormatSettings;
}

export interface TransactionMeta {
  availableColumns: ColumnDefinition[];
  stickyColumns: { left: string[]; right: string[] };
  availableActions: TransactionActionDefinition[];
  fieldMapping: Record<string, string>;
  formatSettings: FormatSettings;
  pagination: { defaultPageSize: number; maxPageSize: number };
}

export interface TransactionTableResponse {
  rows: TransactionRecord[];
  pagination: PaginationInfo;
  totals: TransactionTotals;
  searchTerm: string;
  meta: TransactionMeta;
  restore: TransactionRestorePayload;
  generatedAt: string;
  execution: { durationMs: number };
}

export interface TransactionsTableRequest {
  searchTerm?: string;
  pagination?: Partial<PaginationParams>;
  sortBy?: string | null;
  sortDir?: SortDirection | null;
}

export type SortDirection = 'asc' | 'desc';

export interface TransactionSortState {
  columnId: string | null;
  direction: SortDirection | null;
}

export interface TransactionActionRequest {
  action: 'quickEdit' | 'delete' | 'bulkDelete' | 'syncSelection' | 'syncPermissions';
  payload?: Record<string, unknown>;
}

export interface TransactionActionResponse {
  status: 'success' | 'error';
  message: string;
  updatedRow?: TransactionRecord;
  removedIds?: string[];
  summary?: TransactionTotals;
  permissions?: string[];
}

export type TransactionApiRequest = NextApiRequest & {
  query: NextApiRequest['query'] & {
    page?: string | string[];
    pageSize?: string | string[];
  };
};
