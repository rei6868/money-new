import type { NextApiRequest, NextApiResponse } from "next";
import { asc } from "drizzle-orm";
import { randomUUID } from "crypto";

import { db } from "../../../lib/db/client";
import { shops, shopTypeEnum, shopStatusEnum, type NewShop } from "../../../src/db/schema/shops";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const database = db;

  if (!database) {
    console.error("Database connection is not configured");
    res.status(500).json({ error: "Database connection is not configured" });
    return;
  }

  if (req.method === "GET") {
    try {
      const result = await database.select().from(shops).orderBy(asc(shops.shopName));
      res.status(200).json(result);
    } catch (error) {
      console.error("Failed to fetch shops", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: message });
    }
    return;
  }

  if (req.method === "POST") {
    try {
      const body = req.body || {};
      
      // ✅ VALIDATE required fields
      if (!body.shopName || !body.shopType || !body.status) {
        res.status(400).json({ 
          error: "Validation failed", 
          details: "shopName, shopType, and status are required" 
        });
        return;
      }

      // ✅ VALIDATE shopType enum
      const allowedTypes = shopTypeEnum.enumValues as readonly string[];
      if (!allowedTypes.includes(body.shopType)) {
        res.status(400).json({ 
          error: "Validation failed", 
          details: `shopType must be one of: ${allowedTypes.join(", ")}` 
        });
        return;
      }

      // ✅ VALIDATE shopStatus enum
      const allowedStatuses = shopStatusEnum.enumValues as readonly string[];
      if (!allowedStatuses.includes(body.status)) {
        res.status(400).json({ 
          error: "Validation failed", 
          details: `status must be one of: ${allowedStatuses.join(", ")}` 
        });
        return;
      }

      // ✅ BUILD INSERT PAYLOAD with auto UUID
      const payload: NewShop = {
        shopId: randomUUID(),
        shopName: body.shopName,
        shopType: body.shopType,
        imgUrl: body.imgUrl || null,
        url: body.url || null,
        status: body.status,
        notes: body.notes || null,
      };

      const created = await database.insert(shops).values(payload).returning();
      res.status(201).json(created[0]);
    } catch (error) {
      console.error("Failed to create shop", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: message });
    }
    return;
  }

  res.setHeader("Allow", ["GET", "POST"]);
  res.status(405).json({ error: "Method not allowed" });
}
