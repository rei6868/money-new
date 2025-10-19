import { performance } from 'node:perf_hooks';

import { loadTransactionDataset } from './transactions.dataset';
import { getTransactionMeta } from './transactions.meta';
import {
  createRestorePayload,
  getDefaultTableState,
  mergeStateWithRequest,
  mergeStateWithRestore,
} from './transactions.restore';
import {
  type TransactionRecord,
  type TransactionTableResponse,
  type TransactionsTableRequest,
  type TransactionTotals,
} from './transactions.types';

const SEARCH_FIELDS = [
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

function applySearch(rows: TransactionRecord[], searchTerm: string): TransactionRecord[] {
  if (!searchTerm) {
    return rows;
  }
  const normalized = searchTerm.trim().toLowerCase();
  if (!normalized) {
    return rows;
  }
  return rows.filter((row) =>
    SEARCH_FIELDS.some((field) => String(row[field as keyof TransactionRecord] ?? '').toLowerCase().includes(normalized)),
  );
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

export async function getTransactionsTable(
  request: TransactionsTableRequest,
  restoreToken?: string | null,
): Promise<TransactionTableResponse> {
  const t0 = performance.now();
  const dataset = await loadTransactionDataset();
  const meta = getTransactionMeta();
  const defaultState = getDefaultTableState();
  const normalizedRequest: TransactionsTableRequest = {
    searchTerm: request?.searchTerm,
    pagination: request?.pagination,
  };
  const state = restoreToken
    ? mergeStateWithRestore(restoreToken, normalizedRequest)
    : mergeStateWithRequest(normalizedRequest, defaultState);
  const searchTerm = state.searchTerm ?? '';
  const searchedRows = applySearch(dataset, searchTerm);
  const { rows, pagination } = paginateRows(searchedRows, state.pagination.page, state.pagination.pageSize);
  const totals = calculateTotals(searchedRows);
  const restore = createRestorePayload({
    searchTerm,
    pagination,
  });
  const execution = { durationMs: Number((performance.now() - t0).toFixed(2)) };
  return {
    rows,
    pagination,
    totals: {
      count: totals.count,
      amount: roundCurrency(totals.amount),
      totalBack: roundCurrency(totals.totalBack),
      finalPrice: roundCurrency(totals.finalPrice),
    },
    searchTerm,
    meta,
    restore,
    generatedAt: new Date().toISOString(),
    execution,
  };
}
