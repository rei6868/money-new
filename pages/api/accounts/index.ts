import type { NextApiRequest, NextApiResponse } from "next";
import { asc } from "drizzle-orm";
import { randomUUID } from "crypto";

import { db } from "../../../lib/db/client";
import { accounts, accountTypeEnum, accountStatusEnum, type NewAccount } from "../../../src/db/schema/accounts";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const database = db;

  if (!database) {
    console.error("Database connection is not configured");
    res.status(500).json({ error: "Database connection is not configured" });
    return;
  }

  if (req.method === "GET") {
    try {
      const result = await database.select().from(accounts).orderBy(asc(accounts.accountName));
      res.status(200).json(result);
    } catch (error) {
      console.error("Failed to fetch accounts", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: message });
    }
    return;
  }

  if (req.method === "POST") {
    try {
      const body = req.body || {};
      
      // ✅ VALIDATE required fields
      const requiredFields = ["accountName", "accountType", "ownerId", "openingBalance", "currentBalance", "status"];
      const missingFields = requiredFields.filter(field => body[field] === undefined || body[field] === null);
      
      if (missingFields.length > 0) {
        res.status(400).json({ 
          error: "Validation failed", 
          details: `Missing required fields: ${missingFields.join(", ")}` 
        });
        return;
      }

      // ✅ VALIDATE accountType enum
      const allowedTypes = accountTypeEnum.enumValues as readonly string[];
      if (!allowedTypes.includes(body.accountType)) {
        res.status(400).json({ 
          error: "Validation failed", 
          details: `accountType must be one of: ${allowedTypes.join(", ")}` 
        });
        return;
      }

      // ✅ VALIDATE accountStatus enum
      const allowedStatuses = accountStatusEnum.enumValues as readonly string[];
      if (!allowedStatuses.includes(body.status)) {
        res.status(400).json({ 
          error: "Validation failed", 
          details: `status must be one of: ${allowedStatuses.join(", ")}` 
        });
        return;
      }

      // ✅ VALIDATE numeric fields
      const openingBalance = parseFloat(body.openingBalance);
      const currentBalance = parseFloat(body.currentBalance);
      
      if (isNaN(openingBalance) || isNaN(currentBalance)) {
        res.status(400).json({ 
          error: "Validation failed", 
          details: "openingBalance and currentBalance must be valid numbers" 
        });
        return;
      }

      // ✅ BUILD INSERT PAYLOAD with auto UUID
      const payload: NewAccount = {
        accountId: randomUUID(),
        accountName: body.accountName,
        imgUrl: body.imgUrl || null,
        accountType: body.accountType,
        ownerId: body.ownerId,
        parentAccountId: body.parentAccountId || null,
        assetRef: body.assetRef || null,
        openingBalance: openingBalance.toFixed(2),
        currentBalance: currentBalance.toFixed(2),
        status: body.status,
        totalIn: body.totalIn ? parseFloat(body.totalIn).toFixed(2) : "0.00",
        totalOut: body.totalOut ? parseFloat(body.totalOut).toFixed(2) : "0.00",
        notes: body.notes || null,
      };

      const created = await database.insert(accounts).values(payload).returning();
      res.status(201).json(created[0]);
    } catch (error) {
      console.error("Failed to create account", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: message });
    }
    return;
  }

  res.setHeader("Allow", ["GET", "POST"]);
  res.status(405).json({ error: "Method not allowed" });
}
