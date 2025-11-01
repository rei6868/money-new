import type { NextApiRequest, NextApiResponse } from "next";
import { randomUUID } from "crypto";
import { getTransactionsTable } from "../../../lib/api/transactions/transactions.table";
import {
  type TransactionsTableRequest,
  type SortDirection,
} from "../../../lib/api/transactions/transactions.types";
import { db } from "../../../lib/db/client";
import { transactions, transactionTypeEnum, transactionStatusEnum, type NewTransaction } from "../../../src/db/schema/transactions";
import { debtMovements, debtMovementTypeEnum, debtMovementStatusEnum, type NewDebtMovement } from "../../../src/db/schema/debtMovements";
import { debtLedger, debtLedgerStatusEnum, type NewDebtLedger } from "../../../src/db/schema/debtLedger";
import { cashbackMovements, cashbackTypeEnum, cashbackStatusEnum, type NewCashbackMovement } from "../../../src/db/schema/cashbackMovements";
import { cashbackLedger, cashbackEligibilityEnum, cashbackLedgerStatusEnum, type NewCashbackLedger } from "../../../src/db/schema/cashbackLedger";
import { accounts } from "../../../src/db/schema/accounts";
import { eq, and, isNull, sql } from "drizzle-orm";

// Mock data for development when database is not configured
const MOCK_TRANSACTIONS: any[] = [
  {
    transactionId: "mock-txn-1",
    transactionType: "expense",
    amount: 150000,
    transactionDate: new Date().toISOString(),
    accountId: "mock-acc-1",
    accountName: "Vietcombank Savings",
    categoryId: "mock-cat-1",
    categoryName: "Groceries",
    personId: "mock-person-1",
    personName: "John Doe",
    shopId: null,
    shopName: null,
    notes: "Weekly groceries",
    status: "completed",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    transactionId: "mock-txn-2",
    transactionType: "income",
    amount: 5000000,
    transactionDate: new Date().toISOString(),
    accountId: "mock-acc-1",
    accountName: "Vietcombank Savings",
    categoryId: "mock-cat-2",
    categoryName: "Salary",
    personId: "mock-person-1",
    personName: "John Doe",
    shopId: null,
    shopName: null,
    notes: "Monthly salary",
    status: "completed",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const database = db;

  if (!database) {
    console.warn("Database connection is not configured - using mock data");

    if (req.method === "GET") {
      // Return mock transactions with pagination support
      const page = Number(req.query.page) || 1;
      const pageSize = Number(req.query.pageSize) || 50;
      const start = (page - 1) * pageSize;
      const end = start + pageSize;

      const paginatedData = MOCK_TRANSACTIONS.slice(start, end);

      res.status(200).json({
        transactions: paginatedData,
        totalCount: MOCK_TRANSACTIONS.length,
        page,
        pageSize,
        totalPages: Math.ceil(MOCK_TRANSACTIONS.length / pageSize),
      });
      return;
    }

    if (req.method === "POST") {
      const body = req.body || {};
      const newTransaction = {
        transactionId: `mock-txn-${Date.now()}`,
        transactionType: body.transactionType || "expense",
        amount: Number(body.amount || 0),
        transactionDate: body.transactionDate || new Date().toISOString(),
        accountId: body.accountId || "mock-acc-1",
        accountName: "Vietcombank Savings",
        categoryId: body.categoryId || null,
        categoryName: null,
        personId: body.personId || "mock-person-1",
        personName: "John Doe",
        shopId: body.shopId || null,
        shopName: null,
        notes: body.notes || null,
        status: body.status || "completed",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      MOCK_TRANSACTIONS.unshift(newTransaction);
      res.status(201).json(newTransaction);
      return;
    }

    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (req.method === "GET") {
    try {
      const parseNumericParam = (value: unknown): number | undefined => {
        if (Array.isArray(value)) {
          return parseNumericParam(value[0]);
        }
        if (typeof value === "string" && value.trim() !== "") {
          const parsed = Number.parseInt(value, 10);
          if (Number.isFinite(parsed) && parsed > 0) {
            return parsed;
          }
        }
        return undefined;
      };

      const parseSortDirection = (value: unknown): SortDirection | undefined => {
        if (Array.isArray(value)) {
          return parseSortDirection(value[0]);
        }
        if (value === "asc" || value === "desc") {
          return value;
        }
        return undefined;
      };

      const normalizeString = (value: unknown): string | undefined => {
        if (Array.isArray(value)) {
          return normalizeString(value[0]);
        }
        if (typeof value === "string") {
          const trimmed = value.trim();
          return trimmed === "" ? undefined : trimmed;
        }
        return undefined;
      };

      const requestPayload: TransactionsTableRequest = {};

      const searchTerm = normalizeString(req.query.search);
      if (searchTerm) {
        requestPayload.searchTerm = searchTerm;
      }

      const page = parseNumericParam(req.query.page);
      const pageSize = parseNumericParam(req.query.pageSize);
      if (page || pageSize) {
        requestPayload.pagination = {};
        if (page) {
          requestPayload.pagination.page = page;
        }
        if (pageSize) {
          requestPayload.pagination.pageSize = pageSize;
        }
      }

      const sortBy = normalizeString(req.query.sortBy);
      const sortDir = parseSortDirection(req.query.sortDir);
      if (sortBy || sortDir) {
        requestPayload.sort = {};
        if (sortBy) {
          requestPayload.sort.columnId = sortBy;
        }
        if (sortDir) {
          requestPayload.sort.direction = sortDir;
        }
      }

      const restoreToken = normalizeString(req.query.restore);

      const response = await getTransactionsTable(requestPayload, restoreToken);

      return res.status(200).json(response);
    } catch (error) {
      console.error("Failed to fetch transactions", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      return res.status(500).json({ error: message });
    }
  }

  if (req.method === "POST") {
    try {
      const body = req.body || {};
      // Validate
      const requiredFields = ["occurredOn", "amount", "type", "status", "accountId"];
      const missing = requiredFields.filter(field => body[field] === undefined || body[field] === null);
      if (missing.length > 0) return res.status(400).json({ error: "Missing fields", details: missing });

      // Type check
      const allowedTypes = transactionTypeEnum.enumValues as readonly string[];
      if (!allowedTypes.includes(body.type))
        return res.status(400).json({ error: `type must be one of: ${allowedTypes.join(", ")}` });

      const allowedStatuses = transactionStatusEnum.enumValues as readonly string[];
      if (!allowedStatuses.includes(body.status))
        return res.status(400).json({ error: `status must be one of: ${allowedStatuses.join(", ")}` });

      const amount = parseFloat(body.amount);
      const fee = body.fee ? parseFloat(body.fee) : 0;
      if (isNaN(amount)) return res.status(400).json({ error: "amount must be a valid number" });

      // Create Transaction
      const transactionId = randomUUID();
      const transactionPayload: NewTransaction = {
        transactionId,
        occurredOn: new Date(body.occurredOn),
        amount: amount.toFixed(2),
        fee: fee.toFixed(2),
        type: body.type,
        status: body.status,
        accountId: body.accountId,
        personId: body.personId || null,
        categoryId: body.categoryId || null,
        shopId: body.shopId || null,
        linkedTxnId: body.linkedTxnId || null,
        subscriptionMemberId: body.subscriptionMemberId || null,
        notes: body.notes || null,
      };
      const [createdTxn] = await database.insert(transactions).values(transactionPayload).returning();

      // Debt logic
      if (body.personId && body.debtMovement) {
        const { movementType, cycleTag } = body.debtMovement;
        const allowedMovementTypes = debtMovementTypeEnum.enumValues as readonly string[];
        if (!allowedMovementTypes.includes(movementType))
          return res.status(400).json({ error: "Invalid movementType", details: allowedMovementTypes });
        
        // Ledger: one ledger per person+cycle.
        // Corrected Drizzle query: Use and() to combine WHERE clauses and isNull() for null checks.
        const [ledger] = await database
          .select()
          .from(debtLedger)
          .where(
            and(
              eq(debtLedger.personId, body.personId),
              cycleTag ? eq(debtLedger.cycleTag, cycleTag) : isNull(debtLedger.cycleTag)
            )
          );
        
        let debtLedgerId: string;
        let ledgerStatus: typeof debtLedgerStatusEnum.enumValues[number] = "open";
        let newDebt = 0, repayments = 0, netDebt = 0, initialDebt = 0, debtDiscount = 0;

        // Create or update ledger
        if (!ledger) {
          debtLedgerId = randomUUID();
          if (movementType === "borrow") newDebt = amount;
          if (movementType === "repay") repayments = amount; // repay = trả nợ
          netDebt = newDebt - repayments;
          const newLedger: NewDebtLedger = {
            debtLedgerId,
            personId: body.personId,
            cycleTag: cycleTag || null,
            initialDebt: "0",
            newDebt: newDebt.toFixed(2),
            repayments: repayments.toFixed(2),
            debtDiscount: "0",
            netDebt: netDebt.toFixed(2),
            status: ledgerStatus,
            lastUpdated: new Date(),
            notes: body.notes || null,
          };
          await database.insert(debtLedger).values(newLedger);
        } else {
          debtLedgerId = ledger.debtLedgerId;
          initialDebt = parseFloat(ledger.initialDebt ?? "0");
          newDebt = parseFloat(ledger.newDebt ?? "0");
          repayments = parseFloat(ledger.repayments ?? "0");
          debtDiscount = parseFloat(ledger.debtDiscount ?? "0");
          // Update values
          if (movementType === "borrow") newDebt += amount;
          if (movementType === "repay") repayments += amount;
          // Sửa: Allow adjust/discount
          if (movementType === "discount") debtDiscount += amount;
          // netDebt
          netDebt = initialDebt + newDebt - repayments - debtDiscount;

          await database.update(debtLedger).set({
            newDebt: newDebt.toFixed(2),
            repayments: repayments.toFixed(2),
            debtDiscount: debtDiscount.toFixed(2),
            netDebt: netDebt.toFixed(2),
            lastUpdated: new Date(),
            status: ledgerStatus,
            notes: body.notes || ledger.notes || null
          }).where(eq(debtLedger.debtLedgerId, debtLedgerId));
        }

        // Create debt movement
        const movementStatus: typeof debtMovementStatusEnum.enumValues[number] = "active";
        const newDebtMovement: NewDebtMovement = {
          debtMovementId: randomUUID(),
          transactionId,
          personId: body.personId,
          accountId: body.accountId,
          movementType,
          amount: amount.toFixed(2),
          cycleTag: cycleTag || null,
          status: movementStatus,
          notes: body.notes || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await database.insert(debtMovements).values(newDebtMovement);
      }

      // Cashback logic
      if (body.cashbackMovement && (body.type === "expense" || body.type === "income")) {
        const { cashbackType, cashbackValue } = body.cashbackMovement;
        const allowedCashbackTypes = cashbackTypeEnum.enumValues as readonly string[];
        if (!allowedCashbackTypes.includes(cashbackType))
          return res.status(400).json({ error: "Invalid cashbackType", details: allowedCashbackTypes });

        // Calculate cashback amount
        let cashbackAmount = 0;
        if (cashbackType === "percent") {
          cashbackAmount = amount * (parseFloat(cashbackValue) / 100);
        } else {
          cashbackAmount = parseFloat(cashbackValue);
        }

        // Get cycle tag (YYYY-MM format)
        const occurredDate = new Date(body.occurredOn);
        const cycleTag = `${occurredDate.getFullYear()}-${String(occurredDate.getMonth() + 1).padStart(2, "0")}`;

        // Check budget cap from ledger
        const [ledger] = await database
          .select()
          .from(cashbackLedger)
          .where(
            and(
              eq(cashbackLedger.accountId, body.accountId),
              eq(cashbackLedger.cycleTag, cycleTag)
            )
          );

        let budgetCap = 0;
        let totalCashback = 0;
        let cashbackLedgerId: string;
        let movementStatus: typeof cashbackStatusEnum.enumValues[number] = "applied";

        if (ledger) {
          budgetCap = parseFloat(ledger.budgetCap ?? "0");
          totalCashback = parseFloat(ledger.totalCashback ?? "0");
          cashbackLedgerId = ledger.cashbackLedgerId;

          // Check if adding this cashback would exceed cap
          if (budgetCap > 0 && totalCashback + cashbackAmount > budgetCap) {
            movementStatus = "exceed_cap";
            cashbackAmount = Math.max(0, budgetCap - totalCashback);
          }
        } else {
          // Create new ledger entry
          cashbackLedgerId = randomUUID();
          budgetCap = body.cashbackMovement.budgetCap ? parseFloat(body.cashbackMovement.budgetCap) : 0;
          const newLedger: NewCashbackLedger = {
            cashbackLedgerId,
            accountId: body.accountId,
            cycleTag,
            totalSpend: amount.toFixed(2),
            totalCashback: cashbackAmount.toFixed(2),
            budgetCap: budgetCap.toFixed(2),
            eligibility: "eligible",
            remainingBudget: (budgetCap - cashbackAmount).toFixed(2),
            status: "open",
          };
          await database.insert(cashbackLedger).values(newLedger);
        }

        // Create cashback movement
        const newCashbackMovement: NewCashbackMovement = {
          cashbackMovementId: randomUUID(),
          transactionId,
          accountId: body.accountId,
          cycleTag,
          cashbackType,
          cashbackValue: parseFloat(cashbackValue).toFixed(4),
          cashbackAmount: cashbackAmount.toFixed(2),
          status: movementStatus,
          budgetCap: budgetCap > 0 ? budgetCap.toFixed(2) : null,
          note: body.notes || null,
        };
        await database.insert(cashbackMovements).values(newCashbackMovement);

        // Update ledger if it existed
        if (ledger) {
          const newTotalCashback = totalCashback + cashbackAmount;
          const newTotalSpend = parseFloat(ledger.totalSpend ?? "0") + amount;
          await database.update(cashbackLedger).set({
            totalSpend: newTotalSpend.toFixed(2),
            totalCashback: newTotalCashback.toFixed(2),
            remainingBudget: (budgetCap - newTotalCashback).toFixed(2),
            eligibility: newTotalCashback >= budgetCap && budgetCap > 0 ? "reached_cap" : "eligible",
            lastUpdated: new Date(),
          }).where(eq(cashbackLedger.cashbackLedgerId, cashbackLedgerId));
        }
      }

      // Update account balance
      const [account] = await database.select().from(accounts).where(eq(accounts.accountId, body.accountId));
      if (account) {
        const currentBalance = parseFloat(account.currentBalance ?? "0");
        const totalIn = parseFloat(account.totalIn ?? "0");
        const totalOut = parseFloat(account.totalOut ?? "0");
        
        let newBalance = currentBalance;
        let newTotalIn = totalIn;
        let newTotalOut = totalOut;

        if (body.type === "income" || body.type === "repayment" || body.type === "cashback") {
          newBalance += amount;
          newTotalIn += amount;
        } else if (body.type === "expense" || body.type === "debt") {
          newBalance -= amount;
          newTotalOut += amount;
        }

        await database.update(accounts).set({
          currentBalance: newBalance.toFixed(2),
          totalIn: newTotalIn.toFixed(2),
          totalOut: newTotalOut.toFixed(2),
          updatedAt: new Date(),
        }).where(eq(accounts.accountId, body.accountId));
      }

      res.status(201).json(createdTxn);
    } catch (error) {
      console.error("Failed to create transaction", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: message });
    }
    return;
  }

  res.setHeader("Allow", ["GET", "POST"]);
  res.status(405).json({ error: "Method not allowed" });
}
