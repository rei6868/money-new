import type { NextApiRequest, NextApiResponse } from "next";
import { asc, eq } from "drizzle-orm";
import { randomUUID } from "crypto";

import { db } from "../../../lib/db/client";
import { accounts, accountTypeEnum, accountStatusEnum, type NewAccount } from "../../../src/db/schema/accounts";
import { people } from "../../../src/db/schema/people";

// Mock data for development when database is not configured
const MOCK_ACCOUNTS: any[] = [
  {
    accountId: "mock-acc-1",
    accountName: "Vietcombank Savings",
    accountType: "bank",
    ownerId: "mock-person-1",
    ownerName: "John Doe",
    openingBalance: 10000000,
    currentBalance: 12500000,
    totalIn: 5000000,
    totalOut: 2500000,
    status: "active",
    notes: "Main savings account",
    parentAccountId: null,
    imgUrl: null,
  },
  {
    accountId: "mock-acc-2",
    accountName: "Cash Wallet",
    accountType: "cash",
    ownerId: "mock-person-1",
    ownerName: "John Doe",
    openingBalance: 500000,
    currentBalance: 750000,
    totalIn: 300000,
    totalOut: 50000,
    status: "active",
    notes: "Daily spending cash",
    parentAccountId: null,
    imgUrl: null,
  },
  {
    accountId: "mock-acc-3",
    accountName: "Credit Card",
    accountType: "credit",
    ownerId: "mock-person-1",
    ownerName: "John Doe",
    openingBalance: 0,
    currentBalance: -2000000,
    totalIn: 0,
    totalOut: 2000000,
    status: "active",
    notes: "Visa credit card",
    parentAccountId: null,
    imgUrl: null,
  },
  {
    accountId: "mock-acc-4",
    accountName: "MoMo E-Wallet",
    accountType: "e-wallet",
    ownerId: "mock-person-1",
    ownerName: "John Doe",
    openingBalance: 100000,
    currentBalance: 350000,
    totalIn: 500000,
    totalOut: 250000,
    status: "active",
    notes: "MoMo digital wallet",
    parentAccountId: null,
    imgUrl: null,
  },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const database = db;

  if (!database) {
    console.warn("Database connection is not configured - using mock data");

    // Handle GET request with mock data
    if (req.method === "GET") {
      res.status(200).json(MOCK_ACCOUNTS);
      return;
    }

    // Handle POST request with mock data
    if (req.method === "POST") {
      const body = req.body || {};
      const newAccount = {
        accountId: `mock-acc-${Date.now()}`,
        accountName: body.accountName || "New Account",
        accountType: body.accountType || "other",
        ownerId: body.ownerId || "mock-person-1",
        ownerName: "John Doe",
        openingBalance: Number(body.openingBalance ?? 0),
        currentBalance: Number(body.currentBalance ?? 0),
        totalIn: 0,
        totalOut: 0,
        status: body.status || "active",
        notes: body.notes || null,
        parentAccountId: body.parentAccountId || null,
        imgUrl: body.imgUrl || null,
      };

      MOCK_ACCOUNTS.push(newAccount);
      res.status(201).json(newAccount);
      return;
    }

    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (req.method === "GET") {
    try {
      const result = await database
        .select({
          accountId: accounts.accountId,
          accountName: accounts.accountName,
          accountType: accounts.accountType,
          ownerId: accounts.ownerId,
          ownerName: people.fullName,
          openingBalance: accounts.openingBalance,
          currentBalance: accounts.currentBalance,
          totalIn: accounts.totalIn,
          totalOut: accounts.totalOut,
          status: accounts.status,
          notes: accounts.notes,
          parentAccountId: accounts.parentAccountId,
          imgUrl: accounts.imgUrl,
        })
        .from(accounts)
        .leftJoin(people, eq(accounts.ownerId, people.personId))
        .orderBy(asc(accounts.accountName));

      const payload = result.map((row) => ({
        ...row,
        openingBalance: Number(row.openingBalance ?? 0),
        currentBalance: Number(row.currentBalance ?? 0),
        totalIn: Number(row.totalIn ?? 0),
        totalOut: Number(row.totalOut ?? 0),
      }));

      res.status(200).json(payload);
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
