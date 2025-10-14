import {
  foreignKey,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
  numeric,
} from "drizzle-orm/pg-core";

import { assets } from "./assets";
import { people } from "./people";

/**
 * Enumerates all supported account types within the finance platform.
 * This enum is extensible so product teams can add new categories as the
 * product footprint grows (e.g. mortgage, loan, crypto wallet, etc.).
 */
export const accountTypeEnum = pgEnum("account_type", [
  "bank",
  "credit",
  "saving",
  "invest",
  "e-wallet",
  "group",
  "loan",
  "mortgage",
  "cash",
  "other",
]);

/**
 * Enumerates all lifecycle states an account can adopt.
 * "active" = transactions accepted, "closed" = account retired but retained
 * for reporting, "archived" = hidden by default yet preserved historically.
 */
export const accountStatusEnum = pgEnum("account_status", [
  "active",
  "closed",
  "archived",
]);

/**
 * Accounts table definition capturing every financial account that a user or
 * household manages inside the platform. Each field has explicit documentation
 * to help both engineering and product stakeholders understand the business
 * rules enforced at the persistence layer.
 */
export const accounts = pgTable("accounts", {
  /**
   * Globally unique identifier for the account. Stored as a string to allow
   * UUIDs or externally-generated IDs. Serves as the primary key and anchor
   * for all foreign-key relationships (transactions, balances, etc.).
   */
  accountId: varchar("account_id", { length: 36 }).primaryKey(),

  /**
   * Human-friendly label used across the UI and exports. Required to ensure
   * every account can be referenced unambiguously by end users and support.
   */
  accountName: varchar("account_name", { length: 120 }).notNull(),

  /**
   * Optional URL pointing to an avatar, bank logo, or card thumbnail hosted on
   * a CDN (e.g. Cloudinary). Used in dashboards, cards, and mobile views to
   * give users quick visual recognition of their accounts.
   */
  imgUrl: text("img_url"),

  /**
   * Categorisation used for reporting, filtering, and business logic (e.g.
   * credit vs. asset accounts). Backed by a controlled enum to prevent drift
   * and to guarantee consistent aggregation behaviour.
   */
  accountType: accountTypeEnum("account_type").notNull(),

  /**
   * Foreign key to the People table identifying the owner or responsible party
   * for the account. Mandatory so balances can always be mapped to a person.
   * If ownership is shared, represent it via a group account and children.
   */
  ownerId: varchar("owner_id", { length: 36 })
    .notNull()
    .references(() => people.personId, { onDelete: "restrict" }),

  /**
   * Self-referencing foreign key that links a child account to its parent
   * grouping account. Null for top-level or stand-alone accounts. The parent
   * is expected to aggregate balances of its immediate children.
   */
  parentAccountId: varchar("parent_account_id", { length: 36 }),

  /**
   * Optional linkage to an Asset record (e.g. collateral or pledged asset).
   * Enables risk reporting and ensures collateralised accounts can surface
   * the underlying asset metadata.
   */
  assetRef: varchar("asset_ref", { length: 36 }).references(() => assets.assetId, {
    onDelete: "set null",
  }),

  /**
   * Balance when the account record was created in the system. Stored with two
   * decimal precision to support currency values. This value is immutable and
   * acts as the baseline for reconciliation audits.
   */
  openingBalance: numeric("opening_balance", { precision: 18, scale: 2 }).notNull(),

  /**
   * Current balance snapshot. Updated by transaction posting processes or
   * scheduled balance refresh jobs. Required so ledgers can be rendered without
   * recalculating totals from history on every request.
   */
  currentBalance: numeric("current_balance", { precision: 18, scale: 2 }).notNull(),

  /**
   * Lifecycle status controlling operational behaviour. Active accounts accept
   * transactions, closed accounts are read-only, archived accounts are hidden
   * from most views but remain queryable for audit purposes.
   */
  status: accountStatusEnum("status").notNull(),

  /**
   * Running sum of all inbound transactions (credits). Maintained automatically
   * by the transaction engine to support quick analytics and integrity checks.
   */
  totalIn: numeric("total_in", { precision: 18, scale: 2 }).notNull().default("0"),

  /**
   * Running sum of all outbound transactions (debits). Maintained automatically
   * alongside totalIn for net cash-flow analysis.
   */
  totalOut: numeric("total_out", { precision: 18, scale: 2 }).notNull().default("0"),

  /**
   * Timestamp of creation, defaulting to the database clock. Essential for
   * chronological reporting and for debugging data ingestion flows.
   */
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),

  /**
   * Timestamp of the last mutation. Automatically maintained by application
   * logic during updates to keep audit trails reliable.
   */
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),

  /**
   * Free-form annotations such as reconciliation notes or operational comments.
   * Optional to avoid polluting the record when no remarks are necessary.
   */
  notes: text("notes"),
}, (table) => ({
  parentAccountFk: foreignKey({
    columns: [table.parentAccountId],
    foreignColumns: [table.accountId],
    name: "accounts_parent_account_id_fkey",
  })
    .onDelete("set null")
    .onUpdate("cascade"),
  ownerFk: foreignKey({
    columns: [table.ownerId],
    foreignColumns: [people.personId],
    name: "accounts_owner_id_fkey",
  })
    .onDelete("restrict")
    .onUpdate("cascade"),
  assetFk: foreignKey({
    columns: [table.assetRef],
    foreignColumns: [assets.assetId],
    name: "accounts_asset_ref_fkey",
  })
    .onDelete("set null")
    .onUpdate("cascade"),
}));

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
