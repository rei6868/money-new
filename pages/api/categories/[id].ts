import type { NextApiRequest, NextApiResponse } from "next";
import { eq } from "drizzle-orm";

import { db } from "../../../lib/db/client";
import { categories, categoryKindEnum, type NewCategory } from "../../../src/db/schema/categories";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const database = db;

  if (!database) {
    console.error("Database connection is not configured");
    res.status(500).json({ error: "Database connection is not configured" });
    return;
  }

  const { id } = req.query;
  const categoryId = Array.isArray(id) ? id[0] : id;

  if (!categoryId) {
    res.status(400).json({ message: "Category id is required" });
    return;
  }

  if (req.method === "GET") {
    try {
      const result = await database.select().from(categories).where(eq(categories.categoryId, categoryId));
      if (result.length === 0) {
        res.status(404).json({ message: "Category not found" });
        return;
      }
      res.status(200).json(result[0]);
    } catch (error) {
      console.error(`Failed to fetch category with id ${categoryId}`, error);
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: message });
    }
    return;
  }

  if (req.method === "PUT" || req.method === "PATCH") {
    try {
      const body = req.body || {};
      
      // ✅ BUILD UPDATE OBJECT
      const updates: any = {};
      
      if (body.name !== undefined) updates.name = body.name;
      if (body.parentCategoryId !== undefined) updates.parentCategoryId = body.parentCategoryId;
      if (body.description !== undefined) updates.description = body.description;

      // Enum validation
      if (body.kind !== undefined) {
        const allowedKinds = categoryKindEnum.enumValues as readonly string[];
        if (!allowedKinds.includes(body.kind)) {
          res.status(400).json({ 
            error: "Validation failed", 
            details: `kind must be one of: ${allowedKinds.join(", ")}` 
          });
          return;
        }
        updates.kind = body.kind;
      }

      // ✅ AUTO UPDATE timestamp
      updates.updatedAt = new Date();

      // ✅ CHECK: Có gì để update không?
      const updateKeys = Object.keys(updates).filter(key => key !== 'updatedAt');
      if (updateKeys.length === 0) {
        res.status(400).json({ error: "No valid fields to update" });
        return;
      }

      const updated = await database
        .update(categories)
        .set(updates)
        .where(eq(categories.categoryId, categoryId))
        .returning();

      if (updated.length === 0) {
        res.status(404).json({ message: "Category not found" });
        return;
      }

      res.status(200).json(updated[0]);
    } catch (error) {
      console.error(`Failed to update category with id ${categoryId}`, error);
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: message });
    }
    return;
  }

  if (req.method === "DELETE") {
    try {
      const deleted = await database.delete(categories).where(eq(categories.categoryId, categoryId)).returning();
      if (deleted.length === 0) {
        res.status(404).json({ message: "Category not found" });
        return;
      }
      res.status(200).json(deleted[0]);
    } catch (error) {
      console.error(`Failed to delete category with id ${categoryId}`, error);
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: message });
    }
    return;
  }

  res.setHeader("Allow", ["GET", "PUT", "PATCH", "DELETE"]);
  res.status(405).json({ error: "Method not allowed" });
}
