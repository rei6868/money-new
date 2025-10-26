import type { NextApiRequest, NextApiResponse } from "next";
import { randomUUID } from "crypto";
import { asc, desc, ilike, and, inArray, eq, sql } from "drizzle-orm";
import { db } from "../../../lib/db/client";
import type { Account } from "../../../lib/accounts/accounts.types";
import {
  accounts,
  accountTypeEnum,
  accountStatusEnum,
  type NewAccount,
} from "../../../src/db/schema/accounts";

const SORTABLE_COLUMNS = {
  account_name: accounts.accountName,
  account_type: accounts.accountType,
  current_balance: accounts.currentBalance,
  status: accounts.status,
  created_at: accounts.createdAt,
  updated_at: accounts.updatedAt,
} as const;

const toNumber = (value: unknown): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (typeof value === "bigint") return Number(value);
  return 0;
};

const toIsoString = (value: unknown): string => {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value) return value;
  return new Date().toISOString();
};

const mapAccountRecord = (row: typeof accounts.$inferSelect): Account => ({
  account_id: row.accountId,
  account_name: row.accountName,
  account_type: row.accountType as Account["account_type"],
  owner_id: row.ownerId,
  parent_account_id: row.parentAccountId ?? null,
  asset_ref: row.assetRef ?? null,
  opening_balance: toNumber(row.openingBalance),
  current_balance: toNumber(row.currentBalance),
  status: row.status as Account["status"],
  total_in: toNumber(row.totalIn),
  total_out: toNumber(row.totalOut),
  created_at: toIsoString(row.createdAt),
  updated_at: toIsoString(row.updatedAt),
  img_url: row.imgUrl ?? null,
  notes: row.notes ?? null,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!db) {
    return res.status(500).json({ error: "Database connection not configured" });
  }

  if (req.method === "GET") {
    try {
      const page = Number.parseInt(String(req.query.page ?? "1"), 10);
      const pageSize = Number.parseInt(String(req.query.pageSize ?? "25"), 10);
      const safePage = Number.isNaN(page) || page < 1 ? 1 : page;
      const safePageSize = Number.isNaN(pageSize) || pageSize < 1 ? 25 : Math.min(pageSize, 100);
      const offset = (safePage - 1) * safePageSize;

      const sortByRaw = typeof req.query.sortBy === "string" ? req.query.sortBy : "created_at";
      const sortDirRaw = typeof req.query.sortDir === "string" ? req.query.sortDir : "desc";

      const sortColumn = SORTABLE_COLUMNS[sortByRaw as keyof typeof SORTABLE_COLUMNS] ?? accounts.createdAt;
      const orderFn = sortDirRaw === "asc" ? asc : desc;

      const filters = [];

      const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
      if (search) {
        filters.push(ilike(accounts.accountName, `%${search}%`));
      }

      const accountTypeParam =
        typeof req.query.account_type === "string" ? req.query.account_type.split(",").filter(Boolean) : [];
      if (accountTypeParam.length) {
        filters.push(inArray(accounts.accountType, accountTypeParam));
      }

      const statusParam =
        typeof req.query.status === "string" ? req.query.status.split(",").filter(Boolean) : [];
      if (statusParam.length) {
        filters.push(inArray(accounts.status, statusParam));
      }

      const ownerId = typeof req.query.owner_id === "string" ? req.query.owner_id.trim() : "";
      if (ownerId) {
        filters.push(eq(accounts.ownerId, ownerId));
      }

      const whereClause =
        filters.length === 0 ? undefined : filters.length === 1 ? filters[0] : and(...filters);

      let dataQuery = db.select().from(accounts);
      if (whereClause) {
        dataQuery = dataQuery.where(whereClause);
      }
      dataQuery = dataQuery.orderBy(orderFn(sortColumn)).limit(safePageSize).offset(offset);
      const rows = await dataQuery;

      let countQuery = db.select({ count: sql<number>`count(*)::int` }).from(accounts);
      if (whereClause) {
        countQuery = countQuery.where(whereClause);
      }
      const [countResult] = await countQuery;
      const total = countResult?.count ?? 0;

      const accountsPayload = rows.map(mapAccountRecord);

      return res.status(200).json({
        accounts: accountsPayload,
        total,
      });
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      return res.status(500).json({ error: message });
    }
  }

  if (req.method === "POST") {
    try {
      const body = (typeof req.body === "object" && req.body) || {};

      const requiredFields = ["account_name", "account_type", "owner_id", "opening_balance", "status"] as const;
      const missing = requiredFields.filter((field) => body[field] === undefined || body[field] === null);
      if (missing.length) {
        return res.status(400).json({ error: "Missing required fields", details: missing });
      }

      const accountName = String(body.account_name).trim();
      const accountType = String(body.account_type).trim();
      const status = String(body.status).trim();
      const ownerId = String(body.owner_id).trim();
      const openingBalanceValue = Number(body.opening_balance);

      if (!accountName) {
        return res.status(400).json({ error: "account_name cannot be empty" });
      }

      if (!ownerId) {
        return res.status(400).json({ error: "owner_id cannot be empty" });
      }

      if (Number.isNaN(openingBalanceValue)) {
        return res.status(400).json({ error: "opening_balance must be a valid number" });
      }

      if (!accountTypeEnum.enumValues.includes(accountType)) {
        return res.status(400).json({
          error: `account_type must be one of: ${accountTypeEnum.enumValues.join(", ")}`,
        });
      }

      if (!accountStatusEnum.enumValues.includes(status)) {
        return res.status(400).json({
          error: `status must be one of: ${accountStatusEnum.enumValues.join(", ")}`,
        });
      }

      const payload: NewAccount = {
        accountId: randomUUID(),
        accountName,
        accountType,
        ownerId,
        openingBalance: openingBalanceValue.toFixed(2),
        currentBalance: openingBalanceValue.toFixed(2),
        status,
        imgUrl: body.img_url ?? null,
        parentAccountId: body.parent_account_id ?? null,
        assetRef: body.asset_ref ?? null,
        notes: body.notes ?? null,
      };

      const [created] = await db.insert(accounts).values(payload).returning();
      if (!created) {
        return res.status(500).json({ error: "Failed to create account" });
      }

      return res.status(201).json(mapAccountRecord(created));
    } catch (error) {
      console.error("Failed to create account:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      return res.status(500).json({ error: message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
