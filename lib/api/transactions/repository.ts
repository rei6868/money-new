import { and, asc, desc, eq, ilike, sql } from "drizzle-orm";

import { cashbackMovements } from "../../../src/db/schema/cashbackMovements";
import type { CashbackMovement } from "../../../src/db/schema/cashbackMovements";
import { transactions } from "../../../src/db/schema/transactions";
import type { Transaction } from "../../../src/db/schema/transactions";
import { getDb } from "../../db/client";
import { mockCashbackMovements, mockTransactions } from "./mockData";
import type { TransactionWithCashback, TransactionsQueryParams } from "./types";

type DrizzleRow = {
  transaction: Transaction;
  cashback: CashbackMovement | null;
};

const ORDERABLE_COLUMNS = {
  transactionId: transactions.transactionId,
  accountId: transactions.accountId,
  personId: transactions.personId,
  categoryId: transactions.categoryId,
  shopId: transactions.shopId,
  type: transactions.type,
  status: transactions.status,
  amount: transactions.amount,
  fee: transactions.fee,
  occurredOn: transactions.occurredOn,
  createdAt: transactions.createdAt,
  updatedAt: transactions.updatedAt,
} as const;

const aggregateRows = (rows: DrizzleRow[]): TransactionWithCashback[] => {
  const map = new Map<string, TransactionWithCashback>();
  rows.forEach(({ transaction, cashback }) => {
    const existing = map.get(transaction.transactionId);
    if (!existing) {
      map.set(transaction.transactionId, {
        ...transaction,
        cashbackMovements: cashback ? [cashback] : [],
      });
      return;
    }
    if (cashback) {
      existing.cashbackMovements.push(cashback);
    }
  });
  return Array.from(map.values()).map((record) => ({
    ...record,
    cashbackMovements: [...record.cashbackMovements],
  }));
};

const combineMockRecords = (): TransactionWithCashback[] => {
  const cashbackByTxn = mockCashbackMovements.reduce<Record<string, CashbackMovement[]>>(
    (acc, movement) => {
      acc[movement.transactionId] = acc[movement.transactionId] ?? [];
      acc[movement.transactionId].push(movement);
      return acc;
    },
    {},
  );

  return mockTransactions.map((transaction) => ({
    ...transaction,
    cashbackMovements: cashbackByTxn[transaction.transactionId] ?? [],
  }));
};

const formatUtcDate = (input: Date): string => {
  const year = input.getUTCFullYear();
  const month = (input.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = input.getUTCDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getMonthEnd = (month: string): string => {
  const [yearStr, monthStr] = month.split("-");
  const year = Number.parseInt(yearStr, 10);
  const monthIndex = Number.parseInt(monthStr, 10) - 1;
  const endDate = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));
  return formatUtcDate(endDate);
};

const getMonthStart = (month: string): string => `${month}-01`;

const computeDateBounds = (
  params: TransactionsQueryParams,
): { start?: string; end?: string } | undefined => {
  if (!params.year && !params.month) {
    return undefined;
  }

  if (params.month) {
    if (params.month.mode === "single") {
      return {
        start: getMonthStart(params.month.start),
        end: getMonthEnd(params.month.start),
      };
    }
    return {
      start: getMonthStart(params.month.start),
      end: params.month.end ? getMonthEnd(params.month.end) : undefined,
    };
  }

  if (params.year) {
    return {
      start: `${params.year}-01-01`,
      end: `${params.year}-12-31`,
    };
  }

  return undefined;
};

const toIsoDate = (input: Date | string): string => {
  if (input instanceof Date) {
    return formatUtcDate(input);
  }
  const trimmed = input.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return trimmed;
  }
  return formatUtcDate(parsed);
};

const withinDateBounds = (
  occurredOn: Date | string,
  bounds?: { start?: string; end?: string },
): boolean => {
  if (!bounds) {
    return true;
  }
  const occurred = toIsoDate(occurredOn);
  if (bounds.start && occurred < bounds.start) {
    return false;
  }
  if (bounds.end && occurred > bounds.end) {
    return false;
  }
  return true;
};

const filterRecords = (
  records: TransactionWithCashback[],
  params: TransactionsQueryParams,
  bounds: { start?: string; end?: string } | undefined,
): TransactionWithCashback[] => {
  const searchTerm = params.search?.toLowerCase() ?? null;
  return records.filter((record) => {
    if (searchTerm) {
      const notes = (record.notes ?? "").toString().toLowerCase();
      if (!notes.includes(searchTerm)) {
        return false;
      }
    }
    if (params.personId && record.personId !== params.personId) {
      return false;
    }
    if (params.categoryId && record.categoryId !== params.categoryId) {
      return false;
    }
    if (!withinDateBounds(record.occurredOn, bounds)) {
      return false;
    }
    return true;
  });
};

const sortRecords = (
  records: TransactionWithCashback[],
  params: TransactionsQueryParams,
): TransactionWithCashback[] => {
  const direction = params.sort?.direction ?? "desc";
  const field = params.sort?.field ?? "occurredOn";
  const multiplier = direction === "desc" ? -1 : 1;

  const getComparableValue = (value: unknown, key: string): unknown => {
    if (value == null) {
      return value;
    }
    if (value instanceof Date) {
      return value.getTime();
    }
    if (typeof value === "number") {
      return value;
    }
    if (typeof value === "string") {
      if (
        key === "amount" ||
        key === "fee" ||
        key === "cashbackValue" ||
        key === "cashbackAmount" ||
        key === "budgetCap"
      ) {
        const numeric = Number.parseFloat(value);
        return Number.isNaN(numeric) ? value : numeric;
      }
      const timestamp = Date.parse(value);
      if (!Number.isNaN(timestamp)) {
        return timestamp;
      }
      return value.toLowerCase();
    }
    return value;
  };

  return [...records].sort((a, b) => {
    const rawA = (a as Record<string, unknown>)[field];
    const rawB = (b as Record<string, unknown>)[field];
    const valueA = getComparableValue(rawA, field);
    const valueB = getComparableValue(rawB, field);

    if (valueA === valueB) {
      return 0;
    }
    if (valueA == null) {
      return 1 * multiplier;
    }
    if (valueB == null) {
      return -1 * multiplier;
    }

    if (typeof valueA === "number" && typeof valueB === "number") {
      return (valueA - valueB) * multiplier;
    }
    return valueA.toString().localeCompare(valueB.toString()) * multiplier;
  });
};

const paginateRecords = (
  records: TransactionWithCashback[],
  params: TransactionsQueryParams,
): TransactionWithCashback[] => {
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;
  return records.slice(offset, offset + limit);
};

const buildDbFilters = (
  params: TransactionsQueryParams,
  bounds: { start?: string; end?: string } | undefined,
) => {
  const filters = [];
  if (params.personId) {
    filters.push(eq(transactions.personId, params.personId));
  }
  if (params.categoryId) {
    filters.push(eq(transactions.categoryId, params.categoryId));
  }
  if (params.search) {
    filters.push(ilike(transactions.notes, `%${params.search}%`));
  }
  if (bounds?.start && bounds?.end) {
    filters.push(sql`${transactions.occurredOn} between ${bounds.start} and ${bounds.end}`);
  } else if (bounds?.start) {
    filters.push(sql`${transactions.occurredOn} >= ${bounds.start}`);
  } else if (bounds?.end) {
    filters.push(sql`${transactions.occurredOn} <= ${bounds.end}`);
  }
  return filters;
};

export const fetchTransactions = async (
  params: TransactionsQueryParams,
): Promise<TransactionWithCashback[]> => {
  const db = getDb();
  const bounds = computeDateBounds(params);

  if (db) {
    // TODO(sprint3-be-3a): Extend to include Neon connection pooling config once production DB wiring is ready.
    const filters = buildDbFilters(params, bounds);
    const orderColumn = ORDERABLE_COLUMNS[params.sort?.field ?? "occurredOn"];
    const orderDirection = params.sort?.direction === "asc" ? asc : desc;

    const rows = await db
      .select({
        transaction: transactions,
        cashback: cashbackMovements,
      })
      .from(transactions)
      .leftJoin(cashbackMovements, eq(cashbackMovements.transactionId, transactions.transactionId))
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(orderDirection(orderColumn));

    const aggregated = aggregateRows(rows);
    const filtered = filterRecords(aggregated, params, bounds);
    const sorted = sortRecords(filtered, params);
    return paginateRecords(sorted, params);
  }

  const records = combineMockRecords();
  const filtered = filterRecords(records, params, bounds);
  const sorted = sortRecords(filtered, params);
  return paginateRecords(sorted, params);
};

type ColumnMetadata = {
  id: string;
  column: string;
  label: string;
  table: "transactions" | "cashback_movements";
  type: "string" | "enum" | "numeric" | "date" | "text" | "timestamp";
  sortable: boolean;
  filterable: boolean;
};

export const getColumnMetadata = (): ColumnMetadata[] => {
  const transactionColumns: Omit<ColumnMetadata, "id" | "table">[] = [
    {
      column: "transaction_id",
      label: "Transaction ID",
      type: "string",
      sortable: true,
      filterable: true,
    },
    {
      column: "account_id",
      label: "Account ID",
      type: "string",
      sortable: true,
      filterable: true,
    },
    {
      column: "person_id",
      label: "Person ID",
      type: "string",
      sortable: true,
      filterable: true,
    },
    {
      column: "shop_id",
      label: "Shop ID",
      type: "string",
      sortable: true,
      filterable: true,
    },
    {
      column: "type",
      label: "Transaction Type",
      type: "enum",
      sortable: true,
      filterable: true,
    },
    {
      column: "status",
      label: "Transaction Status",
      type: "enum",
      sortable: true,
      filterable: true,
    },
    {
      column: "category_id",
      label: "Category ID",
      type: "string",
      sortable: true,
      filterable: true,
    },
    {
      column: "amount",
      label: "Amount",
      type: "numeric",
      sortable: true,
      filterable: false,
    },
    {
      column: "fee",
      label: "Fee",
      type: "numeric",
      sortable: true,
      filterable: false,
    },
    {
      column: "occurred_on",
      label: "Occurred On",
      type: "date",
      sortable: true,
      filterable: true,
    },
    {
      column: "notes",
      label: "Notes",
      type: "text",
      sortable: false,
      filterable: true,
    },
    {
      column: "subscription_member_id",
      label: "Subscription Member ID",
      type: "string",
      sortable: false,
      filterable: true,
    },
    {
      column: "linked_txn_id",
      label: "Linked Transaction ID",
      type: "string",
      sortable: false,
      filterable: true,
    },
    {
      column: "created_at",
      label: "Created At",
      type: "timestamp",
      sortable: true,
      filterable: false,
    },
    {
      column: "updated_at",
      label: "Updated At",
      type: "timestamp",
      sortable: true,
      filterable: false,
    },
  ];

  const cashbackColumns: Omit<ColumnMetadata, "id" | "table">[] = [
    {
      column: "cashback_movement_id",
      label: "Cashback Movement ID",
      type: "string",
      sortable: false,
      filterable: false,
    },
    {
      column: "transaction_id",
      label: "Transaction ID",
      type: "string",
      sortable: false,
      filterable: true,
    },
    {
      column: "account_id",
      label: "Account ID",
      type: "string",
      sortable: false,
      filterable: true,
    },
    {
      column: "cycle_tag",
      label: "Cycle Tag",
      type: "string",
      sortable: false,
      filterable: true,
    },
    {
      column: "cashback_type",
      label: "Cashback Type",
      type: "enum",
      sortable: false,
      filterable: true,
    },
    {
      column: "cashback_value",
      label: "Cashback Value",
      type: "numeric",
      sortable: false,
      filterable: false,
    },
    {
      column: "cashback_amount",
      label: "Cashback Amount",
      type: "numeric",
      sortable: false,
      filterable: false,
    },
    {
      column: "status",
      label: "Cashback Status",
      type: "enum",
      sortable: false,
      filterable: true,
    },
    {
      column: "budget_cap",
      label: "Budget Cap",
      type: "numeric",
      sortable: false,
      filterable: false,
    },
    {
      column: "note",
      label: "Cashback Note",
      type: "text",
      sortable: false,
      filterable: false,
    },
    {
      column: "created_at",
      label: "Created At",
      type: "timestamp",
      sortable: false,
      filterable: false,
    },
    {
      column: "updated_at",
      label: "Updated At",
      type: "timestamp",
      sortable: false,
      filterable: false,
    },
  ];

  return [
    ...transactionColumns.map((column) => ({
      id: `transactions.${column.column}`,
      table: "transactions" as const,
      ...column,
    })),
    ...cashbackColumns.map((column) => ({
      id: `cashback_movements.${column.column}`,
      table: "cashback_movements" as const,
      ...column,
    })),
  ];
};
