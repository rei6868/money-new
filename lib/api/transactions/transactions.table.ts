import { performance } from 'node:perf_hooks';

import { loadTransactionDataset } from './transactions.dataset';
import {
  applyFilters,
  applySearch,
  buildFilterOptions,
  mergeFilters,
  normalizeFilters,
  resolveQuickFilter,
} from './transactions.filter';
import { getColumnDefinition, getTransactionMeta } from './transactions.meta';
import {
  createRestorePayload,
  getDefaultTableState,
  mergeStateWithRequest,
  mergeStateWithRestore,
} from './transactions.restore';
import {
  type SortDescriptor,
  type TransactionFilters,
  type TransactionMeta,
  type TransactionRecord,
  type TransactionTableResponse,
  type TransactionsTableRequest,
  type TransactionTotals,
} from './transactions.types';

function normalizeSort(sort: SortDescriptor[], meta: TransactionMeta): SortDescriptor[] {
  const sortableColumns = new Set(
    meta.availableColumns.filter((column) => column.sortable).map((column) => column.id),
  );
  const normalized = sort
    .map((item): SortDescriptor => ({
      id: item.id,
      direction: item.direction === 'desc' ? 'desc' : 'asc',
    }))
    .filter((item) => sortableColumns.has(item.id));
  if (normalized.length === 0) {
    return meta.defaultSort.map((item) => ({ ...item }));
  }
  return normalized;
}

function compareValues(a: unknown, b: unknown, dataType: string): number {
  if (a === b) {
    return 0;
  }
  if (a === undefined || a === null) {
    return -1;
  }
  if (b === undefined || b === null) {
    return 1;
  }
  switch (dataType) {
    case 'number':
      return Number(a) - Number(b);
    case 'date':
      return Number(a) - Number(b);
    default:
      return String(a).localeCompare(String(b), undefined, { sensitivity: 'base', numeric: true });
  }
}

function getRecordValue(record: TransactionRecord, accessor: string): unknown {
  if (accessor in record) {
    return record[accessor as keyof TransactionRecord];
  }
  return undefined;
}

function sortRows(rows: TransactionRecord[], sort: SortDescriptor[], meta: TransactionMeta): TransactionRecord[] {
  const descriptors = sort.map((descriptor) => {
    const column = getColumnDefinition(descriptor.id);
    const dataType = column?.dataType ?? 'string';
    const accessor = descriptor.id === 'date' ? 'sortDate' : descriptor.id;
    return {
      id: descriptor.id,
      direction: descriptor.direction === 'desc' ? -1 : 1,
      accessor,
      dataType,
    } as const;
  });
  return [...rows].sort((a, b) => {
    for (const descriptor of descriptors) {
      const result = compareValues(
        getRecordValue(a, descriptor.accessor),
        getRecordValue(b, descriptor.accessor),
        descriptor.dataType,
      );
      if (result !== 0) {
        return result * descriptor.direction;
      }
    }
    return 0;
  });
}

function paginateRows(
  rows: TransactionRecord[],
  page: number,
  pageSize: number,
): { rows: TransactionRecord[]; pagination: { page: number; pageSize: number; totalRows: number; totalPages: number } } {
  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * pageSize;
  const end = start + pageSize;
  return {
    rows: rows.slice(start, end),
    pagination: { page: safePage, pageSize, totalRows, totalPages },
  };
}

function calculateTotals(rows: TransactionRecord[]): TransactionTotals {
  return rows.reduce(
    (acc, row) => {
      acc.count += 1;
      acc.amount += row.amount;
      acc.totalBack += row.totalBack;
      acc.finalPrice += row.finalPrice;
      return acc;
    },
    { count: 0, amount: 0, totalBack: 0, finalPrice: 0 },
  );
}

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}

function buildQuickFilterSummaries(
  dataset: TransactionRecord[],
  baseFilters: TransactionFilters,
  baseSearch: string,
  baseSort: SortDescriptor[],
  meta: TransactionMeta,
): TransactionMeta['quickFilterOptions'] {
  return meta.quickFilterOptions.map((preset) => {
    const dynamicOverrides: Partial<TransactionFilters> = preset.filters ?? {};
    let overrides = dynamicOverrides;
    if (preset.id === 'recent-expenses') {
      const from = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString().slice(0, 10);
      overrides = { ...dynamicOverrides, dateRange: { from, to: null } };
    }
    const mergedFilters = mergeFilters(baseFilters, overrides);
    const searchTerm = preset.searchTerm ?? baseSearch;
    const sorted = sortRows(
      applySearch(applyFilters(dataset, mergedFilters), searchTerm ?? ''),
      normalizeSort(preset.sort ?? baseSort, meta),
      meta,
    );
    return {
      ...preset,
      filters: overrides,
      matchCount: sorted.length,
    };
  });
}

export async function getTransactionsTable(
  request: TransactionsTableRequest,
  restoreToken?: string | null,
): Promise<TransactionTableResponse> {
  const t0 = performance.now();
  const dataset = await loadTransactionDataset();
  const meta = getTransactionMeta();
  const defaultState = getDefaultTableState();
  const normalizedRequest: TransactionsTableRequest = {
    ...request,
    filters: request.filters ? normalizeFilters(request.filters) : undefined,
  };
  const state = restoreToken
    ? mergeStateWithRestore(restoreToken, normalizedRequest)
    : mergeStateWithRequest(normalizedRequest, defaultState);
  const resolvedQuickFilter = resolveQuickFilter(state.quickFilterId, state.sort);
  let workingFilters: TransactionFilters = state.filters;
  if (resolvedQuickFilter.filters) {
    let overrides: Partial<TransactionFilters> = resolvedQuickFilter.filters;
    if (resolvedQuickFilter.preset?.id === 'recent-expenses') {
      const from = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString().slice(0, 10);
      overrides = { ...overrides, dateRange: { from, to: null } };
    }
    workingFilters = mergeFilters(state.filters, overrides);
  }
  const searchTerm = resolvedQuickFilter.searchTerm ?? state.searchTerm ?? '';
  const appliedSort = normalizeSort(resolvedQuickFilter.sort, meta);
  const filteredRows = applyFilters(dataset, workingFilters);
  const searchedRows = applySearch(filteredRows, searchTerm);
  const sortedRows = sortRows(searchedRows, appliedSort, meta);
  const { rows, pagination } = paginateRows(sortedRows, state.pagination.page, state.pagination.pageSize);
  const totals = calculateTotals(searchedRows);
  const filterOptions = buildFilterOptions(dataset);
  const quickFilterOptions = buildQuickFilterSummaries(
    dataset,
    state.filters,
    state.searchTerm,
    state.sort,
    meta,
  );
  const restore = createRestorePayload({
    searchTerm,
    sort: appliedSort,
    filters: workingFilters,
    pagination,
    quickFilterId: resolvedQuickFilter.quickFilterId,
  });
  const execution = { durationMs: Number((performance.now() - t0).toFixed(2)) };
  const responseMeta: TransactionMeta = {
    ...meta,
    quickFilterOptions,
  };
  return {
    rows,
    pagination,
    totals: {
      count: totals.count,
      amount: roundCurrency(totals.amount),
      totalBack: roundCurrency(totals.totalBack),
      finalPrice: roundCurrency(totals.finalPrice),
    },
    sort: appliedSort,
    filters: { applied: workingFilters, options: filterOptions },
    searchTerm,
    quickFilterId: resolvedQuickFilter.quickFilterId,
    meta: responseMeta,
    restore,
    generatedAt: new Date().toISOString(),
    execution,
  };
}
