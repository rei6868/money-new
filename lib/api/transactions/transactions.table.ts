import { performance } from 'node:perf_hooks';

import { asc, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import { getDb } from '../../db/client';
import { accounts } from '../../../src/db/schema/accounts';
import { cashbackMovements } from '../../../src/db/schema/cashbackMovements';
import { categories } from '../../../src/db/schema/categories';
import { debtMovements } from '../../../src/db/schema/debtMovements';
import { people } from '../../../src/db/schema/people';
import { shops } from '../../../src/db/schema/shops';
import { transactions } from '../../../src/db/schema/transactions';
import { getTransactionMeta } from './transactions.meta';
import {
  createRestorePayload,
  getDefaultTableState,
  mergeStateWithRequest,
  mergeStateWithRestore,
} from './transactions.restore';
import { loadTransactionDataset } from './transactions.dataset';
import {
  type SortDirection,
  type TransactionRecord,
  type TransactionSortState,
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

const SORTABLE_COLUMN_IDS = new Set(getTransactionMeta().availableColumns.map((column) => column.id));
const NUMERIC_COLUMN_IDS = new Set(['amount', 'percentBack', 'fixedBack', 'totalBack', 'finalPrice']);
const DATE_COLUMN_IDS = new Set(['date']);
const DEFAULT_SORT: Required<TransactionSortState> = { columnId: 'date', direction: 'desc' };

type NumericLike = string | number | null | undefined;

type DbNumber = NumericLike;

interface DbTransactionRow {
  transactionId: string;
  occurredOn: Date | string | null;
  amount: DbNumber;
  type: string | null;
  notes: string | null;
  linkedTxnId: string | null;
  accountName: string | null;
  accountId: string | null;
  accountOwnerName: string | null;
  personName: string | null;
  categoryName: string | null;
  shopName: string | null;
  percentBack: DbNumber;
  fixedBack: DbNumber;
  totalBack: DbNumber;
  cashbackCycle: string | null;
  debtCycle: string | null;
  debtLabel: string | null;
  debtNotes: string | null;
}

interface TotalsRow {
  totalRows: number;
  amountSum: DbNumber;
  totalBackSum: DbNumber;
  finalPriceSum: DbNumber;
}

interface SortReferences {
  transactions: typeof transactions;
  accounts: typeof accounts;
  accountOwner: any;
  people: typeof people;
  shops: typeof shops;
  categories: typeof categories;
  cashbackSummary: {
    percentBack: any;
    fixedBack: any;
    totalBack: any;
    cashbackCycleTag: any;
  };
  debtSummary: {
    debtCycleTag: any;
    movementLabel: any;
    debtNotes: any;
  };
}

function toNumber(value: NumericLike, fallback = 0): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function toDateOnly(value: Date | string | null | undefined): string {
  if (!value) {
    return '';
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 10);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return '';
    }
    const parsed = new Date(`${trimmed}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) {
      return trimmed;
    }
    return parsed.toISOString().slice(0, 10);
  }
  return '';
}

const MONTH_FORMATTER = new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' });

function toMonthLabel(date: Date | null): string {
  if (!date || Number.isNaN(date.getTime())) {
    return '';
  }
  return MONTH_FORMATTER.format(date);
}

function toTitleCase(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  return value
    .split(/[_\\s-]+/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}

function escapeLikeWildcards(value: string): string {
  return value.replace(/[%_]/g, (match) => `\\${match}`);
}

function determineSortState(sort: TransactionSortState | null | undefined): { columnId: string; direction: SortDirection } {
  const columnId = typeof sort?.columnId === 'string' ? sort.columnId : DEFAULT_SORT.columnId;
  const direction = sort?.direction === 'asc' || sort?.direction === 'desc' ? sort.direction : DEFAULT_SORT.direction;
  if (!SORTABLE_COLUMN_IDS.has(columnId)) {
    return { ...DEFAULT_SORT };
  }
  return { columnId, direction };
}

function toComparableValue(row: TransactionRecord, columnId: string) {
  const rawValue = row?.[columnId as keyof TransactionRecord];
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return null;
  }

  if (NUMERIC_COLUMN_IDS.has(columnId)) {
    const numeric = Number(rawValue);
    return Number.isFinite(numeric) ? numeric : null;
  }

  if (DATE_COLUMN_IDS.has(columnId)) {
    const timestamp = Date.parse(String(rawValue));
    return Number.isNaN(timestamp) ? null : timestamp;
  }

  return String(rawValue).toLowerCase();
}

function sortRecords(rows: TransactionRecord[], sort: TransactionSortState | null | undefined): TransactionRecord[] {
  if (!Array.isArray(rows) || rows.length <= 1) {
    return rows;
  }

  const { columnId, direction } = determineSortState(sort);
  if (!columnId || !direction) {
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

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      if (aValue === bValue) {
        return 0;
      }
      return aValue < bValue ? -1 * multiplier : 1 * multiplier;
    }

    const comparison = String(aValue).localeCompare(String(bValue), undefined, {
      sensitivity: 'base',
      numeric: NUMERIC_COLUMN_IDS.has(columnId) || DATE_COLUMN_IDS.has(columnId),
    });

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

function buildSearchConditions(
  searchTerm: string,
  refs: {
    transactions: typeof transactions;
    accounts: typeof accounts;
    accountOwner: any;
    people: typeof people;
    shops: typeof shops;
    categories: typeof categories;
    cashbackSummary: { cashbackCycleTag: any };
    debtSummary: { debtCycleTag: any; movementLabel: any; debtNotes: any };
  },
) {
  const normalized = searchTerm.trim();
  if (!normalized) {
    return [];
  }

  const pattern = `%${escapeLikeWildcards(normalized)}%`;
  const conditions = [
    ilike(refs.transactions.transactionId, pattern),
    ilike(refs.transactions.notes, pattern),
    ilike(refs.shops.shopName, pattern),
    ilike(refs.accounts.accountName, pattern),
    ilike(refs.categories.name, pattern),
    ilike(refs.people.fullName, pattern),
    ilike(refs.accountOwner.fullName, pattern),
    ilike(refs.transactions.linkedTxnId, pattern),
  ];

  conditions.push(ilike(refs.cashbackSummary.cashbackCycleTag, pattern));
  conditions.push(ilike(refs.debtSummary.debtCycleTag, pattern));
  conditions.push(ilike(refs.debtSummary.movementLabel, pattern));
  conditions.push(ilike(refs.debtSummary.debtNotes, pattern));

  return conditions;
}

function resolveSortExpression(columnId: string, refs: SortReferences) {
  switch (columnId) {
    case 'date':
      return refs.transactions.occurredOn;
    case 'type':
      return refs.transactions.type;
    case 'account':
      return sql`coalesce(${refs.accounts.accountName}, ${refs.transactions.accountId})`;
    case 'shop':
      return refs.shops.shopName;
    case 'notes':
      return refs.transactions.notes;
    case 'amount':
      return refs.transactions.amount;
    case 'percentBack':
      return sql`coalesce(${refs.cashbackSummary.percentBack}, 0)`;
    case 'fixedBack':
      return sql`coalesce(${refs.cashbackSummary.fixedBack}, 0)`;
    case 'totalBack':
      return sql`coalesce(${refs.cashbackSummary.totalBack}, 0)`;
    case 'finalPrice':
      return sql`(${refs.transactions.amount})::numeric - coalesce(${refs.cashbackSummary.totalBack}, 0)`;
    case 'debtTag':
      return sql`coalesce(${refs.debtSummary.movementLabel}, ${refs.debtSummary.debtNotes}, '')`;
    case 'cycleTag':
      return sql`coalesce(${refs.debtSummary.debtCycleTag}, ${refs.cashbackSummary.cashbackCycleTag}, '')`;
    case 'category':
      return refs.categories.name;
    case 'linkedTxn':
      return refs.transactions.linkedTxnId;
    case 'owner':
      return sql`coalesce(${refs.people.fullName}, ${refs.accountOwner.fullName}, '')`;
    case 'id':
      return refs.transactions.transactionId;
    default:
      return refs.transactions.occurredOn;
  }
}

function mapRowToRecord(row: DbTransactionRow): TransactionRecord {
  const amount = toNumber(row.amount);
  const occurredOn = toDateOnly(row.occurredOn);
  const occurredDate = occurredOn ? new Date(`${occurredOn}T00:00:00Z`) : null;
  const sortDate = occurredDate ? occurredDate.getTime() : Number.NEGATIVE_INFINITY;
  const month = toMonthLabel(occurredDate);
  const year = occurredDate && !Number.isNaN(occurredDate.getTime()) ? String(occurredDate.getUTCFullYear()) : '';
  const rawType = (row.type ?? '').trim();
  const normalizedType = rawType || toTitleCase(row.type) || 'Expense';
  const percentBack = toNumber(row.percentBack);
  const fixedBack = toNumber(row.fixedBack);
  const totalBack = toNumber(row.totalBack);
  const finalPrice = Number((amount - totalBack).toFixed(2));
  const owner = row.personName ?? row.accountOwnerName ?? '';
  const debtTag = (row.debtLabel?.trim() || row.debtNotes?.trim() || '').trim();
  const cycleTag = row.debtCycle?.trim() || row.cashbackCycle?.trim() || '';

  return {
    id: row.transactionId,
    date: occurredOn,
    occurredOn,
    displayDate: occurredOn,
    sortDate: Number.isFinite(sortDate) ? sortDate : Number.NEGATIVE_INFINITY,
    year,
    month,
    account: row.accountName ?? row.accountId ?? '',
    shop: row.shopName ?? '',
    notes: row.notes ?? '',
    amount,
    percentBack,
    fixedBack,
    totalBack,
    finalPrice,
    debtTag,
    cycleTag,
    category: row.categoryName ?? '',
    linkedTxn: row.linkedTxnId ?? '',
    owner,
    type: rawType || normalizedType,
    amountDirection: (rawType || row.type || '').toString().trim().toLowerCase() === 'income'
      ? 'credit'
      : 'debit',
  };
}

async function buildFallbackResponse(
  state: ReturnType<typeof getDefaultTableState>,
  searchTerm: string,
  meta = getTransactionMeta(),
): Promise<TransactionTableResponse> {
  const dataset = await loadTransactionDataset();
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filtered = normalizedSearch
    ? dataset.filter((row) =>
        SEARCH_FIELDS.some((field) =>
          String(row[field as keyof TransactionRecord] ?? '')
            .toLowerCase()
            .includes(normalizedSearch),
        ),
      )
    : dataset;

  const sorted = sortRecords(filtered, state.sort);
  const { rows, pagination } = paginateRows(sorted, state.pagination.page, state.pagination.pageSize);
  const totals = calculateTotals(filtered);
  const restore = createRestorePayload({
    searchTerm,
    pagination,
    sort: determineSortState(state.sort),
  });

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
    execution: { durationMs: 0 },
  };
}

export async function getTransactionsTable(
  request: TransactionsTableRequest,
  restoreToken?: string | null,
): Promise<TransactionTableResponse> {
  const t0 = performance.now();
  const meta = getTransactionMeta();
  const defaultState = getDefaultTableState();
  const state = restoreToken
    ? mergeStateWithRestore(restoreToken, request)
    : mergeStateWithRequest(request, defaultState);
  const searchTerm = state.searchTerm ?? '';
  const sortState = determineSortState(state.sort);

  const db = getDb();
  if (!db) {
    const fallbackResponse = await buildFallbackResponse(
      {
        searchTerm: state.searchTerm,
        pagination: state.pagination,
        sort: state.sort,
      },
      searchTerm,
      meta,
    );
    const execution = { durationMs: Number((performance.now() - t0).toFixed(2)) };
    return { ...fallbackResponse, execution };
  }

  try {
    const accountOwner = alias(people, 'account_owner');

    const cashbackPercentBack = sql<number>`coalesce(max(CASE WHEN ${cashbackMovements.cashbackType} = 'percent' THEN ${cashbackMovements.cashbackValue}::numeric END), 0)`.as(
      'percentBack',
    );
    const cashbackFixedBack = sql<number>`coalesce(sum(CASE WHEN ${cashbackMovements.cashbackType} = 'fixed' THEN ${cashbackMovements.cashbackValue}::numeric END), 0)`.as(
      'fixedBack',
    );
    const cashbackTotalBack = sql<number>`coalesce(sum(${cashbackMovements.cashbackAmount}::numeric), 0)`.as('totalBack');
    const cashbackCycleTag = sql<string>`max(${cashbackMovements.cycleTag})`.as('cashbackCycleTag');

    const cashbackSummary = db
      .$with('cashback_summary')
      .as(
        db
          .select({
            transactionId: cashbackMovements.transactionId,
            percentBack: cashbackPercentBack,
            fixedBack: cashbackFixedBack,
            totalBack: cashbackTotalBack,
            cashbackCycleTag,
          })
          .from(cashbackMovements)
          .groupBy(cashbackMovements.transactionId),
      );

    const debtCycleTag = sql<string>`max(${debtMovements.cycleTag})`.as('debtCycleTag');
    const debtNotes = sql<string>`max(${debtMovements.notes})`.as('debtNotes');
    const debtMovementLabel = sql<string>`max(trim(concat_ws(' ', initcap(replace(${debtMovements.movementType}::text, '_', ' ')), ${debtMovements.cycleTag})))`.as(
      'movementLabel',
    );

    const debtSummary = db
      .$with('debt_summary')
      .as(
        db
          .select({
            transactionId: debtMovements.transactionId,
            debtCycleTag,
            debtNotes,
            movementLabel: debtMovementLabel,
          })
          .from(debtMovements)
          .groupBy(debtMovements.transactionId),
      );

    const refs = {
      transactions,
      accounts,
      accountOwner,
      people,
      shops,
      categories,
      cashbackSummary,
      debtSummary,
    } satisfies Parameters<typeof buildSearchConditions>[1];

    const searchConditions = buildSearchConditions(searchTerm, refs);

    const withDb = db.with(cashbackSummary, debtSummary);

    const totalsSelect = withDb
      .select({
        totalRows: sql<number>`count(*)`, 
        amountSum: sql<number>`coalesce(sum((${transactions.amount})::numeric), 0)`,
        totalBackSum: sql<number>`coalesce(sum(coalesce(${cashbackSummary.totalBack}, 0)), 0)`,
        finalPriceSum: sql<number>`coalesce(sum(((${transactions.amount})::numeric) - coalesce(${cashbackSummary.totalBack}, 0)), 0)`
      })
      .from(transactions)
      .leftJoin(accounts, eq(transactions.accountId, accounts.accountId))
      .leftJoin(accountOwner, eq(accounts.ownerId, accountOwner.personId))
      .leftJoin(people, eq(transactions.personId, people.personId))
      .leftJoin(categories, eq(transactions.categoryId, categories.categoryId))
      .leftJoin(shops, eq(transactions.shopId, shops.shopId))
      .leftJoin(cashbackSummary, eq(cashbackSummary.transactionId, transactions.transactionId))
      .leftJoin(debtSummary, eq(debtSummary.transactionId, transactions.transactionId));

    const totalsQuery = searchConditions.length
      ? totalsSelect.where(or(...searchConditions))
      : totalsSelect;

    const totalsResult = await totalsQuery.execute();
    const totalsRow: TotalsRow = totalsResult[0] ?? { totalRows: 0, amountSum: 0, totalBackSum: 0, finalPriceSum: 0 };

    const totalRows = Number(totalsRow.totalRows ?? 0);
    const pageSize = state.pagination.pageSize;
    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
    const safePage = Math.min(Math.max(state.pagination.page, 1), totalPages);
    const offset = (safePage - 1) * pageSize;

    const pagination = { page: safePage, pageSize, totalRows, totalPages };

    let rows: TransactionRecord[] = [];

    if (totalRows > 0) {
      const sortExpression = resolveSortExpression(sortState.columnId, {
        transactions,
        accounts,
        accountOwner,
        people,
        shops,
        categories,
        cashbackSummary,
        debtSummary,
      });

      const orderClause = sortState.direction === 'asc' ? asc(sortExpression) : desc(sortExpression);

      const rowsSelect = withDb
        .select({
          transactionId: transactions.transactionId,
          occurredOn: transactions.occurredOn,
          amount: transactions.amount,
          type: transactions.type,
          notes: transactions.notes,
          linkedTxnId: transactions.linkedTxnId,
          accountName: accounts.accountName,
          accountId: transactions.accountId,
          accountOwnerName: accountOwner.fullName,
          personName: people.fullName,
          categoryName: categories.name,
          shopName: shops.shopName,
          percentBack: cashbackSummary.percentBack,
          fixedBack: cashbackSummary.fixedBack,
          totalBack: cashbackSummary.totalBack,
          cashbackCycle: cashbackSummary.cashbackCycleTag,
          debtCycle: debtSummary.debtCycleTag,
          debtLabel: debtSummary.movementLabel,
          debtNotes: debtSummary.debtNotes,
        })
        .from(transactions)
        .leftJoin(accounts, eq(transactions.accountId, accounts.accountId))
        .leftJoin(accountOwner, eq(accounts.ownerId, accountOwner.personId))
        .leftJoin(people, eq(transactions.personId, people.personId))
        .leftJoin(categories, eq(transactions.categoryId, categories.categoryId))
        .leftJoin(shops, eq(transactions.shopId, shops.shopId))
        .leftJoin(cashbackSummary, eq(cashbackSummary.transactionId, transactions.transactionId))
        .leftJoin(debtSummary, eq(debtSummary.transactionId, transactions.transactionId))
        .orderBy(orderClause, desc(transactions.transactionId))
        .limit(pageSize)
        .offset(offset);

      const rowsQuery = searchConditions.length ? rowsSelect.where(or(...searchConditions)) : rowsSelect;
      const dbRows = (await rowsQuery.execute()) as DbTransactionRow[];
      rows = dbRows.map((row) => mapRowToRecord(row));
    }

    const totals: TransactionTotals = {
      count: totalRows,
      amount: roundCurrency(toNumber(totalsRow.amountSum)),
      totalBack: roundCurrency(toNumber(totalsRow.totalBackSum)),
      finalPrice: roundCurrency(toNumber(totalsRow.finalPriceSum)),
    };

    const restore = createRestorePayload({
      searchTerm,
      pagination,
      sort: sortState,
    });

    const execution = { durationMs: Number((performance.now() - t0).toFixed(2)) };

    return {
      rows,
      pagination,
      totals,
      searchTerm,
      meta,
      restore,
      generatedAt: new Date().toISOString(),
      execution,
    };
  } catch (error) {
    console.error('Failed to query transactions table, falling back to mock dataset.', error);
    const fallbackResponse = await buildFallbackResponse(
      {
        searchTerm: state.searchTerm,
        pagination: state.pagination,
        sort: state.sort,
      },
      searchTerm,
      meta,
    );
    const execution = { durationMs: Number((performance.now() - t0).toFixed(2)) };
    return { ...fallbackResponse, execution };
  }
}