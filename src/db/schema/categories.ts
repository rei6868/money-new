import { foreignKey, pgEnum, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

/**
 * Enumerates the high-level classification of a category. These groupings keep
 * analytics and filtering consistent across the platform by distinguishing
 * between income buckets, expense buckets, and specialised flows such as debt
 * management or subscription billing.
 */
export const categoryKindEnum = pgEnum("category_kind", [
  "expense",
  "income",
  "transfer",
  "debt",
  "cashback",
  "subscription",
  "other",
]);

/**
 * Canonical list of transaction categories. Downstream services rely on this
 * table to aggregate spending, income, and debt activity under meaningful
 * labels. The schema is intentionally compact yet well documented so future
 * stories can extend it without guesswork.
 */
export const categories = pgTable("categories", {
  /**
   * Primary key for the category. Stored as a string to accommodate UUIDs or
   * externally provided identifiers from import pipelines.
   */
  categoryId: varchar("category_id", { length: 36 }).primaryKey(),

  /**
   * Human friendly label surfaced in reports, budgets, and search. Required to
   * ensure that every category can be clearly communicated to end users.
   */
  name: varchar("name", { length: 120 }).notNull(),

  /**
   * High-level grouping that aligns with reporting buckets (expense vs. income,
   * debt, subscriptions, etc.). Backed by an enum to maintain consistent
   * behaviour across calculations and dashboards.
   */
  kind: categoryKindEnum("kind").notNull(),

  /**
   * Optional parent category identifier for hierarchical budgeting structures.
   * Enables roll-up reporting without hardcoding relationships in the app
   * layer.
   */
  parentCategoryId: varchar("parent_category_id", { length: 36 }),

  /**
   * Rich-text description or policy notes that give context to finance or ops
   * teams when classifying transactions.
   */
  description: text("description"),

  /**
   * Creation timestamp used by migration tooling and auditing.
   */
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),

  /**
   * Last update timestamp so reporting caches can detect when metadata changes.
   */
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  parentCategoryFk: foreignKey({
    columns: [table.parentCategoryId],
    foreignColumns: [table.categoryId],
    name: "categories_parent_category_id_fkey",
  })
    .onDelete("set null")
    .onUpdate("cascade"),
}));

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
