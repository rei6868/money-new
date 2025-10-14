import { foreignKey, pgEnum, pgTable, text, timestamp, varchar, numeric, date } from "drizzle-orm/pg-core";

import { accounts } from "./accounts";
import { people } from "./people";

/**
 * Enumerates the supported data sources we can ingest in a batch import.
 * Each option corresponds to a workflow in the operations UI.
 */
export const batchImportTypeEnum = pgEnum("batch_import_type", [
  "transfer",
  "payment",
  "topup",
  "other",
]);

/**
 * Tracks the lifecycle state for the batch import job so that
 * automation and dashboards present consistent progress indicators.
 */
export const batchImportStatusEnum = pgEnum("batch_import_status", [
  "pending",
  "processing",
  "done",
]);

/**
 * BatchImports holds metadata for every batch file or payload processed by the
 * finance operations team. The table is designed for visibility and auditing
 * rather than storing the individual line items (handled by movement tables).
 */
export const batchImports = pgTable("batch_imports", {
  /**
   * Primary key using externally generated identifiers (typically UUIDs).
   * Enables linking to related ledger/movement records and job history.
   */
  batchImportId: varchar("batch_import_id", { length: 36 }).primaryKey(),

  /**
   * Friendly label surfaced in the back-office UI so operators can recognise
   * the batch at a glance without cross-referencing IDs.
   */
  batchName: varchar("batch_name", { length: 160 }).notNull(),

  /**
   * Declares which workflow generated the batch. Drives custom validation and
   * downstream automation (e.g. transfer vs. payment reconciliation).
   */
  importType: batchImportTypeEnum("import_type").notNull(),

  /**
   * Lifecycle status powering dashboards, retry automation, and alerts.
   */
  status: batchImportStatusEnum("status").notNull(),

  /**
   * Account that will ultimately receive or send the funds in the batch.
   */
  accountId: varchar("account_id", { length: 36 }).notNull(),

  /**
   * Sum of all line items in the batch. Stored with two decimal precision to
   * align with currency handling rules.
   */
  totalAmount: numeric("total_amount", { precision: 18, scale: 2 }).notNull(),

  /**
   * Deadline for completing the batch posting or follow-up actions.
   */
  deadline: date("deadline").notNull(),

  /**
   * Person responsible for monitoring or approving the batch execution.
   */
  userId: varchar("user_id", { length: 36 }).notNull(),

  /**
   * Optional free-form notes such as escalation context or processing remarks.
   */
  notes: text("notes"),

  /**
   * Record creation timestamp. Defaults to database clock for accurate audits.
   */
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),

  /**
   * Timestamp of last update so stakeholders can track recent activity.
   */
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  accountFk: foreignKey({
    columns: [table.accountId],
    foreignColumns: [accounts.accountId],
    name: "batch_imports_account_id_fkey",
  })
    .onDelete("restrict")
    .onUpdate("cascade"),
  userFk: foreignKey({
    columns: [table.userId],
    foreignColumns: [people.personId],
    name: "batch_imports_user_id_fkey",
  })
    .onDelete("restrict")
    .onUpdate("cascade"),
}));

export type BatchImport = typeof batchImports.$inferSelect;
export type NewBatchImport = typeof batchImports.$inferInsert;
