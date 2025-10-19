import { Buffer } from 'node:buffer';

import { getTransactionMeta } from './transactions.meta';
import {
  type TransactionRestorePayload,
  type TransactionSortState,
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

function sanitizeSort(sort?: Partial<TransactionSortState> | null): TransactionSortState {
  const columnId = typeof sort?.columnId === 'string' && sort.columnId.trim() ? sort.columnId : null;
  const direction = sort?.direction === 'asc' || sort?.direction === 'desc' ? sort.direction : null;
  return { columnId, direction };
}

export function getDefaultTableState(): TransactionTableState {
  const meta = getTransactionMeta();
  return {
    searchTerm: '',
    pagination: { page: 1, pageSize: meta.pagination.defaultPageSize },
    sort: { columnId: null, direction: null },
  };
}

function sanitizeState(state: Partial<TransactionTableState> | undefined): TransactionTableState {
  const defaults = getDefaultTableState();
  const pagination = sanitizePagination(state?.pagination?.page, state?.pagination?.pageSize);
  return {
    searchTerm: typeof state?.searchTerm === 'string' ? state.searchTerm : defaults.searchTerm,
    pagination,
    sort: sanitizeSort(state?.sort ?? defaults.sort),
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
  const requestedPage = Number(request.pagination?.page ?? base.pagination.page);
  const requestedPageSize = Number(request.pagination?.pageSize ?? base.pagination.pageSize);
  const pagination = sanitizePagination(requestedPage, requestedPageSize);
  const sort = sanitizeSort({
    columnId: (request.sortBy ?? base.sort.columnId) ?? null,
    direction: (request.sortDir ?? base.sort.direction) ?? null,
  });
  return {
    searchTerm: typeof request.searchTerm === 'string' ? request.searchTerm : base.searchTerm,
    pagination,
    sort,
  };
}

export function mergeStateWithRestore(
  restoreToken: string | null | undefined,
  request: TransactionsTableRequest,
): TransactionTableState {
  const defaults = getDefaultTableState();
  const restored = decodeRestoreToken(restoreToken) ?? defaults;
  return mergeStateWithRequest(request, restored);
}
