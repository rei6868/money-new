import type { NextApiRequest, NextApiResponse } from "next";
import { eq } from "drizzle-orm";

import { getDb } from "../../../lib/db/client";
import {
  categories,
  categoryKindEnum,
  type NewCategory,
} from "../../../src/db/schema/categories";

type DbClient = NonNullable<ReturnType<typeof getDb>>;

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
      console.error("Failed to parse JSON payload for /api/categories/[id]", error);
      return null;
    }
  }
  if (typeof raw === "object") {
    return raw as Record<string, unknown>;
  }
  return null;
};

const validateParentCategory = async (db: DbClient, parentCategoryId: string): Promise<boolean> => {
  const existingParent = await db
    .select({ categoryId: categories.categoryId })
    .from(categories)
    .where(eq(categories.categoryId, parentCategoryId))
    .limit(1);
  return existingParent.length > 0;
};

const fetchCategoryById = async (db: DbClient, categoryId: string) => {
  const [category] = await db
    .select()
    .from(categories)
    .where(eq(categories.categoryId, categoryId))
    .limit(1);
  return category ?? null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = toSingle(req.query.id);
  if (!id) {
    respondJson(res, 400, { error: "Validation failed", details: "Category id is required" });
    return;
  }

  const db = getDb();
  if (!db) {
    respondJson(res, 503, { error: "Database connection is not configured" });
    return;
  }

  if (req.method === "GET") {
    try {
      const category = await fetchCategoryById(db, id);
      if (!category) {
        respondJson(res, 404, { error: "Category not found" });
        return;
      }
      respondJson(res, 200, category);
    } catch (error) {
      console.error(`Failed to fetch category '${id}'`, error);
      const details = error instanceof Error ? error.message : "Unknown error";
      respondJson(res, 500, { error: "Failed to fetch category", details });
    }
    return;
  }

  if (req.method === "PUT" || req.method === "PATCH") {
    const parsedBody = parseRequestBody(req.body);
    if (parsedBody === null) {
      respondJson(res, 400, { error: "Validation failed", details: "Invalid JSON payload" });
      return;
    }

    const payload = parsedBody as Partial<NewCategory>;
    const updates: Partial<NewCategory> = {};

    if (payload.name !== undefined) {
      const name = normalizeString(payload.name);
      if (!name) {
        respondJson(res, 400, {
          error: "Validation failed",
          details: "name must be a non-empty string",
        });
        return;
      }
      updates.name = name;
    }

    if (payload.kind !== undefined) {
      const kind = normalizeEnumValue(payload.kind, categoryKindEnum.enumValues);
      if (!kind) {
        respondJson(res, 400, {
          error: "Validation failed",
          details: `kind must be one of: ${categoryKindEnum.enumValues.join(", ")}`,
        });
        return;
      }
      updates.kind = kind as (typeof categoryKindEnum.enumValues)[number];
    }

    if (payload.description !== undefined) {
      if (typeof payload.description === "string") {
        const trimmed = payload.description.trim();
        updates.description = trimmed.length > 0 ? trimmed : null;
      } else if (payload.description === null) {
        updates.description = null;
      } else {
        respondJson(res, 400, {
          error: "Validation failed",
          details: "description must be a string or null",
        });
        return;
      }
    }

    if (payload.parentCategoryId !== undefined) {
      if (payload.parentCategoryId === null) {
        updates.parentCategoryId = null;
      } else {
        const normalizedParent = normalizeString(payload.parentCategoryId);
        if (!normalizedParent) {
          respondJson(res, 400, {
            error: "Validation failed",
            details: "parentCategoryId must be a non-empty string or null",
          });
          return;
        }
        if (normalizedParent === id) {
          respondJson(res, 400, {
            error: "Validation failed",
            details: "parentCategoryId cannot reference the category itself",
          });
          return;
        }
        try {
          const parentExists = await validateParentCategory(db, normalizedParent);
          if (!parentExists) {
            respondJson(res, 400, {
              error: "Invalid parentCategoryId",
              message: `Parent category with ID '${normalizedParent}' not found.`,
            });
            return;
          }
        } catch (error) {
          console.error("Failed to validate parent category for update", error);
          respondJson(res, 500, {
            error: "Failed to update category",
            details: "Internal server error",
          });
          return;
        }
        updates.parentCategoryId = normalizedParent;
      }
    }

    if (Object.keys(updates).length === 0) {
      respondJson(res, 400, {
        error: "Validation failed",
        details: "No valid fields provided for update",
      });
      return;
    }

    updates.updatedAt = new Date();

    try {
      const [updated] = await db
        .update(categories)
        .set(updates)
        .where(eq(categories.categoryId, id))
        .returning();
      if (!updated) {
        respondJson(res, 404, { error: "Category not found" });
        return;
      }
      respondJson(res, 200, updated);
    } catch (error) {
      console.error(`Failed to update category '${id}'`, error);
      const details = error instanceof Error ? error.message : "Unknown error";
      respondJson(res, 500, { error: "Failed to update category", details });
    }
    return;
  }

  if (req.method === "DELETE") {
    try {
      const [deleted] = await db
        .delete(categories)
        .where(eq(categories.categoryId, id))
        .returning({ categoryId: categories.categoryId });
      if (!deleted) {
        respondJson(res, 404, { error: "Category not found" });
        return;
      }
      res.status(204).end();
    } catch (error) {
      console.error(`Failed to delete category '${id}'`, error);
      const details = error instanceof Error ? error.message : "Unknown error";
      respondJson(res, 500, { error: "Failed to delete category", details });
    }
    return;
  }

  res.setHeader("Allow", ["GET", "PUT", "PATCH", "DELETE"]);
  respondJson(res, 405, { error: "Method not allowed" });
}
