import type { NextApiRequest, NextApiResponse } from "next";
import { eq } from "drizzle-orm";

import { getDb } from "../../../lib/db/client";
import { accounts, accountStatusEnum, type NewAccount } from "../../../src/db/schema/accounts";
import { people } from "../../../src/db/schema/people";

type DbClient = NonNullable<ReturnType<typeof getDb>>;

type AccountWithOwner = typeof accounts.$inferSelect & {
  ownerName: string | null;
};

const respondJson = (res: NextApiResponse, status: number, payload: unknown): void => {
  res.setHeader("Content-Type", "application/json");
  res.status(status).json(payload);
};

const toSingle = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

const normalizeString = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
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
      console.error("Failed to parse JSON payload for /api/accounts/[id]", error);
      return null;
    }
  }
  if (typeof raw === "object") {
    return raw as Record<string, unknown>;
  }
  return null;
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

  const accountId = toSingle(req.query.id);
  if (!accountId) {
    respondJson(res, 400, { error: "Account id is required" });
    return;
  }

  if (req.method === "GET") {
    try {
      const account = await selectAccountById(db, accountId);
      if (!account) {
        respondJson(res, 404, { error: "Account not found" });
        return;
      }
      respondJson(res, 200, account);
    } catch (error) {
      console.error(`Failed to fetch account ${accountId}`, error);
      const details = error instanceof Error ? error.message : "Unknown error";
      respondJson(res, 500, { error: "Failed to fetch account", details });
    }
    return;
  }

  if (req.method === "PUT" || req.method === "PATCH") {
    const parsedBody = parseRequestBody(req.body);
    if (parsedBody === null) {
      respondJson(res, 400, { error: "Validation failed", details: "Invalid JSON payload" });
      return;
    }

    const forbiddenFields = ["openingBalance", "totalIn", "totalOut", "currentBalance"];
    const attemptedForbidden = forbiddenFields.filter((field) => field in parsedBody);
    if (attemptedForbidden.length > 0) {
      respondJson(res, 400, {
        error: "Validation failed",
        details: `Fields ${attemptedForbidden.join(", ")} cannot be updated via this endpoint`,
      });
      return;
    }

    const updates: Partial<NewAccount> = {};
    const { accountName, accountType, ownerId, status, parentAccountId, assetRef, imgUrl, notes } =
      parsedBody;

    const normalizedAccountName = normalizeString(accountName);
    if (normalizedAccountName) {
      updates.accountName = normalizedAccountName;
    }

    const normalizedAccountType = normalizeString(accountType);
    if (accountType !== undefined) {
      if (!normalizedAccountType) {
        respondJson(res, 400, { error: "Validation failed", details: "accountType must be a non-empty string" });
        return;
      }
      updates.accountType = normalizedAccountType;
    }

    const normalizedOwnerId = normalizeString(ownerId);
    if (ownerId !== undefined) {
      if (!normalizedOwnerId) {
        respondJson(res, 400, { error: "Validation failed", details: "ownerId must be a non-empty string" });
        return;
      }
      updates.ownerId = normalizedOwnerId;
    }

    const normalizedStatus = normalizeString(status);
    if (status !== undefined) {
      if (!normalizedStatus) {
        respondJson(res, 400, { error: "Validation failed", details: "status must be a non-empty string" });
        return;
      }
      const allowedStatuses = accountStatusEnum.enumValues;
      if (!(allowedStatuses as string[]).includes(normalizedStatus)) {
        respondJson(res, 400, {
          error: "Invalid status value",
          details: `Status must be one of: ${allowedStatuses.join(", ")}`,
        });
        return;
      }
      updates.status = normalizedStatus;
    }

    if (parentAccountId !== undefined) {
      const normalizedParent = normalizeString(parentAccountId);
      updates.parentAccountId = normalizedParent ?? null;
    }

    if (assetRef !== undefined) {
      const normalizedAssetRef = normalizeString(assetRef);
      updates.assetRef = normalizedAssetRef ?? null;
    }

    if (imgUrl !== undefined) {
      const normalizedImg = normalizeString(imgUrl);
      updates.imgUrl = normalizedImg ?? null;
    }

    if (notes !== undefined) {
      if (typeof notes === "string") {
        const trimmedNotes = notes.trim();
        updates.notes = trimmedNotes.length > 0 ? trimmedNotes : null;
      } else if (notes === null) {
        updates.notes = null;
      } else {
        respondJson(res, 400, { error: "Validation failed", details: "notes must be a string or null" });
        return;
      }
    }

    if (Object.keys(updates).length === 0) {
      respondJson(res, 400, { error: "No updates provided" });
      return;
    }

    updates.updatedAt = new Date();

    try {
      const [updated] = await db
        .update(accounts)
        .set(updates)
        .where(eq(accounts.accountId, accountId))
        .returning({ accountId: accounts.accountId });

      if (!updated) {
        respondJson(res, 404, { error: "Account not found" });
        return;
      }

      const account = await selectAccountById(db, accountId);
      if (!account) {
        respondJson(res, 200, { accountId });
        return;
      }
      respondJson(res, 200, account);
    } catch (error) {
      console.error(`Failed to update account ${accountId}`, error);
      const details = error instanceof Error ? error.message : "Unknown error";
      respondJson(res, 400, { error: "Failed to update account", details });
    }
    return;
  }

  if (req.method === "DELETE") {
    try {
      const deleted = await db
        .delete(accounts)
        .where(eq(accounts.accountId, accountId))
        .returning({ accountId: accounts.accountId });

      if (deleted.length === 0) {
        respondJson(res, 404, { error: "Account not found" });
        return;
      }

      res.status(204).end();
    } catch (error) {
      console.error(`Failed to delete account ${accountId}`, error);
      const details = error instanceof Error ? error.message : "Unknown error";
      respondJson(res, 400, { error: "Failed to delete account", details });
    }
    return;
  }

  res.setHeader("Allow", ["GET", "PUT", "PATCH", "DELETE"]);
  respondJson(res, 405, { error: "Method not allowed" });
}
