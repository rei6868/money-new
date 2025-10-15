import { sql } from "drizzle-orm";
import {
  foreignKey,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
  numeric,
  date,
} from "drizzle-orm/pg-core";

import { accounts } from "./accounts";
import { categories } from "./categories";
import { people } from "./people";
import { subscriptionMembers } from "./subscriptions";

/**
 * Enumerates the canonical transaction types supported by the finance platform.
 * These values are intentionally broad to cover spending, income, debt flows
 * and system generated entries such as imports or cashback rebates.
 */
export const transactionTypeEnum = pgEnum("transaction_type", [
  "expense",
  "income",
  "debt",
  "repayment",
  "cashback",
  "subscription",
  "import",
  "adjustment",
]);

/**
 * Lifecycle status for a transaction. The status drives how transactions are
 * surfaced in ledgers and whether they affect balances.
 */
export const transactionStatusEnum = pgEnum("transaction_status", [
  "active",
  "pending",
  "void",
  "canceled",
]);

/**
 * Tracks individual monetary events (spend, income, debt, etc.) within the
 * platform. Each field is heavily documented to make maintenance and reporting
 * requirements explicit.
 */
export const transactions = pgTable("transactions", {
  /**
   * Primary key for the transaction. Stored as string to support UUIDs or IDs
   * sourced from external integrations.
   */
  transactionId: varchar("transaction_id", { length: 36 }).primaryKey(),

  /**
   * Foreign key to the account that owns the transaction. Required so balances
   * and reconciliations can always attribute activity to the correct ledger.
   */
  accountId: varchar("account_id", { length: 36 })
    .notNull()
    .references(() => accounts.accountId, { onDelete: "restrict" }),

  /**
   * Optional link to the person related to the transaction (payer, debtor,
   * recipient). Enables personal level analytics without forcing a mapping for
   * every entry.
   */
  personId: varchar("person_id", { length: 36 }).references(() => people.personId, {
    onDelete: "set null",
  }),

  /**
   * Business classification that determines how the ledger treats the entry
   * (e.g. reduces cash, records debt, applies cashback, etc.).
   */
  type: transactionTypeEnum("type").notNull(),

  /**
   * Optional category used for granular budgeting and reporting rollups.
   */
  categoryId: varchar("category_id", { length: 36 }).references(() => categories.categoryId, {
    onDelete: "set null",
  }),

  /**
   * Associates subscription payment transactions with the member record that
   * triggered the charge. Critical for per-member reconciliation when splitting
   * subscription costs.
   */
  subscriptionMemberId: varchar("subscription_member_id", { length: 36 }).references(
    () => subscriptionMembers.memberId,
    {
      onDelete: "set null",
    },
  ),

  /**
   * Optional pointer to a Linked Transaction group for multi-step flows such as
   * refunds, splits, batch imports, or settlement runs.
   */
  linkedTxnId: varchar("linked_txn_id", { length: 36 }),

  /**
   * Lifecycle state controlling whether the transaction impacts balances.
   */
  status: transactionStatusEnum("status").notNull(),

  /**
   * Total amount of the transaction stored with currency precision.
   */
  amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),

  /**
   * Optional processing or platform fee associated with the transaction.
   */
  fee: numeric("fee", { precision: 18, scale: 2 }),

  /**
   * Date the transaction occurred. Stored separately from createdAt to preserve
   * the real-world posting or spending date.
   */
  occurredOn: date("occurred_on").notNull(),

  /**
   * Free-form notes captured by the user or automation jobs.
   */
  notes: text("notes"),

  /**
   * Record creation timestamp.
   */
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),

  /**
   * Timestamp of the most recent update for audit trails.
   */
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Enumerates the supported groupings of linked transactions, covering scenarios
 * like refunds, bill splits, batch imports, and settlement workflows.
 */
export const linkedTxnTypeEnum = pgEnum("linked_txn_type", [
  "refund",
  "split",
  "batch",
  "settle",
]);

/**
 * Status values for linked transaction groups. These states control whether the
 * grouping is active, fully resolved, or intentionally canceled.
 */
export const linkedTxnStatusEnum = pgEnum("linked_txn_status", [
  "active",
  "done",
  "canceled",
]);

/**
 * Represents a logical grouping of transactions (e.g. a refund journey, split
 * disbursement, batch import, or settlement run). Stores metadata needed to tie
 * individual ledger entries together for reporting and reconciliation.
 */
export const linkedTransactions = pgTable("linked_transactions", {
  /**
   * Primary key for the linked transaction group. Uses string identifiers for
   * interoperability with upstream services.
   */
  linkedTxnId: varchar("linked_txn_id", { length: 36 }).primaryKey(),

  /**
   * Optional pointer to the root transaction when the group represents a
   * multi-step workflow (refund master, split anchor, etc.).
   */
  parentTxnId: varchar("parent_txn_id", { length: 36 }).references(
    () => transactions.transactionId,
    { onDelete: "set null" },
  ),

  /**
   * Business classification describing the grouped behaviour (refund, split,
   * batch import, or settlement operation).
   */
  type: linkedTxnTypeEnum("type").notNull(),

  /**
   * Array of related transaction IDs associated with the linkage. Stored as a
   * text array for flexibility while still referencing transaction identifiers.
   */
  relatedTxnIds: varchar("related_txn_ids", { length: 36 })
    .array()
    .notNull()
    .default(sql`ARRAY[]::varchar[]`),

  /**
   * Optional descriptive notes (e.g. refund reason, settlement memo).
   */
  notes: text("notes"),

  /**
   * Lifecycle state for the linked transaction group.
   */
  status: linkedTxnStatusEnum("status").notNull(),

  /**
   * Creation timestamp for the linkage record.
   */
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),

  /**
   * Update timestamp for audit trails.
   */
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  parentTxnFk: foreignKey({
    columns: [table.parentTxnId],
    foreignColumns: [transactions.transactionId],
    name: "linked_transactions_parent_txn_id_fkey",
  })
    .onDelete("set null")
    .onUpdate("cascade"),
}));

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

export type LinkedTransaction = typeof linkedTransactions.$inferSelect;
export type NewLinkedTransaction = typeof linkedTransactions.$inferInsert;
