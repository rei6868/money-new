import type { NextApiRequest, NextApiResponse } from "next";
import { asc } from "drizzle-orm";
import { randomUUID } from "crypto";

import { db } from "../../../lib/db/client";
import { categories, categoryKindEnum, type NewCategory } from "../../../src/db/schema/categories";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const database = db;

  if (!database) {
    console.error("Database connection is not configured");
    res.status(500).json({ error: "Database connection is not configured" });
    return;
  }

  if (req.method === "GET") {
    try {
      const result = await database.select().from(categories).orderBy(asc(categories.name));
      res.status(200).json(result);
    } catch (error) {
      console.error("Failed to fetch categories", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: message });
    }
    return;
  }

  if (req.method === "POST") {
    try {
      const body = req.body || {};
      
      // ✅ VALIDATE required fields
      if (!body.name || !body.kind) {
        res.status(400).json({ 
          error: "Validation failed", 
          details: "name and kind are required" 
        });
        return;
      }

      // ✅ VALIDATE categoryKind enum
      const allowedKinds = categoryKindEnum.enumValues as readonly string[];
      if (!allowedKinds.includes(body.kind)) {
        res.status(400).json({ 
          error: "Validation failed", 
          details: `kind must be one of: ${allowedKinds.join(", ")}` 
        });
        return;
      }

      // ✅ BUILD INSERT PAYLOAD with auto UUID
      const payload: NewCategory = {
        categoryId: randomUUID(),
        name: body.name,
        kind: body.kind,
        parentCategoryId: body.parentCategoryId || null,
        description: body.description || null,
      };

      const created = await database.insert(categories).values(payload).returning();
      res.status(201).json(created[0]);
    } catch (error) {
      console.error("Failed to create category", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: message });
    }
    return;
  }

  res.setHeader("Allow", ["GET", "POST"]);
  res.status(405).json({ error: "Method not allowed" });
}
