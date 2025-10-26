import {
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { transactions } from "./transactions";

/**
 * Enumerates the supported audit actions captured for transactions.
 */
export const transactionHistoryActionEnum = pgEnum("transaction_history_action", [
  "update",
  "delete",
  "cashback_update",
]);

/**
 * Stores a chronological audit trail of transaction mutations. Each history row
 * captures the before/after snapshots for financial fields along with a
 * per-transaction sequence to make it easy to reconstruct change timelines.
 */
export const transactionHistory = pgTable(
  "transaction_history",
  {
    historyId: uuid("history_id").defaultRandom().primaryKey(),
    transactionId: varchar("transaction_id", { length: 36 }).references(
      () => transactions.transactionId,
      {
        onDelete: "set null",
        onUpdate: "cascade",
      },
    ),
    transactionIdSnapshot: varchar("transaction_id_snapshot", { length: 36 }).notNull(),
    oldAmount: numeric("old_amount", { precision: 18, scale: 2 }),
    newAmount: numeric("new_amount", { precision: 18, scale: 2 }),
    oldCashback: numeric("old_cashback", { precision: 18, scale: 2 }),
    newCashback: numeric("new_cashback", { precision: 18, scale: 2 }),
    oldDebt: numeric("old_debt", { precision: 18, scale: 2 }),
    newDebt: numeric("new_debt", { precision: 18, scale: 2 }),
    actionType: transactionHistoryActionEnum("action_type").notNull(),
    seqNo: integer("seq_no").default(1).notNull(),
    editedBy: varchar("edited_by", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    transactionSnapshotSeqIdx: index("transaction_history_transaction_snapshot_seq_idx").on(
      table.transactionIdSnapshot,
      table.seqNo,
    ),
    transactionIdIdx: index("transaction_history_transaction_id_idx").on(table.transactionId),
  }),
);

export type TransactionHistory = typeof transactionHistory.$inferSelect;
export type NewTransactionHistory = typeof transactionHistory.$inferInsert;
