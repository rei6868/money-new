import type { NextApiRequest, NextApiResponse } from "next";
import { eq } from "drizzle-orm";

import { db } from "../../../lib/db/client";
import { shops, shopTypeEnum, shopStatusEnum, type NewShop } from "../../../src/db/schema/shops";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const database = db;

  if (!database) {
    console.error("Database connection is not configured");
    res.status(500).json({ error: "Database connection is not configured" });
    return;
  }

  const { id } = req.query;
  const shopId = Array.isArray(id) ? id[0] : id;

  if (!shopId) {
    res.status(400).json({ message: "Shop id is required" });
    return;
  }

  if (req.method === "GET") {
    try {
      const result = await database.select().from(shops).where(eq(shops.shopId, shopId));
      if (result.length === 0) {
        res.status(404).json({ message: "Shop not found" });
        return;
      }
      res.status(200).json(result[0]);
    } catch (error) {
      console.error(`Failed to fetch shop with id ${shopId}`, error);
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
      
      if (body.shopName !== undefined) updates.shopName = body.shopName;
      if (body.imgUrl !== undefined) updates.imgUrl = body.imgUrl;
      if (body.url !== undefined) updates.url = body.url;
      if (body.notes !== undefined) updates.notes = body.notes;

      // Enum validation
      if (body.shopType !== undefined) {
        const allowedTypes = shopTypeEnum.enumValues as readonly string[];
        if (!allowedTypes.includes(body.shopType)) {
          res.status(400).json({ 
            error: "Validation failed", 
            details: `shopType must be one of: ${allowedTypes.join(", ")}` 
          });
          return;
        }
        updates.shopType = body.shopType;
      }

      if (body.status !== undefined) {
        const allowedStatuses = shopStatusEnum.enumValues as readonly string[];
        if (!allowedStatuses.includes(body.status)) {
          res.status(400).json({ 
            error: "Validation failed", 
            details: `status must be one of: ${allowedStatuses.join(", ")}` 
          });
          return;
        }
        updates.status = body.status;
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
        .update(shops)
        .set(updates)
        .where(eq(shops.shopId, shopId))
        .returning();

      if (updated.length === 0) {
        res.status(404).json({ message: "Shop not found" });
        return;
      }

      res.status(200).json(updated[0]);
    } catch (error) {
      console.error(`Failed to update shop with id ${shopId}`, error);
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: message });
    }
    return;
  }

  if (req.method === "DELETE") {
    try {
      const deleted = await database.delete(shops).where(eq(shops.shopId, shopId)).returning();
      if (deleted.length === 0) {
        res.status(404).json({ message: "Shop not found" });
        return;
      }
      res.status(200).json(deleted[0]);
    } catch (error) {
      console.error(`Failed to delete shop with id ${shopId}`, error);
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: message });
    }
    return;
  }

  res.setHeader("Allow", ["GET", "PUT", "PATCH", "DELETE"]);
  res.status(405).json({ error: "Method not allowed" });
}
