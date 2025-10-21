import type { NextApiRequest, NextApiResponse } from "next";
import { randomUUID } from "crypto";
import { asc, eq } from "drizzle-orm";

import { getDb } from "../../../lib/db/client";
import {
  categories,
  categoryKindEnum,
  type NewCategory,
} from "../../../src/db/schema/categories";

type DbClient = NonNullable<ReturnType<typeof getDb>>;

type CategoryListResponse = {
  categories: Array<typeof categories.$inferSelect>;
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

const normalizeEnumValue = (value: unknown, allowed: readonly string[]): string | null => {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }
  const candidate = normalized.toLowerCase();
  return allowed.includes(candidate) ? candidate : null;
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
      console.error("Failed to parse JSON payload for /api/categories", error);
      return null;
    }
  }
  if (typeof raw === "object") {
    return raw as Record<string, unknown>;
  }
  return null;
};

const generateCategoryId = (): string => {
  if (typeof randomUUID === "function") {
    return randomUUID();
  }
  return `cat_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const validateParentCategory = async (db: DbClient, parentCategoryId: string): Promise<boolean> => {
  const existingParent = await db
    .select({ categoryId: categories.categoryId })
    .from(categories)
    .where(eq(categories.categoryId, parentCategoryId))
    .limit(1);
  return existingParent.length > 0;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = getDb();
  if (!db) {
    respondJson(res, 503, { error: "Database connection is not configured" });
    return;
  }

  if (req.method === "GET") {
    try {
      const rows = await db.select().from(categories).orderBy(asc(categories.name));
      const response: CategoryListResponse = { categories: rows };
      respondJson(res, 200, response);
    } catch (error) {
      console.error("Failed to fetch categories", error);
      const details = error instanceof Error ? error.message : "Unknown error";
      respondJson(res, 500, { error: "Failed to fetch categories", details });
    }
    return;
  }

  if (req.method === "POST") {
    const parsedBody = parseRequestBody(req.body);
    if (parsedBody === null) {
      respondJson(res, 400, { error: "Validation failed", details: "Invalid JSON payload" });
      return;
    }

    const payload = parsedBody as Partial<NewCategory>;

    const name = normalizeString(payload.name);
    const kind = normalizeEnumValue(payload.kind, categoryKindEnum.enumValues) as
      | (typeof categoryKindEnum.enumValues)[number]
      | null;
    let parentCategoryId: string | null | undefined;

    if (payload.parentCategoryId !== undefined) {
      if (payload.parentCategoryId === null) {
        parentCategoryId = null;
      } else {
        const normalizedParent = normalizeString(payload.parentCategoryId);
        if (!normalizedParent) {
          respondJson(res, 400, {
            error: "Validation failed",
            details: "parentCategoryId must be a non-empty string or null",
          });
          return;
        }
        parentCategoryId = normalizedParent;
      }
    }

    if (!name || !kind) {
      respondJson(res, 400, {
        error: "Validation failed",
        details: `name and kind are required. Allowed kinds: ${categoryKindEnum.enumValues.join(", ")}`,
      });
      return;
    }

    const newCategoryId = generateCategoryId();

    if (typeof parentCategoryId === "string") {
      try {
        const parentExists = await validateParentCategory(db, parentCategoryId);
        if (!parentExists) {
          respondJson(res, 400, {
            error: "Invalid parentCategoryId",
            message: `Parent category with ID '${parentCategoryId}' not found.`,
          });
          return;
        }
      } catch (error) {
        console.error("Failed to validate parent category for create", error);
        respondJson(res, 500, {
          error: "Failed to create category",
          details: "Internal server error",
        });
        return;
      }
    }

    const newCategory: NewCategory = {
      categoryId: newCategoryId,
      name,
      kind,
    };

    if (typeof parentCategoryId === "string") {
      newCategory.parentCategoryId = parentCategoryId;
    } else if (parentCategoryId === null) {
      newCategory.parentCategoryId = null;
    }

    if (payload.description !== undefined) {
      if (typeof payload.description === "string") {
        const trimmed = payload.description.trim();
        newCategory.description = trimmed.length > 0 ? trimmed : null;
      } else if (payload.description === null) {
        newCategory.description = null;
      } else {
        respondJson(res, 400, {
          error: "Validation failed",
          details: "description must be a string or null",
        });
        return;
      }
    }

    try {
      const [created] = await db.insert(categories).values(newCategory).returning();
      respondJson(res, 201, created ?? newCategory);
    } catch (error) {
      console.error("Failed to create category", error);
      const details = error instanceof Error ? error.message : "Unknown error";
      respondJson(res, 500, { error: "Failed to create category", details });
    }
    return;
  }

  res.setHeader("Allow", ["GET", "POST"]);
  respondJson(res, 405, { error: "Method not allowed" });
}
