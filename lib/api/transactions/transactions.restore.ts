import { Buffer } from 'node:buffer';

import { getTransactionMeta } from './transactions.meta';
import {
  type TransactionRestorePayload,
  type TransactionSortRequest,
  type TransactionSortState,
  type TransactionTableState,
  type TransactionsTableRequest,
} from './transactions.types';

const RESTORE_VERSION = 1;

const SORT_DIRECTIONS = new Set<TransactionSortState['direction']>(['asc', 'desc']);

function getAvailableColumnIds(): Set<string> {
  const meta = getTransactionMeta();
  return new Set(meta.availableColumns.map((column) => column.id));
}

function getDefaultSort(): TransactionSortState {
  const meta = getTransactionMeta();
  const preferredColumn = meta.availableColumns.find((column) => column.id === 'date');
  const fallbackColumn = preferredColumn ?? meta.availableColumns[0];
  const columnId = fallbackColumn?.id ?? 'date';
  return { columnId, direction: 'desc' };
}

function sanitizeSort(sort: TransactionSortRequest | Partial<TransactionSortState> | null | undefined): TransactionSortState {
  const availableColumns = getAvailableColumnIds();
  const defaults = getDefaultSort();

  const requestedColumnId = typeof sort?.columnId === 'string' && availableColumns.has(sort.columnId)
    ? sort.columnId
    : defaults.columnId;
  const requestedDirection = sort?.direction && SORT_DIRECTIONS.has(sort.direction)
    ? sort.direction
    : defaults.direction;

  return { columnId: requestedColumnId, direction: requestedDirection };
}

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

export function getDefaultTableState(): TransactionTableState {
  const meta = getTransactionMeta();
  return {
    searchTerm: '',
    pagination: { page: 1, pageSize: meta.pagination.defaultPageSize },
    sort: getDefaultSort(),
  };
}

function sanitizeState(state: Partial<TransactionTableState> | undefined): TransactionTableState {
  const defaults = getDefaultTableState();
  const pagination = sanitizePagination(state?.pagination?.page, state?.pagination?.pageSize);
  return {
    searchTerm: typeof state?.searchTerm === 'string' ? state.searchTerm : defaults.searchTerm,
    pagination,
    sort: sanitizeSort(state?.sort),
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
  return {
    searchTerm: typeof request.searchTerm === 'string' ? request.searchTerm : base.searchTerm,
    pagination,
    sort: sanitizeSort(request.sort ?? base.sort),
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