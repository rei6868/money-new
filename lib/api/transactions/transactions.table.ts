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

const NUMERIC_SORT_COLUMNS = new Set<keyof TransactionRecord>([
  'amount',
  'percentBack',
  'fixedBack',
  'totalBack',
  'finalPrice',
]);

const DATE_SORT_COLUMNS = new Set<string>(['date', 'occurredOn', 'displayDate']);

const SORTABLE_COLUMN_IDS = new Set(getTransactionMeta().availableColumns.map((column) => column.id));

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

function toComparableValue(row: TransactionRecord, columnId: string): string | number | null {
  if (columnId === 'date') {
    return Number.isFinite(row.sortDate) ? row.sortDate : null;
  }

  const value = row[columnId as keyof TransactionRecord];
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (NUMERIC_SORT_COLUMNS.has(columnId as keyof TransactionRecord)) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  if (DATE_SORT_COLUMNS.has(columnId)) {
    const timestamp = Date.parse(String(value));
    return Number.isNaN(timestamp) ? null : timestamp;
  }

  return String(value).toLowerCase();
}

function sortRows(
  rows: TransactionRecord[],
  columnId: string,
  direction: 'asc' | 'desc',
): TransactionRecord[] {
  if (!Array.isArray(rows) || rows.length <= 1) {
    return rows;
  }

  if (!SORTABLE_COLUMN_IDS.has(columnId)) {
    return rows;
  }

  const multiplier = direction === 'asc' ? 1 : -1;
  const sorted = rows.slice();
  sorted.sort((a, b) => {
    const aValue = toComparableValue(a, columnId);
    const bValue = toComparableValue(b, columnId);

    if (aValue === null && bValue === null) {
      return 0;
    }
    if (aValue === null) {
      return 1;
    }
    if (bValue === null) {
      return -1;
    }

    let comparison = 0;
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      comparison = aValue === bValue ? 0 : aValue < bValue ? -1 : 1;
    } else {
      comparison = String(aValue).localeCompare(String(bValue), undefined, {
        sensitivity: 'base',
        numeric: true,
      });
    }

    return comparison * multiplier;
  });

  return sorted;
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
    sort: request?.sort,
  };
  const state = restoreToken
    ? mergeStateWithRestore(restoreToken, normalizedRequest)
    : mergeStateWithRequest(normalizedRequest, defaultState);
  const searchTerm = state.searchTerm ?? '';
  const searchedRows = applySearch(dataset, searchTerm);
  const sortedRows = sortRows(searchedRows, state.sort.columnId, state.sort.direction);
  const { rows, pagination } = paginateRows(sortedRows, state.pagination.page, state.pagination.pageSize);
  const totals = calculateTotals(searchedRows);
  const restore = createRestorePayload({
    searchTerm,
    pagination,
    sort: state.sort,
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
