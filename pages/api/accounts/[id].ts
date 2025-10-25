import type { NextApiRequest, NextApiResponse } from "next";
import { eq } from "drizzle-orm";

import { db } from "../../../lib/db/client";
import { accounts, accountTypeEnum, accountStatusEnum, type NewAccount } from "../../../src/db/schema/accounts";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const database = db;

  if (!database) {
    console.error("Database connection is not configured");
    res.status(500).json({ error: "Database connection is not configured" });
    return;
  }

  const { id } = req.query;
  const accountId = Array.isArray(id) ? id[0] : id;

  if (!accountId) {
    res.status(400).json({ message: "Account id is required" });
    return;
  }

  if (req.method === "GET") {
    try {
      const result = await database.select().from(accounts).where(eq(accounts.accountId, accountId));
      if (result.length === 0) {
        res.status(404).json({ message: "Account not found" });
        return;
      }
      res.status(200).json(result[0]);
    } catch (error) {
      console.error(`Failed to fetch account with id ${accountId}`, error);
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: message });
    }
    return;
  }

  if (req.method === "PUT" || req.method === "PATCH") {
    try {
      const body = req.body || {};
      
      // ✅ BUILD UPDATE OBJECT (chỉ update field có trong body)
      const updates: any = {}; // Use any to avoid type issues with decimal strings
      
      // String fields
      if (body.accountName !== undefined) updates.accountName = body.accountName;
      if (body.imgUrl !== undefined) updates.imgUrl = body.imgUrl;
      if (body.ownerId !== undefined) updates.ownerId = body.ownerId;
      if (body.parentAccountId !== undefined) updates.parentAccountId = body.parentAccountId;
      if (body.assetRef !== undefined) updates.assetRef = body.assetRef;
      if (body.notes !== undefined) updates.notes = body.notes;

      // Enum fields with validation
      if (body.accountType !== undefined) {
        const allowedTypes = accountTypeEnum.enumValues as readonly string[];
        if (!allowedTypes.includes(body.accountType)) {
          res.status(400).json({ 
            error: "Validation failed", 
            details: `accountType must be one of: ${allowedTypes.join(", ")}` 
          });
          return;
        }
        updates.accountType = body.accountType;
      }

      if (body.status !== undefined) {
        const allowedStatuses = accountStatusEnum.enumValues as readonly string[];
        if (!allowedStatuses.includes(body.status)) {
          res.status(400).json({ 
            error: "Validation failed", 
            details: `status must be one of: ${allowedStatuses.join(", ")}` 
          });
          return;
        }
        updates.status = body.status;
      }

      // Numeric fields with validation
      if (body.openingBalance !== undefined) {
        const value = parseFloat(body.openingBalance);
        if (isNaN(value)) {
          res.status(400).json({ error: "openingBalance must be a valid number" });
          return;
        }
        updates.openingBalance = value.toFixed(2);
      }

      if (body.currentBalance !== undefined) {
        const value = parseFloat(body.currentBalance);
        if (isNaN(value)) {
          res.status(400).json({ error: "currentBalance must be a valid number" });
          return;
        }
        updates.currentBalance = value.toFixed(2);
      }

      if (body.totalIn !== undefined) {
        const value = parseFloat(body.totalIn);
        if (isNaN(value)) {
          res.status(400).json({ error: "totalIn must be a valid number" });
          return;
        }
        updates.totalIn = value.toFixed(2);
      }

      if (body.totalOut !== undefined) {
        const value = parseFloat(body.totalOut);
        if (isNaN(value)) {
          res.status(400).json({ error: "totalOut must be a valid number" });
          return;
        }
        updates.totalOut = value.toFixed(2);
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
        .update(accounts)
        .set(updates)
        .where(eq(accounts.accountId, accountId))
        .returning();

      if (updated.length === 0) {
        res.status(404).json({ message: "Account not found" });
        return;
      }

      res.status(200).json(updated[0]);
    } catch (error) {
      console.error(`Failed to update account with id ${accountId}`, error);
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: message });
    }
    return;
  }

  if (req.method === "DELETE") {
    try {
      const deleted = await database.delete(accounts).where(eq(accounts.accountId, accountId)).returning();
      if (deleted.length === 0) {
        res.status(404).json({ message: "Account not found" });
        return;
      }
      res.status(200).json(deleted[0]);
    } catch (error) {
      console.error(`Failed to delete account with id ${accountId}`, error);
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: message });
    }
    return;
  }

  res.setHeader("Allow", ["GET", "PUT", "PATCH", "DELETE"]);
  res.status(405).json({ error: "Method not allowed" });
}
