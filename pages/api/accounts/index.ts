import type { NextApiRequest, NextApiResponse } from "next";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";

import { getDb } from "../../../lib/db/client";
import { accounts, type NewAccount } from "../../../src/db/schema/accounts";
import { people } from "../../../src/db/schema/people";

type AccountListItem = {
  accountId: string;
  accountName: string;
  accountType: string;
  ownerId: string;
  openingBalance: string;
  currentBalance: string;
  status: string;
  imgUrl: string | null;
  notes: string | null;
  parentAccountId: string | null;
  assetRef: string | null;
  totalIn: string;
  totalOut: string;
  createdAt: Date;
  updatedAt: Date;
  ownerName?: string | null;
};

type AccountsListResponse = {
  accounts: AccountListItem[];
};

const respondJson = (res: NextApiResponse, status: number, payload: unknown): void => {
  res.setHeader("Content-Type", "application/json");
  res.status(status).json(payload);
};

const generateAccountId = (): string => {
  if (typeof randomUUID === "function") {
    return randomUUID();
  }
  return `acct_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const normalizeString = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const normalizeNullableString = (value: unknown): string | null | undefined => {
  if (value === null) {
    return null;
  }
  if (value === undefined) {
    return undefined;
  }
  return normalizeString(value) ?? null;
};

const normalizeNumeric = (value: unknown): string | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value.toString() : undefined;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      return undefined;
    }
    return trimmed;
  }
  return undefined;
};

const parseRequestBody = (raw: unknown): Record<string, unknown> | null => {
  if (raw == null) {
    return {};
  }
  if (typeof raw === "string") {
    if (raw.trim().length === 0) {
      return {};
    }
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : null;
    } catch (error) {
      console.error("Failed to parse JSON payload for /api/accounts", error);
      return null;
    }
  }
  if (typeof raw === "object") {
    return raw as Record<string, unknown>;
  }
  return null;
};

const fetchAccountsWithOwner = async (db: NonNullable<ReturnType<typeof getDb>>): Promise<AccountListItem[]> => {
  const rows = await db
    .select({
      accountId: accounts.accountId,
      accountName: accounts.accountName,
      accountType: accounts.accountType,
      ownerId: accounts.ownerId,
      openingBalance: accounts.openingBalance,
      currentBalance: accounts.currentBalance,
      status: accounts.status,
      imgUrl: accounts.imgUrl,
      notes: accounts.notes,
      parentAccountId: accounts.parentAccountId,
      assetRef: accounts.assetRef,
      totalIn: accounts.totalIn,
      totalOut: accounts.totalOut,
      createdAt: accounts.createdAt,
      updatedAt: accounts.updatedAt,
      ownerName: people.fullName,
    })
    .from(accounts)
    .leftJoin(people, eq(accounts.ownerId, people.personId));

  return rows.map((row) => ({
    ...row,
    imgUrl: row.imgUrl ?? null,
    notes: row.notes ?? null,
    parentAccountId: row.parentAccountId ?? null,
    assetRef: row.assetRef ?? null,
    ownerName: row.ownerName ?? null,
  }));
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = getDb();
  if (!db) {
    respondJson(res, 503, { error: "Database connection is not configured" });
    return;
  }

  if (req.method === "GET") {
    try {
      const accountsWithOwners = await fetchAccountsWithOwner(db);
      const payload: AccountsListResponse = { accounts: accountsWithOwners };
      respondJson(res, 200, payload);
    } catch (error) {
      console.error("Failed to fetch accounts", error);
      const details = error instanceof Error ? error.message : "Unknown error";
      respondJson(res, 500, { error: "Failed to fetch accounts", details });
    }
    return;
  }

  if (req.method === "POST") {
    try {
      const parsedBody = parseRequestBody(req.body);
      if (parsedBody === null) {
        respondJson(res, 400, { error: "Validation failed", details: "Invalid JSON payload" });
        return;
      }

      const payload = parsedBody;

      const accountName = normalizeString(payload.accountName);
      const accountType = normalizeString(payload.accountType);
      const ownerId = normalizeString(payload.ownerId);
      const openingBalance = normalizeNumeric(payload.openingBalance);
      const currentBalance = normalizeNumeric(payload.currentBalance);
      const status = normalizeString(payload.status);

      if (!accountName || !accountType || !ownerId || !openingBalance || !currentBalance || !status) {
        respondJson(res, 400, {
          error: "Validation failed",
          details: "accountName, accountType, ownerId, openingBalance, currentBalance, and status are required",
        });
        return;
      }

      const [owner] = await db
        .select({ personId: people.personId, fullName: people.fullName })
        .from(people)
        .where(eq(people.personId, ownerId))
        .limit(1);
      if (!owner) {
        respondJson(res, 400, { error: "Validation failed", details: "ownerId does not reference a valid person" });
        return;
      }

      const newAccount: NewAccount = {
        accountId: generateAccountId(),
        accountName,
        accountType,
        ownerId,
        openingBalance,
        currentBalance,
        status,
      };

      const imgUrl = normalizeNullableString(payload.imgUrl);
      if (imgUrl !== undefined) {
        newAccount.imgUrl = imgUrl;
      }

      const notes = normalizeNullableString(payload.notes);
      if (notes !== undefined) {
        newAccount.notes = notes;
      }

      const parentAccountId = normalizeNullableString(payload.parentAccountId);
      if (parentAccountId !== undefined) {
        newAccount.parentAccountId = parentAccountId;
      }

      const assetRef = normalizeNullableString(payload.assetRef);
      if (assetRef !== undefined) {
        newAccount.assetRef = assetRef;
      }

      const [created] = await db.insert(accounts).values(newAccount).returning();
      if (!created) {
        respondJson(res, 500, { error: "Failed to create account", details: "Insert returned no rows" });
        return;
      }

      const response: AccountListItem = {
        accountId: created.accountId,
        accountName: created.accountName,
        accountType: created.accountType,
        ownerId: created.ownerId,
        openingBalance: created.openingBalance,
        currentBalance: created.currentBalance,
        status: created.status,
        imgUrl: created.imgUrl ?? null,
        notes: created.notes ?? null,
        parentAccountId: created.parentAccountId ?? null,
        assetRef: created.assetRef ?? null,
        totalIn: created.totalIn,
        totalOut: created.totalOut,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
        ownerName: owner.fullName,
      };

      respondJson(res, 201, response);
    } catch (error) {
      console.error("Failed to create account", error);
      const details = error instanceof Error ? error.message : "Unknown error";
      respondJson(res, 500, { error: "Failed to create account", details });
    }
    return;
  }

  res.setHeader("Allow", ["GET", "POST"]);
  respondJson(res, 405, { error: "Method not allowed" });
}
