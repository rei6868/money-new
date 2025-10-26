import type { NextApiRequest, NextApiResponse } from "next";
import { randomUUID } from "crypto";
import { db } from "../../../lib/db/client";
import { transactions, transactionTypeEnum, transactionStatusEnum, type NewTransaction } from "../../../src/db/schema/transactions";
import { debtMovements, debtMovementTypeEnum, debtMovementStatusEnum, type NewDebtMovement } from "../../../src/db/schema/debtMovements";
import { debtLedger, debtLedgerStatusEnum, type NewDebtLedger } from "../../../src/db/schema/debtLedger";
import { accounts } from "../../../src/db/schema/accounts";
import { eq, and, isNull, desc } from "drizzle-orm";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const database = db;
  if (!database) return res.status(500).json({ error: "No database configured" });

  if (req.method === "GET") {
    try {
      const rawPage = Array.isArray(req.query.page) ? req.query.page[0] : req.query.page;
      const rawPageSize = Array.isArray(req.query.pageSize) ? req.query.pageSize[0] : req.query.pageSize;
      const page = Math.max(parseInt(rawPage ?? "1", 10) || 1, 1);
      const pageSize = Math.max(parseInt(rawPageSize ?? "10", 10) || 10, 1);
      const offset = (page - 1) * pageSize;

      const txns = await database
        .select()
        .from(transactions)
        .orderBy(desc(transactions.occurredOn))
        .limit(pageSize)
        .offset(offset);

      return res.status(200).json({ items: txns, total: txns.length });
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

      // Update accounts (simple logic, outscoped for brevity)
      // TODO: You can re-add account balance update logic here if needed

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
