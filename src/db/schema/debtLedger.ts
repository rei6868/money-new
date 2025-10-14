import { numeric, pgEnum, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

import { people } from "./people";

/**
 * Allowed lifecycle states for the aggregated debt ledger snapshot.
 * These values map to UI badges, workflow triggers, and automated reminders.
 */
export const debtLedgerStatusEnum = pgEnum("debt_ledger_status", [
  "open",
  "partial",
  "repaid",
  "overdue",
]);

/**
 * Summarised view of a person's debt for a specific statement cycle. The
 * ledger is recomputed from `debt_movements` so the platform has a fast lookup
 * for dashboards, reminder automation, and financial reporting.
 */
export const debtLedger = pgTable(
  "debt_ledger",
  {
    /**
     * Primary key for the ledger row. Supports UUIDs or composite keys from
     * upstream providers.
     */
    debtLedgerId: varchar("debt_ledger_id", { length: 36 }).primaryKey(),

    /**
     * Person whose debt position is being summarised. Links to the `people`
     * table so consumer flows can join profile information.
     */
    personId: varchar("person_id", { length: 36 })
      .notNull()
      .references(() => people.personId, { onDelete: "restrict" }),

    /**
     * Optional cycle identifier (e.g. YYYY-MM). Enables per-cycle ledgers while
     * still allowing a single "current" row when omitted.
     */
    cycleTag: varchar("cycle_tag", { length: 10 }),

    /**
     * Balance carried into the cycle before any new activity. Defaults to 0 to
     * avoid null math during aggregation.
     */
    initialDebt: numeric("initial_debt", { precision: 18, scale: 2 })
      .notNull()
      .default("0"),

    /**
     * All newly incurred debt recorded during the cycle.
     */
    newDebt: numeric("new_debt", { precision: 18, scale: 2 }).notNull().default("0"),

    /**
     * Payments or adjustments that reduce outstanding debt for the cycle.
     */
    repayments: numeric("repayments", { precision: 18, scale: 2 })
      .notNull()
      .default("0"),

    /**
     * Discounts, cashback, or negotiated reductions that lessen the debt.
     */
    debtDiscount: numeric("debt_discount", { precision: 18, scale: 2 }).default("0"),

    /**
     * Net position after applying the formula: `initial_debt + new_debt -
     * repayments - debt_discount`. Stored so downstream dashboards do not need
     * to re-calculate on every query.
     */
    netDebt: numeric("net_debt", { precision: 18, scale: 2 }).notNull().default("0"),

    /**
     * Operational state of the ledger entry.
     */
    status: debtLedgerStatusEnum("status").notNull(),

    /**
     * Timestamp updated whenever the aggregation job re-computes balances.
     */
    lastUpdated: timestamp("last_updated", { withTimezone: true }).defaultNow().notNull(),

    /**
     * Optional notes for collectors, finance analysts, or system annotations.
     */
    notes: text("notes"),
  },
  (table) => ({
    /**
     * Guarantees at most one ledger row per person/cycle combination whenever a
     * `cycle_tag` is supplied. For the "current" snapshot (null cycle) the sync
     * process should ensure only one row exists.
     */
    personCycleIdx: uniqueIndex("debt_ledger_person_cycle_uidx").on(
      table.personId,
      table.cycleTag,
    ),
  }),
);

export type DebtLedger = typeof debtLedger.$inferSelect;
export type NewDebtLedger = typeof debtLedger.$inferInsert;
