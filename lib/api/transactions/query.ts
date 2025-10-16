import type { ParsedUrlQuery } from "querystring";

import type { SortableTransactionKeys, TransactionsQueryParams } from "./types";

const SORT_FIELD_ALIASES: Record<string, SortableTransactionKeys> = {
  transaction_id: "transactionId",
  transactionid: "transactionId",
  account_id: "accountId",
  accountid: "accountId",
  person_id: "personId",
  personid: "personId",
  category_id: "categoryId",
  categoryid: "categoryId",
  shop_id: "shopId",
  shopid: "shopId",
  type: "type",
  status: "status",
  amount: "amount",
  fee: "fee",
  occurred_on: "occurredOn",
  occurredon: "occurredOn",
  created_at: "createdAt",
  createdat: "createdAt",
  updated_at: "updatedAt",
  updatedat: "updatedAt",
};

const isMonth = (value: string): boolean => /^\d{4}-\d{2}$/.test(value);

const clampLimit = (value: number): number => {
  if (Number.isNaN(value) || value <= 0) {
    return 50;
  }
  return Math.min(200, value);
};

const parseSort = (raw: string | string[] | undefined) => {
  if (!raw) {
    return undefined;
  }
  const value = Array.isArray(raw) ? raw[0] : raw;
  const [fieldInput, directionInput] = value.split(":");
  const field = SORT_FIELD_ALIASES[fieldInput.trim().toLowerCase()];
  if (!field) {
    return undefined;
  }
  const normalizedDirection = directionInput?.toLowerCase() === "desc" ? "desc" : "asc";
  return {
    field,
    direction: normalizedDirection as "asc" | "desc",
  };
};

const parseMonth = (raw: string | string[] | undefined) => {
  if (!raw) {
    return undefined;
  }
  const value = Array.isArray(raw) ? raw[0] : raw;

  if (value.includes("..")) {
    const [start, end] = value.split("..", 2).map((part) => part.trim());
    if (start && end && isMonth(start) && isMonth(end)) {
      return {
        mode: "range" as const,
        start,
        end,
      };
    }
    return undefined;
  }

  if (isMonth(value.trim())) {
    return {
      mode: "single" as const,
      start: value.trim(),
    };
  }

  return undefined;
};

export const parseTransactionsQuery = (query: ParsedUrlQuery): TransactionsQueryParams => {
  const search = typeof query.search === "string" ? query.search.trim() : undefined;
  const personId = typeof query.personId === "string" ? query.personId.trim() : undefined;
  const personIdAlt = typeof query.person === "string" ? query.person.trim() : undefined;
  const categoryId = typeof query.categoryId === "string" ? query.categoryId.trim() : undefined;
  const categoryIdAlt = typeof query.category === "string" ? query.category.trim() : undefined;
  const yearRaw = typeof query.year === "string" ? Number.parseInt(query.year, 10) : undefined;
  const month = parseMonth(query.month);
  const limitRaw = typeof query.limit === "string" ? Number.parseInt(query.limit, 10) : undefined;
  const offsetRaw = typeof query.offset === "string" ? Number.parseInt(query.offset, 10) : undefined;
  const sort = parseSort(query.sort);

  const year = typeof yearRaw === "number" && !Number.isNaN(yearRaw) ? yearRaw : undefined;
  const limit = typeof limitRaw === "number" && !Number.isNaN(limitRaw) ? clampLimit(limitRaw) : 50;
  const offset =
    typeof offsetRaw === "number" && !Number.isNaN(offsetRaw) && offsetRaw > 0 ? offsetRaw : 0;

  return {
    search: search || undefined,
    personId: personId || personIdAlt || undefined,
    categoryId: categoryId || categoryIdAlt || undefined,
    year,
    month,
    limit,
    offset,
    sort,
  };
};
