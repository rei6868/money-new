import { foreignKey, pgTable, text, timestamp, varchar, numeric } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { accounts } from "./accounts";

/**
 * Card profit/loss table capturing the aggregated financial outcome for each
 * credit card (or account) on a yearly basis. Stores earnings, fees, and
 * computed net performance to power dashboards and downstream analytics.
 */
export const cardPl = pgTable("card_pl", {
  /**
   * Primary key for the card profit/loss record. Uses string identifiers so the
   * record can align with UUIDs or externally generated IDs.
   */
  cardPlId: varchar("card_pl_id", { length: 36 }).primaryKey(),

  /**
   * Foreign key to the account this P/L entry belongs to. Keeps yearly
   * performance tied to the correct credit card or rewards account.
   */
  accountId: varchar("account_id", { length: 36 }).notNull(),

  /**
   * Reporting year for the aggregated data (e.g. "2024"). Stored as text to
   * allow flexible formatting should fiscal years be introduced later.
   */
  year: varchar("year", { length: 9 }).notNull(),

  /**
   * Total monetary value earned during the specified year. Includes cashback,
   * statement credits, category bonuses, and any other benefits tied to the
   * account.
   */
  totalEarned: numeric("total_earned", { precision: 18, scale: 2 }).notNull().default("0"),

  /**
   * Aggregate annual fees and other costs incurred for maintaining the card in
   * the same reporting window. Captures base fees as well as any service
   * surcharges.
   */
  totalFee: numeric("total_fee", { precision: 18, scale: 2 }).notNull().default("0"),

  /**
   * Net profit/loss derived from totalEarned minus totalFee. Stored as a
   * generated column so downstream queries always reference a consistent
   * calculation.
   */
  netPl: numeric("net_pl", { precision: 18, scale: 2 })
    .generatedAlwaysAs(sql`coalesce("total_earned", 0) - coalesce("total_fee", 0)`)
    .stored(),

  /**
   * Operational notes or annotations (e.g. explaining fee reimbursements or
   * partial refunds). Optional by design to avoid clutter.
   */
  notes: text("notes"),

  /**
   * Creation timestamp for the record, defaults to the database clock. Useful
   * for auditing and understanding when the annual summary was first captured.
   */
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),

  /**
   * Timestamp for the most recent update. Maintained by application logic when
   * totals are recalculated or notes change.
   */
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  accountFk: foreignKey({
    columns: [table.accountId],
    foreignColumns: [accounts.accountId],
    name: "card_pl_account_id_fkey",
  })
    .onDelete("cascade")
    .onUpdate("cascade"),
}));

export type CardPl = typeof cardPl.$inferSelect;
export type NewCardPl = typeof cardPl.$inferInsert;
