import { pgEnum, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

/**
 * Enumerates the high-level merchant categories surfaced across analytics and
 * filtering experiences. Standardising these values keeps reporting consistent
 * across ingestion sources.
 */
export const shopTypeEnum = pgEnum("shop_type", [
  "food",
  "retail",
  "digital",
  "service",
  "other",
]);

/**
 * Lifecycle visibility for each merchant. Merchants marked as hidden stay in
 * the database for historical transactions but are not promoted in UI lists.
 */
export const shopStatusEnum = pgEnum("shop_status", ["active", "hidden"]);

/**
 * Normalised merchant catalogue that powers dashboards and links transactions
 * to specific shop entries. Each column is documented to align engineering and
 * operational usage.
 */
export const shops = pgTable("shops", {
  /**
   * Primary key that typically stores a UUID or provider identifier so records
   * can be referenced from transactions and cashback ledgers.
   */
  shopId: varchar("shop_id", { length: 36 }).primaryKey(),

  /**
   * Human readable merchant name surfaced on dashboards, statements, and
   * filters.
   */
  shopName: varchar("shop_name", { length: 180 }).notNull(),

  /**
   * Categorisation bucket used for spend analytics (e.g. dining vs. retail).
   */
  shopType: shopTypeEnum("shop_type").notNull(),

  /**
   * Optional CDN-backed logo or brand mark rendered in merchant carousels.
   */
  imgUrl: text("img_url"),

  /**
   * Optional canonical website link for the merchant so users can drill into
   * offers or additional context.
   */
  url: text("url"),

  /**
   * Visibility state controlling whether the merchant appears by default in
   * selectors and dashboards.
   */
  status: shopStatusEnum("status").notNull(),

  /**
   * Free-form notes to capture negotiations, partner details, or operational
   * annotations about the merchant.
   */
  notes: text("notes"),

  /**
   * Creation timestamp. Defaults to the database clock for accurate auditing
   * regardless of ingestion path.
   */
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),

  /**
   * Last modification timestamp for data freshness and change tracking.
   */
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Shop = typeof shops.$inferSelect;
export type NewShop = typeof shops.$inferInsert;
