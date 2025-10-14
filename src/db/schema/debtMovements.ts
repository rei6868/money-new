import { index, numeric, pgEnum, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

import { accounts } from "./accounts";
import { people } from "./people";
import { transactions } from "./transactions";

/**
 * Enumerates the business actions that can generate a debt movement. The enum
 * mirrors the workflows handled by the debt engine so downstream processes can
 * branch deterministically.
 */
export const debtMovementTypeEnum = pgEnum("debt_movement_type", [
  "borrow",
  "repay",
  "adjust",
  "discount",
  "split",
]);

/**
 * Tracks the lifecycle status for a debt movement. A movement starts as
 * "active", transitions to "settled" when cleared, and may be marked
 * "reversed" when undone via dispute resolution.
 */
export const debtMovementStatusEnum = pgEnum("debt_movement_status", [
  "active",
  "settled",
  "reversed",
]);

/**
 * Normalised record of every debt related event. Each movement references the
 * originating transaction, the debtor, and the account that owns the balance so
 * that the debt ledger can reconstruct state for audits and recalculations.
 */
export const debtMovements = pgTable(
  "debt_movements",
  {
    /**
     * Primary key for the debt movement. Uses string identifiers (UUIDs or
     * external IDs) so the table can ingest events from multiple systems.
     */
    debtMovementId: varchar("debt_movement_id", { length: 36 }).primaryKey(),

    /**
     * Links back to the original transaction that produced the debt event. The
     * reference is required so adjustments can reapply business rules using the
     * raw transaction payload.
     */
    transactionId: varchar("transaction_id", { length: 36 })
      .notNull()
      .references(() => transactions.transactionId, { onDelete: "restrict" }),

    /**
     * Identifies the debtor (person) involved in the movement. Required for
     * audit trails and to power person-level debt statements.
     */
    personId: varchar("person_id", { length: 36 })
      .notNull()
      .references(() => people.personId, { onDelete: "restrict" }),

    /**
     * References the account or ledger bucket that aggregates the movement.
     * This allows the platform to rebuild per-account balances without scanning
     * every transaction.
     */
    accountId: varchar("account_id", { length: 36 })
      .notNull()
      .references(() => accounts.accountId, { onDelete: "restrict" }),

    /**
     * Categorical action that produced the movement. Downstream calculations use
     * the value to decide whether to increase or decrease outstanding debt.
     */
    movementType: debtMovementTypeEnum("movement_type").notNull(),

    /**
     * Monetary impact of the movement. Positive values increase outstanding debt
     * (borrow, adjustments increasing principal), while negative values reduce it
     * (repayments, discounts). Stored with currency precision.
     */
    amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),

    /**
     * Optional cycle identifier (e.g. YYYY-MM) used to bucket movements for
     * periodic statements and recalculation jobs.
     */
    cycleTag: varchar("cycle_tag", { length: 10 }),

    /**
     * Lifecycle status of the movement. "active" entries are outstanding,
     * "settled" movements have been cleared, and "reversed" marks entries that
     * were negated via dispute handling and should be excluded from future
     * rollups.
     */
    status: debtMovementStatusEnum("status").notNull(),

    /**
     * Optional free-form note capturing manual adjustments, dispute outcomes or
     * extra audit context.
     */
    notes: text("notes"),

    /**
     * Creation timestamp populated from the database clock for audit ordering.
     */
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),

    /**
     * Timestamp of the most recent update. Application logic should bump this
     * when status or amount changes during recalculations.
     */
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    /**
     * Index optimised for querying debt movements for a person/account pair
     * during recalculation jobs and ledger reconciliation.
     */
    personAccountIdx: index("debt_movements_person_account_idx").on(
      table.personId,
      table.accountId,
    ),
    /**
     * Index helping split-cycle statements and bulk settlements that group by
     * account and cycle tag.
     */
    accountCycleIdx: index("debt_movements_account_cycle_idx").on(
      table.accountId,
      table.cycleTag,
    ),
  }),
);

export type DebtMovement = typeof debtMovements.$inferSelect;
export type NewDebtMovement = typeof debtMovements.$inferInsert;
