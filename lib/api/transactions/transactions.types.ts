import type { NextApiRequest } from 'next';

export type SortDirection = 'asc' | 'desc';

export interface SortDescriptor {
  id: string;
  direction: SortDirection;
}

export interface DateRangeFilter {
  from: string | null;
  to: string | null;
}

export interface TransactionFilters {
  owners: string[];
  categories: string[];
  types: string[];
  debtTags: string[];
  accounts: string[];
  months: string[];
  years: string[];
  searchTags: string[];
  dateRange: DateRangeFilter | null;
}

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

export interface TransactionFilterOptions {
  owners: string[];
  categories: string[];
  types: string[];
  debtTags: string[];
  accounts: string[];
  months: string[];
  years: string[];
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
  sort: SortDescriptor[];
  filters: TransactionFilters;
  pagination: PaginationParams;
  quickFilterId: string | null;
}

export interface TransactionRestorePayload {
  token: string;
  state: TransactionTableState;
}

export interface QuickFilterPreset {
  id: string;
  label: string;
  description?: string;
  filters?: Partial<TransactionFilters>;
  searchTerm?: string;
  sort?: SortDescriptor[];
  matchCount?: number;
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
  sortable: boolean;
  dataType: 'string' | 'number' | 'date';
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
  defaultSort: SortDescriptor[];
  defaultFilters: TransactionFilters;
  availableActions: TransactionActionDefinition[];
  quickFilterOptions: QuickFilterPreset[];
  fieldMapping: Record<string, string>;
  formatSettings: FormatSettings;
  pagination: { defaultPageSize: number; maxPageSize: number };
}

export interface TransactionTableResponse {
  rows: TransactionRecord[];
  pagination: PaginationInfo;
  totals: TransactionTotals;
  sort: SortDescriptor[];
  filters: {
    applied: TransactionFilters;
    options: TransactionFilterOptions;
  };
  searchTerm: string;
  quickFilterId: string | null;
  meta: TransactionMeta;
  restore: TransactionRestorePayload;
  generatedAt: string;
  execution: { durationMs: number };
}

export interface TransactionsTableRequest
  extends Partial<Omit<TransactionTableState, 'filters'>> {
  filters?: Partial<TransactionFilters>;
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
    sort?: string | string[];
    quickFilterId?: string | string[];
  };
};
