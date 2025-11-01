import type { NextApiRequest, NextApiResponse } from "next";
import { randomUUID } from "crypto";
import { db } from "../../../../lib/db/client";
import { transactions, type NewTransaction } from "../../../../src/db/schema/transactions";
import { debtMovements } from "../../../../src/db/schema/debtMovements";
import { cashbackMovements } from "../../../../src/db/schema/cashbackMovements";
import { accounts } from "../../../../src/db/schema/accounts";
import { eq, sql } from "drizzle-orm";

async function processTask(parentTxnId: string, taskType: string, amount: number, personId?: string | null) {
  const database = db;
  if (!database) throw new Error("Database not configured");

  return await database.transaction(async (tx) => {
    const [parentTxn] = await tx.select().from(transactions).where(eq(transactions.transactionId, parentTxnId));
    if (!parentTxn) throw new Error("Parent transaction not found");

    const createdTxnIds: string[] = [];

    switch (taskType) {
      case "PARTIAL_REFUND":
      case "FULL_REFUND": {
        const refundTxnId = randomUUID();
        const refundType = parentTxn.type === "expense" ? "income" : "expense";
        const refundTxn: NewTransaction = {
          transactionId: refundTxnId,
          accountId: parentTxn.accountId,
          personId: personId || parentTxn.personId,
          type: refundType,
          status: "active",
          amount: amount.toFixed(2),
          occurredOn: new Date(),
          parentTxnId,
          notes: `Refund for transaction ${parentTxnId}`,
        };
        await tx.insert(transactions).values(refundTxn);
        createdTxnIds.push(refundTxnId);

        await tx.update(transactions).set({
          status: "canceled",
          updatedAt: new Date(),
        }).where(eq(transactions.transactionId, parentTxnId));

        const occurredDate = new Date(parentTxn.occurredOn);
        const cycleTag = `${occurredDate.getFullYear()}-${String(occurredDate.getMonth() + 1).padStart(2, "0")}`;
        
        const [cashbackMvmt] = await tx.select().from(cashbackMovements)
          .where(eq(cashbackMovements.transactionId, parentTxnId));
        
        if (cashbackMvmt) {
          const cashbackAmount = parseFloat(cashbackMvmt.cashbackAmount ?? "0");
          await tx.update(cashbackMovements).set({
            status: "invalidated",
            note: "Refunded transaction",
            updatedAt: new Date(),
          }).where(eq(cashbackMovements.cashbackMovementId, cashbackMvmt.cashbackMovementId));

          await tx.execute(sql`
            UPDATE cashback_ledger 
            SET total_cashback = total_cashback - ${cashbackAmount},
                remaining_budget = remaining_budget + ${cashbackAmount},
                last_updated = NOW()
            WHERE account_id = ${parentTxn.accountId} AND cycle_tag = ${cycleTag}
          `);
        }

        if (parentTxn.personId) {
          const [debtMvmt] = await tx.select().from(debtMovements)
            .where(eq(debtMovements.transactionId, parentTxnId));
          
          if (debtMvmt) {
            const debtAmount = parseFloat(debtMvmt.amount ?? "0");
            await tx.execute(sql`
              UPDATE debt_ledger 
              SET new_debt = new_debt - ${debtAmount},
                  net_debt = net_debt - ${debtAmount},
                  last_updated = NOW()
              WHERE person_id = ${parentTxn.personId} AND cycle_tag = ${debtMvmt.cycleTag}
            `);
          }
        }

        const [account] = await tx.select().from(accounts).where(eq(accounts.accountId, parentTxn.accountId));
        if (account) {
          const currentBalance = parseFloat(account.currentBalance ?? "0");
          const newBalance = refundType === "income" ? currentBalance + amount : currentBalance - amount;
          await tx.update(accounts).set({
            currentBalance: newBalance.toFixed(2),
            updatedAt: new Date(),
          }).where(eq(accounts.accountId, parentTxn.accountId));
        }
        break;
      }

      case "CANCEL_ORDER":
      case "SPLIT_BILL":
      case "SETTLE_DEBT":
        throw new Error(`${taskType} workflow not yet implemented`);

      default:
        throw new Error(`Unknown task type: ${taskType}`);
    }

    return { createdTxnIds };
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const database = db;

  if (!database) {
    return res.status(503).json({ error: "Database not configured" });
  }

  if (req.method === "POST") {
    try {
      const { id } = req.query;
      const parentTxnId = Array.isArray(id) ? id[0] : id;

      if (!parentTxnId) {
        return res.status(400).json({ error: "Transaction ID is required" });
      }

      const body = req.body || {};
      
      if (!body.taskType) {
        return res.status(400).json({ error: "taskType is required" });
      }

      const allowedTasks = ["PARTIAL_REFUND", "FULL_REFUND", "CANCEL_ORDER", "SPLIT_BILL", "SETTLE_DEBT"];
      if (!allowedTasks.includes(body.taskType)) {
        return res.status(400).json({ 
          error: `taskType must be one of: ${allowedTasks.join(", ")}` 
        });
      }

      if ((body.taskType === "PARTIAL_REFUND" || body.taskType === "FULL_REFUND") && !body.amount) {
        return res.status(400).json({ error: "amount is required for refund tasks" });
      }

      const amount = body.amount ? parseFloat(body.amount) : 0;
      if ((body.taskType === "PARTIAL_REFUND" || body.taskType === "FULL_REFUND") && (isNaN(amount) || amount <= 0)) {
        return res.status(400).json({ error: "amount must be a positive number" });
      }

      const result = await processTask(
        parentTxnId,
        body.taskType,
        amount,
        body.personId
      );

      return res.status(201).json({
        success: true,
        parentTxnId,
        createdTxnIds: result.createdTxnIds,
      });

    } catch (error) {
      console.error("Failed to process task", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      return res.status(500).json({ error: message });
    }
  }

  res.setHeader("Allow", ["POST"]);
  return res.status(405).json({ error: "Method not allowed" });
}
