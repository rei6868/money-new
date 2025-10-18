import { getQuickFilterPresets } from './transactions.meta';
import {
  type DateRangeFilter,
  type QuickFilterPreset,
  type SortDescriptor,
  type TransactionFilterOptions,
  type TransactionFilters,
  type TransactionRecord,
} from './transactions.types';

const SEARCHABLE_FIELDS: Array<keyof TransactionRecord> = [
  'id',
  'notes',
  'shop',
  'account',
  'category',
  'owner',
  'debtTag',
  'cycleTag',
  'linkedTxn',
];

function ensureArray(value: unknown): string[] {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((piece) => piece.trim())
      .filter((piece) => piece.length > 0);
  }
  return [];
}

function normalizeDate(date: unknown): string | null {
  if (typeof date !== 'string') {
    return null;
  }
  const trimmed = date.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString().slice(0, 10);
}

function normalizeDateRange(range?: Partial<DateRangeFilter> | null): DateRangeFilter | null {
  if (!range) {
    return null;
  }
  const from = normalizeDate(range.from ?? null);
  const to = normalizeDate(range.to ?? null);
  if (!from && !to) {
    return null;
  }
  return { from, to };
}

function uniqueSorted(values: string[], locale: string = 'en-US'): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, locale, { sensitivity: 'base', numeric: true }),
  );
}

const SPECIAL_TAG_PREDICATES: Record<string, (row: TransactionRecord) => boolean> = {
  'high-value': (row) => row.amount >= 500,
  'recent-expenses': (row) => {
    const THIRTY_DAYS_MS = 1000 * 60 * 60 * 24 * 30;
    const now = Date.now();
    return row.type === 'Expense' && now - row.sortDate <= THIRTY_DAYS_MS;
  },
};

export function normalizeFilters(partial?: Partial<TransactionFilters>): TransactionFilters {
  const filters: TransactionFilters = {
    owners: ensureArray(partial?.owners),
    categories: ensureArray(partial?.categories),
    types: ensureArray(partial?.types),
    debtTags: ensureArray(partial?.debtTags),
    accounts: ensureArray(partial?.accounts),
    months: ensureArray(partial?.months),
    years: ensureArray(partial?.years),
    searchTags: ensureArray(partial?.searchTags),
    dateRange: normalizeDateRange(partial?.dateRange ?? null),
  };

  return {
    ...filters,
    owners: uniqueSorted(filters.owners),
    categories: uniqueSorted(filters.categories),
    types: uniqueSorted(filters.types),
    debtTags: uniqueSorted(filters.debtTags),
    accounts: uniqueSorted(filters.accounts),
    months: uniqueSorted(filters.months),
    years: uniqueSorted(filters.years),
    searchTags: uniqueSorted(filters.searchTags),
  };
}

export function parseFiltersFromQuery(
  query: Record<string, string | string[] | undefined>,
): TransactionFilters {
  const owners = ensureArray(query.owner ?? query.owners);
  const categories = ensureArray(query.category ?? query.categories);
  const types = ensureArray(query.type ?? query.types);
  const debtTags = ensureArray(query.debtTag ?? query.debtTags);
  const accounts = ensureArray(query.account ?? query.accounts);
  const months = ensureArray(query.month ?? query.months);
  const years = ensureArray(query.year ?? query.years);
  const searchTags = ensureArray(query.tag ?? query.tags);
  const dateRange = normalizeDateRange({
    from: Array.isArray(query.from) ? query.from[0] : query.from,
    to: Array.isArray(query.to) ? query.to[0] : query.to,
  });

  return normalizeFilters({
    owners,
    categories,
    types,
    debtTags,
    accounts,
    months,
    years,
    searchTags,
    dateRange,
  });
}

function valueMatches(filters: string[], value: string | undefined): boolean {
  if (filters.length === 0) {
    return true;
  }
  if (!value) {
    return false;
  }
  return filters.includes(value);
}

function matchesDateRange(record: TransactionRecord, range: DateRangeFilter | null): boolean {
  if (!range) {
    return true;
  }
  const timestamp = record.sortDate;
  if (!Number.isFinite(timestamp)) {
    return false;
  }
  if (range.from) {
    const fromTs = new Date(`${range.from}T00:00:00Z`).getTime();
    if (timestamp < fromTs) {
      return false;
    }
  }
  if (range.to) {
    const toTs = new Date(`${range.to}T23:59:59Z`).getTime();
    if (timestamp > toTs) {
      return false;
    }
  }
  return true;
}

export function applyFilters(rows: TransactionRecord[], filters: TransactionFilters): TransactionRecord[] {
  return rows.filter((row) => {
    if (!valueMatches(filters.owners, row.owner)) {
      return false;
    }
    if (!valueMatches(filters.categories, row.category)) {
      return false;
    }
    if (!valueMatches(filters.types, row.type)) {
      return false;
    }
    if (!valueMatches(filters.debtTags, row.debtTag)) {
      return false;
    }
    if (!valueMatches(filters.accounts, row.account)) {
      return false;
    }
    if (!valueMatches(filters.months, row.month)) {
      return false;
    }
    if (!valueMatches(filters.years, row.year)) {
      return false;
    }
    if (!matchesDateRange(row, filters.dateRange)) {
      return false;
    }
    if (filters.searchTags.length > 0) {
      const matchesTag = filters.searchTags.some((tag) => {
        const normalizedTag = tag.toLowerCase();
        const predicate = SPECIAL_TAG_PREDICATES[normalizedTag];
        if (predicate) {
          return predicate(row);
        }
        const haystack = [row.debtTag, row.cycleTag, row.category, row.owner]
          .filter(Boolean)
          .map((value) => value.toLowerCase());
        return haystack.includes(normalizedTag);
      });
      if (!matchesTag) {
        return false;
      }
    }
    return true;
  });
}

export function applySearch(rows: TransactionRecord[], searchTerm: string): TransactionRecord[] {
  const normalized = searchTerm.trim().toLowerCase();
  if (!normalized) {
    return rows;
  }
  return rows.filter((row) =>
    SEARCHABLE_FIELDS.some((field) => String(row[field] ?? '').toLowerCase().includes(normalized)),
  );
}

export function buildFilterOptions(rows: TransactionRecord[]): TransactionFilterOptions {
  return {
    owners: uniqueSorted(rows.map((row) => row.owner)),
    categories: uniqueSorted(rows.map((row) => row.category)),
    types: uniqueSorted(rows.map((row) => row.type)),
    debtTags: uniqueSorted(rows.map((row) => row.debtTag)),
    accounts: uniqueSorted(rows.map((row) => row.account)),
    months: uniqueSorted(rows.map((row) => row.month)),
    years: uniqueSorted(rows.map((row) => row.year)),
  };
}

export function mergeFilters(
  base: TransactionFilters,
  overrides?: Partial<TransactionFilters> | null,
): TransactionFilters {
  if (!overrides) {
    return base;
  }
  const normalized = normalizeFilters(overrides);
  return {
    owners: normalized.owners.length > 0 ? normalized.owners : base.owners,
    categories: normalized.categories.length > 0 ? normalized.categories : base.categories,
    types: normalized.types.length > 0 ? normalized.types : base.types,
    debtTags: normalized.debtTags.length > 0 ? normalized.debtTags : base.debtTags,
    accounts: normalized.accounts.length > 0 ? normalized.accounts : base.accounts,
    months: normalized.months.length > 0 ? normalized.months : base.months,
    years: normalized.years.length > 0 ? normalized.years : base.years,
    searchTags: normalized.searchTags.length > 0 ? normalized.searchTags : base.searchTags,
    dateRange: normalized.dateRange ?? base.dateRange,
  };
}

export function resolveQuickFilter(
  quickFilterId: string | null,
  sort: SortDescriptor[],
): {
  quickFilterId: string | null;
  preset: QuickFilterPreset | null;
  sort: SortDescriptor[];
  filters?: Partial<TransactionFilters>;
  searchTerm?: string;
} {
  if (!quickFilterId) {
    return { quickFilterId: null, preset: null, sort };
  }
  const preset = getQuickFilterPresets().find((item) => item.id === quickFilterId) ?? null;
  if (!preset) {
    return { quickFilterId: null, preset: null, sort };
  }
  return {
    quickFilterId,
    preset,
    sort: preset.sort ?? sort,
    filters: preset.filters,
    searchTerm: preset.searchTerm,
  };
}
