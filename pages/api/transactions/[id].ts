import type { NextApiRequest, NextApiResponse } from "next";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { db } from "../../../lib/db/client";
import {
  transactions,
  transactionStatusEnum,
  transactionTypeEnum,
  type Transaction,
} from "../../../src/db/schema/transactions";
import { transactionHistory, type NewTransactionHistory } from "../../../src/db/schema/transactionHistory";
import { cashbackMovements } from "../../../src/db/schema/cashbackMovements";
import { debtMovements } from "../../../src/db/schema/debtMovements";

type DatabaseClient = NodePgDatabase<Record<string, never>>;

type TransactionAction = "update" | "delete" | "cashback_update";

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

function getTransactionId(req: NextApiRequest): string | null {
  const raw = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  return typeof raw === "string" && raw.trim().length > 0 ? raw : null;
}

function pickEditedBy(req: NextApiRequest): string | null {
  const candidates = [
    req.headers["x-user-id"],
    req.headers["x-request-user"],
    req.headers["x-user"],
    req.headers["x-actor-id"],
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (Array.isArray(candidate)) {
      const value = candidate.find((item) => typeof item === "string" && item.trim().length > 0);
      if (value) return value;
      continue;
    }
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate;
    }
  }
  return null;
}

function normalizeNumeric(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  return numeric.toFixed(2);
}

function coerceOptionalString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseUpdatePayload(body: Record<string, unknown>) {
  const updates: Record<string, unknown> = {};
  let hasMutations = false;

  if (body.accountId !== undefined) {
    if (body.accountId === null) {
      throw new ValidationError("accountId cannot be null");
    }
    if (typeof body.accountId !== "string" || body.accountId.trim().length === 0) {
      throw new ValidationError("accountId must be a non-empty string");
    }
    updates.accountId = body.accountId.trim();
    hasMutations = true;
  }

  if (body.personId !== undefined) {
    updates.personId = coerceOptionalString(body.personId);
    hasMutations = true;
  }

  if (body.categoryId !== undefined) {
    updates.categoryId = coerceOptionalString(body.categoryId);
    hasMutations = true;
  }

  if (body.shopId !== undefined) {
    updates.shopId = coerceOptionalString(body.shopId);
    hasMutations = true;
  }

  if (body.subscriptionMemberId !== undefined) {
    updates.subscriptionMemberId = coerceOptionalString(body.subscriptionMemberId);
    hasMutations = true;
  }

  if (body.linkedTxnId !== undefined) {
    updates.linkedTxnId = coerceOptionalString(body.linkedTxnId);
    hasMutations = true;
  }

  if (body.type !== undefined) {
    const allowedTypes = transactionTypeEnum.enumValues as readonly string[];
    if (typeof body.type !== "string" || !allowedTypes.includes(body.type)) {
      throw new ValidationError(`type must be one of: ${allowedTypes.join(", ")}`);
    }
    updates.type = body.type;
    hasMutations = true;
  }

  if (body.status !== undefined) {
    const allowedStatuses = transactionStatusEnum.enumValues as readonly string[];
    if (typeof body.status !== "string" || !allowedStatuses.includes(body.status)) {
      throw new ValidationError(`status must be one of: ${allowedStatuses.join(", ")}`);
    }
    updates.status = body.status;
    hasMutations = true;
  }

  if (body.occurredOn !== undefined) {
    if (typeof body.occurredOn !== "string" || body.occurredOn.trim().length === 0) {
      throw new ValidationError("occurredOn must be an ISO date string");
    }
    const occurredOn = new Date(`${body.occurredOn}T00:00:00Z`);
    if (Number.isNaN(occurredOn.getTime())) {
      throw new ValidationError("occurredOn must be a valid date");
    }
    updates.occurredOn = occurredOn;
    hasMutations = true;
  }

  if (body.notes !== undefined) {
    if (body.notes === null) {
      updates.notes = null;
    } else if (typeof body.notes === "string") {
      updates.notes = body.notes.trim() || null;
    } else {
      throw new ValidationError("notes must be a string or null");
    }
    hasMutations = true;
  }

  if (body.amount !== undefined) {
    if (body.amount === null) {
      throw new ValidationError("amount cannot be null");
    }
    const numericValue = Number(body.amount);
    if (!Number.isFinite(numericValue)) {
      throw new ValidationError("amount must be a valid number");
    }
    updates.amount = numericValue.toFixed(2);
    hasMutations = true;
  }

  if (body.fee !== undefined) {
    if (body.fee === null || body.fee === "") {
      updates.fee = null;
      hasMutations = true;
    } else {
      const numericValue = Number(body.fee);
      if (!Number.isFinite(numericValue)) {
        throw new ValidationError("fee must be a valid number");
      }
      updates.fee = numericValue.toFixed(2);
      hasMutations = true;
    }
  }

  return { updates, hasMutations };
}

async function getCashbackTotal(
  client: DatabaseClient,
  transactionId: string,
): Promise<string | null> {
  const rows = await client
    .select({ cashbackAmount: cashbackMovements.cashbackAmount })
    .from(cashbackMovements)
    .where(eq(cashbackMovements.transactionId, transactionId));

  if (!rows.length) {
    return null;
  }

  const total = rows.reduce((acc, row) => {
    const value = normalizeNumeric(row.cashbackAmount);
    return acc + (value ? Number(value) : 0);
  }, 0);

  return total === 0 ? "0.00" : total.toFixed(2);
}

async function getDebtTotal(
  client: DatabaseClient,
  transactionId: string,
): Promise<string | null> {
  const rows = await client
    .select({ amount: debtMovements.amount })
    .from(debtMovements)
    .where(eq(debtMovements.transactionId, transactionId));

  if (!rows.length) {
    return null;
  }

  const total = rows.reduce((acc, row) => {
    const value = normalizeNumeric(row.amount);
    return acc + (value ? Number(value) : 0);
  }, 0);

  return total === 0 ? "0.00" : total.toFixed(2);
}

async function getNextSeqNo(client: DatabaseClient, txnId: string): Promise<number> {
  const [result] = await client
    .select({
      maxSeq: sql<number>`COALESCE(MAX(${transactionHistory.seqNo}), 0)`,
    })
    .from(transactionHistory)
    .where(eq(transactionHistory.transactionId, txnId));

  const value = result?.maxSeq ?? 0;
  return Number(value) + 1;
}

async function recordHistory(
  client: DatabaseClient,
  payload: Omit<NewTransactionHistory, "historyId" | "createdAt" | "seqNo"> & { transactionId: string },
): Promise<void> {
  const nextSeq = await getNextSeqNo(client, payload.transactionId);
  await client.insert(transactionHistory).values({
    ...payload,
    seqNo: nextSeq,
  });
}

function resolveActionType(
  oldAmount: string | null,
  newAmount: string | null,
  oldCashback: string | null,
  newCashback: string | null,
): TransactionAction {
  const normalizedOldAmount = normalizeNumeric(oldAmount);
  const normalizedNewAmount = normalizeNumeric(newAmount);
  const normalizedOldCashback = normalizeNumeric(oldCashback);
  const normalizedNewCashback = normalizeNumeric(newCashback);

  if (
    normalizedOldAmount === normalizedNewAmount &&
    normalizedOldCashback !== normalizedNewCashback
  ) {
    return "cashback_update";
  }
  return "update";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const database = db;

  if (!database) {
    console.error("Database connection is not configured");
    res.status(500).json({ error: "Database connection is not configured" });
    return;
  }

  const transactionId = getTransactionId(req);
  if (!transactionId) {
    res.status(400).json({ message: "Transaction id is required" });
    return;
  }

  if (req.method === "GET") {
    try {
      const [transaction] = await database
        .select()
        .from(transactions)
        .where(eq(transactions.transactionId, transactionId));

      if (!transaction) {
        res.status(404).json({ message: "Transaction not found" });
        return;
      }

      res.status(200).json(transaction);
    } catch (error) {
      console.error(`Failed to fetch transaction ${transactionId}`, error);
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: message });
    }
    return;
  }

  if (req.method === "PUT" || req.method === "PATCH") {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const { updates, hasMutations } = parseUpdatePayload(body);

      if (!hasMutations) {
        res.status(400).json({ error: "No valid fields to update" });
        return;
      }

      updates.updatedAt = new Date();
      const editedBy = pickEditedBy(req);

      const result = await database.transaction(async (tx) => {
        const [existing] = await tx
          .select()
          .from(transactions)
          .where(eq(transactions.transactionId, transactionId));

        if (!existing) {
          return { kind: "not_found" } as const;
        }

        const txClient = tx as DatabaseClient;

        const oldAmount = normalizeNumeric(existing.amount as string | null);
        const oldCashback = await getCashbackTotal(txClient, transactionId);

        const updatedRows = await tx
          .update(transactions)
          .set(updates)
          .where(eq(transactions.transactionId, transactionId))
          .returning();

        if (updatedRows.length === 0) {
          return { kind: "not_found" } as const;
        }

        const updated = updatedRows[0] as Transaction;
        const newAmount = normalizeNumeric(updated.amount as string | null);
        const newCashback = await getCashbackTotal(txClient, transactionId);
        const actionType = resolveActionType(oldAmount, newAmount, oldCashback, newCashback);

        await recordHistory(txClient, {
          transactionId,
          oldAmount,
          newAmount,
          oldCashback,
          newCashback,
          oldDebt: null,
          newDebt: null,
          actionType,
          editedBy,
        });

        return { kind: "success", payload: updated } as const;
      });

      if (result.kind === "not_found") {
        res.status(404).json({ message: "Transaction not found" });
        return;
      }

      res.status(200).json(result.payload);
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
        return;
      }
      console.error(`Failed to update transaction ${transactionId}`, error);
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: message });
    }
    return;
  }

  if (req.method === "DELETE") {
    try {
      const editedBy = pickEditedBy(req);

      const result = await database.transaction(async (tx) => {
        const [existing] = await tx
          .select()
          .from(transactions)
          .where(eq(transactions.transactionId, transactionId));

        if (!existing) {
          return { kind: "not_found" } as const;
        }

        const txClient = tx as DatabaseClient;

        const oldAmount = normalizeNumeric(existing.amount as string | null);
        const oldCashback = await getCashbackTotal(txClient, transactionId);
        const oldDebt = await getDebtTotal(txClient, transactionId);

        await recordHistory(txClient, {
          transactionId,
          oldAmount,
          newAmount: null,
          oldCashback,
          newCashback: null,
          oldDebt,
          newDebt: null,
          actionType: "delete",
          editedBy,
        });

        await tx.delete(cashbackMovements).where(eq(cashbackMovements.transactionId, transactionId));
        await tx.delete(debtMovements).where(eq(debtMovements.transactionId, transactionId));

        const deletedRows = await tx
          .delete(transactions)
          .where(eq(transactions.transactionId, transactionId))
          .returning();

        if (deletedRows.length === 0) {
          return { kind: "not_found" } as const;
        }

        return { kind: "success", payload: deletedRows[0] as Transaction } as const;
      });

      if (result.kind === "not_found") {
        res.status(404).json({ message: "Transaction not found" });
        return;
      }

      res.status(200).json(result.payload);
    } catch (error) {
      console.error(`Failed to delete transaction ${transactionId}`, error);
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: message });
    }
    return;
  }

  res.setHeader("Allow", ["GET", "PUT", "PATCH", "DELETE"]);
  res.status(405).json({ error: "Method not allowed" });
}
