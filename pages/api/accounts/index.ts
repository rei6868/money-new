import type { NextApiRequest, NextApiResponse } from "next";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";

import { getDb } from "../../../lib/db/client";
import { accounts, type NewAccount } from "../../../src/db/schema/accounts";
import { people } from "../../../src/db/schema/people";

type DbClient = NonNullable<ReturnType<typeof getDb>>;

type AccountWithOwner = typeof accounts.$inferSelect & {
  ownerName: string | null;
};

const respondJson = (res: NextApiResponse, status: number, payload: unknown): void => {
  res.setHeader("Content-Type", "application/json");
  res.status(status).json(payload);
};

const toSingle = (value: unknown): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return typeof value === "string" ? value : undefined;
};

const normalizeString = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const toNumericString = (value: unknown): string | null => {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return null;
    }
    return value.toString();
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const numeric = Number(trimmed);
    if (!Number.isFinite(numeric)) {
      return null;
    }
    return trimmed;
  }
  return null;
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

const generateAccountId = (): string => {
  if (typeof randomUUID === "function") {
    return randomUUID();
  }
  return `account_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const accountSelection = {
  accountId: accounts.accountId,
  accountName: accounts.accountName,
  imgUrl: accounts.imgUrl,
  accountType: accounts.accountType,
  ownerId: accounts.ownerId,
  parentAccountId: accounts.parentAccountId,
  assetRef: accounts.assetRef,
  openingBalance: accounts.openingBalance,
  currentBalance: accounts.currentBalance,
  status: accounts.status,
  totalIn: accounts.totalIn,
  totalOut: accounts.totalOut,
  createdAt: accounts.createdAt,
  updatedAt: accounts.updatedAt,
  notes: accounts.notes,
  ownerName: people.fullName,
};

const selectAccountsWithOwner = async (db: DbClient): Promise<AccountWithOwner[]> => {
  return db.select(accountSelection).from(accounts).leftJoin(people, eq(accounts.ownerId, people.personId));
};

const selectAccountById = async (db: DbClient, accountId: string): Promise<AccountWithOwner | null> => {
  const [account] = await db
    .select(accountSelection)
    .from(accounts)
    .leftJoin(people, eq(accounts.ownerId, people.personId))
    .where(eq(accounts.accountId, accountId))
    .limit(1);
  return account ?? null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = getDb();
  if (!db) {
    respondJson(res, 503, { error: "Database connection is not configured" });
    return;
  }

  if (req.method === "GET") {
    try {
      const accountsWithOwner = await selectAccountsWithOwner(db);
      respondJson(res, 200, { accounts: accountsWithOwner });
    } catch (error) {
      console.error("Failed to fetch accounts", error);
      const details = error instanceof Error ? error.message : "Unknown error";
      respondJson(res, 500, { error: "Failed to fetch accounts", details });
    }
    return;
  }

  if (req.method === "POST") {
    const parsedBody = parseRequestBody(req.body);
    if (parsedBody === null) {
      respondJson(res, 400, { error: "Validation failed", details: "Invalid JSON payload" });
      return;
    }

    const payload = parsedBody as Partial<NewAccount> & Record<string, unknown>;
    const accountName = normalizeString(payload.accountName);
    const accountType = normalizeString(payload.accountType);
    const ownerId = normalizeString(payload.ownerId);
    const status = normalizeString(payload.status);
    const openingBalance = toNumericString(payload.openingBalance);

    if (!accountName || !accountType || !ownerId || !status || openingBalance === null) {
      respondJson(res, 400, {
        error: "Validation failed",
        details: "accountName, accountType, ownerId, openingBalance, and status are required",
      });
      return;
    }

    const currentBalance = toNumericString(payload.currentBalance) ?? openingBalance;

    const newAccount: NewAccount = {
      accountId: generateAccountId(),
      accountName,
      accountType,
      ownerId,
      openingBalance,
      currentBalance,
      status,
      totalIn: "0",
      totalOut: "0",
    };

    const imgUrl = normalizeString(payload.imgUrl);
    if (imgUrl) {
      newAccount.imgUrl = imgUrl;
    }

    if (payload.parentAccountId !== undefined) {
      const normalizedParent = normalizeString(payload.parentAccountId);
      if (normalizedParent) {
        newAccount.parentAccountId = normalizedParent;
      }
    }

    if (payload.assetRef !== undefined) {
      const normalizedAsset = normalizeString(payload.assetRef);
      if (normalizedAsset) {
        newAccount.assetRef = normalizedAsset;
      }
    }

    if (payload.notes !== undefined) {
      if (typeof payload.notes === "string") {
        const trimmedNotes = payload.notes.trim();
        if (trimmedNotes.length > 0) {
          newAccount.notes = trimmedNotes;
        }
      } else if (payload.notes === null) {
        newAccount.notes = null;
      }
    }

    try {
      await db.insert(accounts).values(newAccount);
      const created = await selectAccountById(db, newAccount.accountId);
      if (!created) {
        respondJson(res, 201, newAccount);
        return;
      }
      respondJson(res, 201, created);
    } catch (error) {
      console.error("Failed to create account", error);
      const details = error instanceof Error ? error.message : "Unknown error";
      respondJson(res, 400, { error: "Failed to create account", details });
    }
    return;
  }

  res.setHeader("Allow", ["GET", "POST"]);
  respondJson(res, 405, { error: "Method not allowed" });
}
