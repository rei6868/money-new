import type { NextApiRequest, NextApiResponse } from "next";
import { eq } from "drizzle-orm";

import { getDb } from "../../../lib/db/client";
import {
  shops,
  shopStatusEnum,
  shopTypeEnum,
  type NewShop,
} from "../../../src/db/schema/shops";

type DbClient = NonNullable<ReturnType<typeof getDb>>;

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
      console.error("Failed to parse JSON payload for /api/shops/[id]", error);
      return null;
    }
  }
  if (typeof raw === "object") {
    return raw as Record<string, unknown>;
  }
  return null;
};

const normalizeEnumValue = (value: unknown, allowed: readonly string[]): string | null => {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }
  const candidate = normalized.toLowerCase();
  return allowed.includes(candidate) ? candidate : null;
};

const selectShopById = async (db: DbClient, shopId: string) => {
  const [shop] = await db.select().from(shops).where(eq(shops.shopId, shopId)).limit(1);
  return shop ?? null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = getDb();
  if (!db) {
    respondJson(res, 503, { error: "Database connection is not configured" });
    return;
  }

  const shopId = toSingle(req.query.id);
  if (!shopId) {
    respondJson(res, 400, { error: "Shop id is required" });
    return;
  }

  if (req.method === "GET") {
    try {
      const shop = await selectShopById(db, shopId);
      if (!shop) {
        respondJson(res, 404, { error: "Shop not found" });
        return;
      }
      respondJson(res, 200, shop);
    } catch (error) {
      console.error(`Failed to fetch shop ${shopId}`, error);
      const details = error instanceof Error ? error.message : "Unknown error";
      respondJson(res, 500, { error: "Failed to fetch shop", details });
    }
    return;
  }

  if (req.method === "PUT" || req.method === "PATCH") {
    const parsedBody = parseRequestBody(req.body);
    if (parsedBody === null) {
      respondJson(res, 400, { error: "Validation failed", details: "Invalid JSON payload" });
      return;
    }

    const payload = parsedBody as Partial<NewShop>;
    const updates: Partial<NewShop> = {};

    if (payload.shopName !== undefined) {
      const name = normalizeString(payload.shopName);
      if (!name) {
        respondJson(res, 400, { error: "Validation failed", details: "shopName must be a non-empty string" });
        return;
      }
      updates.shopName = name;
    }

    if (payload.shopType !== undefined) {
      const normalizedType = normalizeEnumValue(payload.shopType, shopTypeEnum.enumValues);
      if (!normalizedType) {
        respondJson(res, 400, {
          error: "Invalid shopType value",
          details: `shopType must be one of: ${shopTypeEnum.enumValues.join(", ")}`,
        });
        return;
      }
      updates.shopType = normalizedType as (typeof shopTypeEnum.enumValues)[number];
    }

    if (payload.status !== undefined) {
      const normalizedStatus = normalizeEnumValue(payload.status, shopStatusEnum.enumValues);
      if (!normalizedStatus) {
        respondJson(res, 400, {
          error: "Invalid status value",
          details: `status must be one of: ${shopStatusEnum.enumValues.join(", ")}`,
        });
        return;
      }
      updates.status = normalizedStatus as (typeof shopStatusEnum.enumValues)[number];
    }

    if (payload.imgUrl !== undefined) {
      const img = normalizeString(payload.imgUrl);
      updates.imgUrl = img ?? null;
    }

    if (payload.url !== undefined) {
      const url = normalizeString(payload.url);
      updates.url = url ?? null;
    }

    if (payload.notes !== undefined) {
      if (typeof payload.notes === "string") {
        const trimmedNotes = payload.notes.trim();
        updates.notes = trimmedNotes.length > 0 ? trimmedNotes : null;
      } else if (payload.notes === null) {
        updates.notes = null;
      } else {
        respondJson(res, 400, {
          error: "Validation failed",
          details: "notes must be a string or null",
        });
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
        .update(shops)
        .set(updates)
        .where(eq(shops.shopId, shopId))
        .returning();

      if (!updated) {
        respondJson(res, 404, { error: "Shop not found" });
        return;
      }

      respondJson(res, 200, updated);
    } catch (error) {
      console.error(`Failed to update shop ${shopId}`, error);
      const details = error instanceof Error ? error.message : "Unknown error";
      respondJson(res, 500, { error: "Failed to update shop", details });
    }
    return;
  }

  if (req.method === "DELETE") {
    try {
      const deleted = await db.delete(shops).where(eq(shops.shopId, shopId)).returning({ shopId: shops.shopId });
      if (deleted.length === 0) {
        respondJson(res, 404, { error: "Shop not found" });
        return;
      }
      res.status(204).end();
    } catch (error) {
      console.error(`Failed to delete shop ${shopId}`, error);
      const details = error instanceof Error ? error.message : "Unknown error";
      respondJson(res, 500, { error: "Failed to delete shop", details });
    }
    return;
  }

  res.setHeader("Allow", ["GET", "PUT", "PATCH", "DELETE"]);
  respondJson(res, 405, { error: "Method not allowed" });
}
