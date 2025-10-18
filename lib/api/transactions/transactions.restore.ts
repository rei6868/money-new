import { Buffer } from 'node:buffer';

import { mergeFilters, normalizeFilters } from './transactions.filter';
import { getTransactionMeta } from './transactions.meta';
import {
  type SortDescriptor,
  type SortDirection,
  type TransactionFilters,
  type TransactionRestorePayload,
  type TransactionTableState,
  type TransactionsTableRequest,
} from './transactions.types';

const RESTORE_VERSION = 1;

function sanitizePagination(page?: number, pageSize?: number): { page: number; pageSize: number } {
  const meta = getTransactionMeta();
  const defaultPageSize = meta.pagination.defaultPageSize;
  const maxPageSize = meta.pagination.maxPageSize;
  const safePage = Number.isFinite(page) && page && page > 0 ? Math.floor(page) : 1;
  const safePageSize = Number.isFinite(pageSize) && pageSize && pageSize > 0 ? Math.floor(pageSize) : defaultPageSize;
  return {
    page: safePage,
    pageSize: Math.min(Math.max(5, safePageSize), maxPageSize),
  };
}

function cloneFilters(filters: TransactionFilters): TransactionFilters {
  return {
    owners: [...filters.owners],
    categories: [...filters.categories],
    types: [...filters.types],
    debtTags: [...filters.debtTags],
    accounts: [...filters.accounts],
    months: [...filters.months],
    years: [...filters.years],
    searchTags: [...filters.searchTags],
    dateRange: filters.dateRange ? { ...filters.dateRange } : null,
  };
}

export function getDefaultTableState(): TransactionTableState {
  const meta = getTransactionMeta();
  return {
    searchTerm: '',
    sort: meta.defaultSort.map((item) => ({ ...item })),
    filters: cloneFilters(meta.defaultFilters),
    pagination: { page: 1, pageSize: meta.pagination.defaultPageSize },
    quickFilterId: null,
  };
}

function sanitizeState(state: Partial<TransactionTableState> | undefined): TransactionTableState {
  const defaults = getDefaultTableState();
  const normalizedFilters = state?.filters ? normalizeFilters(state.filters) : defaults.filters;
  const pagination = sanitizePagination(state?.pagination?.page, state?.pagination?.pageSize);
  const sanitizedSort: SortDescriptor[] =
    Array.isArray(state?.sort) && state.sort.length > 0
      ? state.sort
          .map((item): SortDescriptor | null => {
            if (!item || typeof item.id !== 'string' || item.id.length === 0) {
              return null;
            }
            const direction: SortDirection = item.direction === 'desc' ? 'desc' : 'asc';
            return { id: item.id, direction };
          })
          .filter((item): item is SortDescriptor => item !== null)
      : defaults.sort;
  return {
    searchTerm: typeof state?.searchTerm === 'string' ? state.searchTerm : defaults.searchTerm,
    sort: sanitizedSort.length > 0 ? sanitizedSort : defaults.sort,
    filters: normalizedFilters,
    pagination,
    quickFilterId: typeof state?.quickFilterId === 'string' ? state.quickFilterId : null,
  };
}

export function createRestorePayload(state: TransactionTableState): TransactionRestorePayload {
  const sanitized = sanitizeState(state);
  const payload = JSON.stringify({ v: RESTORE_VERSION, state: sanitized });
  const token = Buffer.from(payload).toString('base64url');
  return { token, state: sanitized };
}

export function decodeRestoreToken(token: string | null | undefined): TransactionTableState | null {
  if (!token) {
    return null;
  }
  try {
    const json = Buffer.from(token, 'base64url').toString('utf8');
    const raw = JSON.parse(json) as { v?: number; state?: Partial<TransactionTableState> };
    if (raw.v !== RESTORE_VERSION) {
      return null;
    }
    return sanitizeState(raw.state);
  } catch (error) {
    return null;
  }
}

export function mergeStateWithRequest(
  request: TransactionsTableRequest,
  base: TransactionTableState,
): TransactionTableState {
  const mergedFilters = request.filters
    ? mergeFilters(base.filters, request.filters)
    : base.filters;
  const pagination = sanitizePagination(request.pagination?.page, request.pagination?.pageSize);
  return {
    searchTerm: typeof request.searchTerm === 'string' ? request.searchTerm : base.searchTerm,
    sort:
      Array.isArray(request.sort) && request.sort.length > 0
        ? request.sort.map((item) => ({
            id: item.id,
            direction: item.direction === 'desc' ? 'desc' : 'asc',
          }))
        : base.sort,
    filters: mergedFilters,
    pagination,
    quickFilterId: typeof request.quickFilterId === 'string' ? request.quickFilterId : base.quickFilterId,
  };
}

export function mergeStateWithRestore(
  restoreToken: string | null | undefined,
  request: TransactionsTableRequest,
): TransactionTableState {
  const defaults = getDefaultTableState();
  const restored = decodeRestoreToken(restoreToken) ?? defaults;
  const withRequest = mergeStateWithRequest(request, restored);
  return {
    ...withRequest,
    filters: normalizeFilters(withRequest.filters),
  };
}
