import { numeric, pgEnum, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

import { accounts } from "./accounts";

/**
 * Enumerates eligibility outcomes for an account within a cashback cycle.
 * These flags guide UI messaging and automation decisions such as whether the
 * platform should suggest new rewards or pause accrual until the cap resets.
 */
export const cashbackEligibilityEnum = pgEnum("cashback_eligibility", [
  "eligible",
  "not_eligible",
  "reached_cap",
  "pending",
]);

/**
 * Tracks the lifecycle status of a cashback ledger entry.
 * Ledgers stay "open" while the cycle is active and switch to "closed" once the
 * final reconciliation job runs and the record becomes read-only.
 */
export const cashbackLedgerStatusEnum = pgEnum("cashback_ledger_status", [
  "open",
  "closed",
]);

/**
 * Aggregated snapshot of cashback performance per account and cycle. The ledger
 * consolidates all related cashback movements to provide a single source of
 * truth for dashboards, budgeting, and cap monitoring workflows.
 */
export const cashbackLedger = pgTable(
  "cashback_ledger",
  {
    /**
     * Primary key for the ledger entry. Supports UUIDs or external identifiers.
     */
    cashbackLedgerId: varchar("cashback_ledger_id", { length: 36 }).primaryKey(),

    /**
     * References the account whose cashback performance is being summarised.
     * Required so downstream analytics can join against account attributes such
     * as owner, product type, or institution.
     */
    accountId: varchar("account_id", { length: 36 })
      .notNull()
      .references(() => accounts.accountId, { onDelete: "restrict" }),

    /**
     * Period tag in YYYY-MM format representing the billing cycle being
     * reported. Downstream services use this to render monthly dashboards and to
     * enforce that only one ledger row exists per account/cycle combination.
     */
    cycleTag: varchar("cycle_tag", { length: 10 }).notNull(),

    /**
     * Sum of all qualifying spend recorded for the cycle. Calculated by the
     * aggregation job using the underlying transactions linked to the
     * cashback movements. Defaults to 0 until the first sync completes.
     */
    totalSpend: numeric("total_spend", { precision: 18, scale: 2 }).notNull().default("0"),

    /**
     * Total cashback credited during the cycle after applying rules and caps.
     * Used to drive UI summaries and to compute the remaining budget.
     */
    totalCashback: numeric("total_cashback", { precision: 18, scale: 2 })
      .notNull()
      .default("0"),

    /**
     * Maximum cashback allowance configured for the cycle. Stored even when the
     * cap is effectively unlimited so audits can see the configuration that was
     * evaluated by the budget engine.
     */
    budgetCap: numeric("budget_cap", { precision: 18, scale: 2 }).notNull().default("0"),

    /**
     * Eligibility signal summarising whether the account qualifies for cashback
     * this cycle. Useful for preventing payouts when requirements such as
     * minimum spend or program enrollment are not met.
     */
    eligibility: cashbackEligibilityEnum("eligibility").notNull(),

    /**
     * Remaining budget after subtracting the credited cashback from the cycle's
     * cap. The value can go negative when the cap is intentionally exceeded
     * (e.g. manual override) so analysts can quantify the overage.
     */
    remainingBudget: numeric("remaining_budget", { precision: 18, scale: 2 })
      .notNull()
      .default("0"),

    /**
     * Operational status for the ledger entry. "open" indicates the cycle is
     * still accruing cashback, while "closed" freezes the record for reporting
     * once reconciliation completes.
     */
    status: cashbackLedgerStatusEnum("status").notNull(),

    /**
     * Optional operational notes (e.g. manual adjustments, audit comments or
     * explanations for eligibility overrides).
     */
    notes: text("notes"),

    /**
     * Timestamp of the last successful aggregation run affecting the ledger.
     * Updated whenever totals, eligibility, or status shift so consumers can
     * reason about data freshness.
     */
    lastUpdated: timestamp("last_updated", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    /**
     * Unique index guaranteeing a single ledger row exists per account and
     * cycle while still optimising the common query path.
     */
    accountCycleIdx: uniqueIndex("cashback_ledger_account_cycle_uidx").on(
      table.accountId,
      table.cycleTag,
    ),
  }),
);

export type CashbackLedger = typeof cashbackLedger.$inferSelect;
export type NewCashbackLedger = typeof cashbackLedger.$inferInsert;
