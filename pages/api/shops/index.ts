import type { NextApiRequest, NextApiResponse } from "next";
import { randomUUID } from "crypto";

import { getDb } from "../../../lib/db/client";
import {
  shops,
  shopStatusEnum,
  shopTypeEnum,
  type NewShop,
} from "../../../src/db/schema/shops";

type ShopListResponse = {
  shops: Array<typeof shops.$inferSelect>;
};

const respondJson = (res: NextApiResponse, status: number, payload: unknown): void => {
  res.setHeader("Content-Type", "application/json");
  res.status(status).json(payload);
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
      console.error("Failed to parse JSON payload for /api/shops", error);
      return null;
    }
  }
  if (typeof raw === "object") {
    return raw as Record<string, unknown>;
  }
  return null;
};

const generateShopId = (): string => {
  if (typeof randomUUID === "function") {
    return randomUUID();
  }
  return `shop_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const normalizeEnumValue = (value: unknown, allowed: readonly string[]): string | null => {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }
  const candidate = normalized.toLowerCase();
  return allowed.includes(candidate) ? candidate : null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = getDb();
  if (!db) {
    respondJson(res, 503, { error: "Database connection is not configured" });
    return;
  }

  if (req.method === "GET") {
    try {
      const rows = await db.select().from(shops);
      const response: ShopListResponse = { shops: rows };
      respondJson(res, 200, response);
    } catch (error) {
      console.error("Failed to fetch shops", error);
      const details = error instanceof Error ? error.message : "Unknown error";
      respondJson(res, 500, { error: "Failed to fetch shops", details });
    }
    return;
  }

  if (req.method === "POST") {
    const parsedBody = parseRequestBody(req.body);
    if (parsedBody === null) {
      respondJson(res, 400, { error: "Validation failed", details: "Invalid JSON payload" });
      return;
    }

    const payload = parsedBody as Partial<NewShop>;

    const shopName = normalizeString(payload.shopName);
    const shopType = normalizeEnumValue(payload.shopType, shopTypeEnum.enumValues);
    const status = normalizeEnumValue(payload.status, shopStatusEnum.enumValues);

    if (!shopName || !shopType || !status) {
      respondJson(res, 400, {
        error: "Validation failed",
        details: "shopName, shopType, and status are required",
      });
      return;
    }

    const newShop: NewShop = {
      shopId: generateShopId(),
      shopName,
      shopType,
      status,
    };

    const optionalFields: Array<keyof Pick<NewShop, "imgUrl" | "url">> = ["imgUrl", "url"];
    for (const field of optionalFields) {
      const value = normalizeString(payload[field]);
      if (value) {
        newShop[field] = value;
      }
    }

    if (payload.notes !== undefined) {
      if (typeof payload.notes === "string") {
        const trimmedNotes = payload.notes.trim();
        newShop.notes = trimmedNotes.length > 0 ? trimmedNotes : null;
      } else if (payload.notes === null) {
        newShop.notes = null;
      } else {
        respondJson(res, 400, {
          error: "Validation failed",
          details: "notes must be a string or null",
        });
        return;
      }
    }

    try {
      const [created] = await db.insert(shops).values(newShop).returning();
      respondJson(res, 201, created ?? newShop);
    } catch (error) {
      console.error("Failed to create shop", error);
      const details = error instanceof Error ? error.message : "Unknown error";
      respondJson(res, 500, { error: "Failed to create shop", details });
    }
    return;
  }

  res.setHeader("Allow", ["GET", "POST"]);
  respondJson(res, 405, { error: "Method not allowed" });
}
