import { numeric, pgEnum, pgTable, text, timestamp, varchar, date } from "drizzle-orm/pg-core";

import { accounts } from "./accounts";
import { people } from "./people";

/**
 * Enumerates the supported asset classifications managed by the platform. These
 * categories align with reporting requirements and can be extended as new
 * investment vehicles or collateral types are introduced.
 */
export const assetTypeEnum = pgEnum("asset_type", [
  "saving",
  "invest",
  "real_estate",
  "crypto",
  "bond",
  "collateral",
  "other",
]);

/**
 * Lifecycle states describing whether the asset is currently held, disposed,
 * transferred, or frozen due to regulatory or collateral constraints.
 */
export const assetStatusEnum = pgEnum("asset_status", [
  "active",
  "sold",
  "transferred",
  "frozen",
]);

/**
 * Stores tangible and intangible assets owned by people or groups using the
 * platform. Documentation is intentionally verbose so financial, product, and
 * engineering stakeholders share a consistent understanding of the data model.
 */
export const assets = pgTable("assets", {
  /**
   * Primary key for the asset record. String identifiers (typically UUIDs) are
   * used to enable integration with external import pipelines.
   */
  assetId: varchar("asset_id", { length: 36 }).primaryKey(),

  /**
   * Human readable label for the asset (e.g. "Emergency Fund" or
   * "Saigon Apartment"). Required so dashboards and reports have meaningful
   * descriptors without needing to infer from IDs.
   */
  assetName: varchar("asset_name", { length: 180 }).notNull(),

  /**
   * Classification of the asset. Drives reporting, dashboard grouping, and
   * downstream workflows (e.g. collateral monitoring).
   */
  assetType: assetTypeEnum("asset_type").notNull(),

  /**
   * Owner of the asset. References a person or group stored in the People
   * table. Non-nullable because every asset must be attributable to someone for
   * compliance and reporting.
   */
  ownerId: varchar("owner_id", { length: 36 })
    .notNull()
    .references(() => people.personId, { onDelete: "restrict" }),

  /**
   * Optional linkage to an Account that the asset secures or is tracked
   * alongside (e.g. a loan backed by property). Enables collateral workflows
   * without forcing an account record for every asset.
   */
  linkedAccountId: varchar("linked_account_id", { length: 36 }).references(
    () => accounts.accountId,
    {
      onDelete: "set null",
    },
  ),

  /**
   * Current lifecycle state of the asset. Used by underwriting teams and
   * dashboards to determine whether an asset is active, disposed, or otherwise
   * unavailable.
   */
  status: assetStatusEnum("status").notNull(),

  /**
   * Latest appraised or market value. Stored with two decimal places for
   * currency precision and required for net worth calculations.
   */
  currentValue: numeric("current_value", { precision: 18, scale: 2 }).notNull(),

  /**
   * Original purchase price or cost basis. Optional so assets without a known
   * acquisition cost can still be tracked.
   */
  initialValue: numeric("initial_value", { precision: 18, scale: 2 }),

  /**
   * ISO currency code associated with the valuation (e.g. VND, USD). Stored as
   * string to support multi-currency portfolios and reporting conversions.
   */
  currency: varchar("currency", { length: 10 }),

  /**
   * Date the asset was acquired. Captured separately from createdAt to reflect
   * the true ownership start even when imported later.
   */
  acquiredAt: date("acquired_at"),

  /**
   * Optional link to an image or document stored on a CDN that visually
   * describes the asset (receipts, property photos, etc.).
   */
  imgUrl: text("img_url"),

  /**
   * Free-form notes for operational context, valuation commentary, or other
   * annotations.
   */
  notes: text("notes"),

  /**
   * Record creation timestamp. Defaults to the database clock for auditability.
   */
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),

  /**
   * Timestamp of the most recent update to the asset details.
   */
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;
