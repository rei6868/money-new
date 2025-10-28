export type FilterValue = string;

export type DateRangeFilter = {
  start: string | null;
  end: string | null;
};

export type TableFilters = {
  accounts: FilterValue[];
  people: FilterValue[];
  debtTags: FilterValue[];
  categories: FilterValue[];
  dateRange: DateRangeFilter;
  type?: FilterValue | null;
};

export type FilterOption = {
  label: string;
  value: FilterValue;
  description?: string;
};

export type FilterOptionGroup = {
  id: keyof Omit<TableFilters, 'dateRange'>;
  label: string;
  options: FilterOption[];
  allowMultiple?: boolean;
};

export type FilterAnalytics = {
  resultCount: number;
  totals?: {
    amount?: number;
    income?: number;
    expenses?: number;
    balance?: number;
  };
};

export function createEmptyFilters(): TableFilters {
  return {
    accounts: [],
    people: [],
    debtTags: [],
    categories: [],
    dateRange: { start: null, end: null },
    type: null,
  };
}

export function hasActiveFilters(filters: TableFilters, searchQuery: string): boolean {
  if (searchQuery.trim().length > 0) {
    return true;
  }

  if (filters.type) {
    return true;
  }

  if (filters.dateRange.start || filters.dateRange.end) {
    return true;
  }

  return (
    filters.accounts.length > 0 ||
    filters.people.length > 0 ||
    filters.debtTags.length > 0 ||
    filters.categories.length > 0
  );
}

export function isSameFilterOption(left: FilterOption, right: FilterOption): boolean {
  return left.value === right.value;
}

export function formatDateRange(range: DateRangeFilter): string | null {
  const { start, end } = range;
  if (!start && !end) {
    return null;
  }
  if (start && end) {
    return `${start} → ${end}`;
  }
  return start ? `From ${start}` : `Until ${end}`;
}
