import type { NextApiRequest, NextApiResponse } from "next";
import { eq } from "drizzle-orm";

import { getDb } from "../../../lib/db/client";
import { accounts, type NewAccount } from "../../../src/db/schema/accounts";
import { people } from "../../../src/db/schema/people";

type AccountDetails = {
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

const normalizeNullableString = (value: unknown): string | null | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
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
      console.error("Failed to parse JSON payload for /api/accounts/[id]", error);
      return null;
    }
  }
  if (typeof raw === "object") {
    return raw as Record<string, unknown>;
  }
  return null;
};

const fetchSingleAccount = async (
  db: NonNullable<ReturnType<typeof getDb>>,
  accountId: string,
): Promise<AccountDetails | null> => {
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
    .leftJoin(people, eq(accounts.ownerId, people.personId))
    .where(eq(accounts.accountId, accountId))
    .limit(1);

  const [row] = rows;
  if (!row) {
    return null;
  }

  return {
    ...row,
    imgUrl: row.imgUrl ?? null,
    notes: row.notes ?? null,
    parentAccountId: row.parentAccountId ?? null,
    assetRef: row.assetRef ?? null,
    ownerName: row.ownerName ?? null,
  };
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

  try {
    if (req.method === "GET") {
      const account = await fetchSingleAccount(db, accountId);
      if (!account) {
        respondJson(res, 404, { error: "Account not found" });
        return;
      }
      respondJson(res, 200, account);
      return;
    }

    if (req.method === "PUT" || req.method === "PATCH") {
      const parsedBody = parseRequestBody(req.body);
      if (parsedBody === null) {
        respondJson(res, 400, { error: "Validation failed", details: "Invalid JSON payload" });
        return;
      }

      if (Object.prototype.hasOwnProperty.call(parsedBody, "openingBalance")) {
        respondJson(res, 400, { error: "Validation failed", details: "openingBalance cannot be updated" });
        return;
      }

      const updates: Partial<NewAccount> & { updatedAt?: Date } = {};

      const accountName = normalizeString(parsedBody.accountName);
      if (accountName) {
        updates.accountName = accountName;
      }

      if (parsedBody.accountType !== undefined) {
        const accountType = normalizeString(parsedBody.accountType);
        if (!accountType) {
          respondJson(res, 400, { error: "Validation failed", details: "accountType must be a non-empty string" });
          return;
        }
        updates.accountType = accountType;
      }

      if (parsedBody.ownerId !== undefined) {
        const ownerId = normalizeString(parsedBody.ownerId);
        if (!ownerId) {
          respondJson(res, 400, { error: "Validation failed", details: "ownerId must be a non-empty string" });
          return;
        }

        const [owner] = await db
          .select({ personId: people.personId })
          .from(people)
          .where(eq(people.personId, ownerId))
          .limit(1);
        if (!owner) {
          respondJson(res, 400, { error: "Validation failed", details: "ownerId does not reference a valid person" });
          return;
        }

        updates.ownerId = ownerId;
      }

      if (parsedBody.currentBalance !== undefined) {
        const currentBalance = normalizeNumeric(parsedBody.currentBalance);
        if (!currentBalance) {
          respondJson(res, 400, {
            error: "Validation failed",
            details: "currentBalance must be a valid numeric value",
          });
          return;
        }
        updates.currentBalance = currentBalance;
      }

      if (parsedBody.status !== undefined) {
        const status = normalizeString(parsedBody.status);
        if (!status) {
          respondJson(res, 400, { error: "Validation failed", details: "status must be a non-empty string" });
          return;
        }
        updates.status = status;
      }

      const imgUrl = normalizeNullableString(parsedBody.imgUrl);
      if (imgUrl !== undefined) {
        updates.imgUrl = imgUrl;
      }

      const notes = normalizeNullableString(parsedBody.notes);
      if (notes !== undefined) {
        updates.notes = notes;
      }

      const parentAccountId = normalizeNullableString(parsedBody.parentAccountId);
      if (parentAccountId !== undefined) {
        updates.parentAccountId = parentAccountId;
      }

      const assetRef = normalizeNullableString(parsedBody.assetRef);
      if (assetRef !== undefined) {
        updates.assetRef = assetRef;
      }

      if (Object.keys(updates).length === 0) {
        respondJson(res, 400, { error: "No updates provided" });
        return;
      }

      updates.updatedAt = new Date();

      const [updated] = await db.update(accounts).set(updates).where(eq(accounts.accountId, accountId)).returning();
      if (!updated) {
        respondJson(res, 404, { error: "Account not found" });
        return;
      }

      const account = await fetchSingleAccount(db, accountId);
      if (!account) {
        respondJson(res, 404, { error: "Account not found" });
        return;
      }

      respondJson(res, 200, account);
      return;
    }

    if (req.method === "DELETE") {
      const deleted = await db.delete(accounts).where(eq(accounts.accountId, accountId)).returning({ accountId: accounts.accountId });
      if (deleted.length === 0) {
        respondJson(res, 404, { error: "Account not found" });
        return;
      }
      res.status(204).end();
      return;
    }
  } catch (error) {
    console.error(`Failed to handle ${req.method} /api/accounts/${accountId}`, error);
    respondJson(res, 500, { error: "Failed to process request" });
    return;
  }

  res.setHeader("Allow", ["GET", "PUT", "PATCH", "DELETE"]);
  respondJson(res, 405, { error: "Method not allowed" });
}

