import { sql } from "drizzle-orm";
import { check, pgEnum, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { people } from "./people";

/**
 * Enumerates the intent of a linked Google Sheet so downstream automation can
 * decide how to treat the data (read-only report, debt tracker, or sync source).
 */
export const sheetLinkTypeEnum = pgEnum("sheet_link_type", [
  "report",
  "debt",
  "sync",
]);

/**
 * Normalised definition for Google Sheet integrations. Each record links a
 * spreadsheet URL to a specific person or group so reconciliation jobs and
 * dashboards can reuse a single source of truth.
 */
export const sheetLinks = pgTable("sheet_links", {
  /**
   * Primary key for the sheet link. Uses strings (UUIDs) for compatibility with
   * external ID generators used by integrations.
   */
  sheetLinkId: varchar("sheet_link_id", { length: 36 }).primaryKey(),

  /**
   * Direct URL to the Google Sheet. Stored as text to support long share links
   * with query parameters and export options.
   */
  url: text("url").notNull(),

  /**
   * Optional reference to the person whose data is represented in the sheet.
   * When populated, deletion of the person will nullify the link rather than
   * cascade to protect the historical sheet association.
   */
  personId: varchar("person_id", { length: 36 }).references(() => people.personId, {
    onDelete: "set null",
  }),

  /**
   * Optional reference to a future Groups table. Nullable until the group
   * aggregate is defined but retained for forward compatibility with household
   * level reports.
   */
  groupId: varchar("group_id", { length: 36 }),

  /**
   * Categorises the usage of the linked sheet. Drives which automation pipeline
   * will execute when synchronising data.
   */
  type: sheetLinkTypeEnum("type").notNull(),

  /**
   * Timestamp of the most recent successful sync. Remains null for links that
   * have not yet been processed by the synchronisation workers.
   */
  lastSync: timestamp("last_sync", { withTimezone: true }),

  /**
   * Optional operational notes such as credentials, required filters, or manual
   * reconciliation tips maintained by the finance team.
   */
  notes: text("notes"),

  /**
   * Creation timestamp captured automatically for audit trails and onboarding
   * analytics.
   */
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),

  /**
   * Timestamp of the latest mutation (URL rotation, reassignment, etc.). Updated
   * by application services whenever the record changes.
   */
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  /**
   * Ensures the sheet link targets exactly one entity so downstream processes
   * never need to guess whether to read person or group context.
   */
  targetExclusivity: check(
    "sheet_links_target_exclusivity_check",
    sql`
      (person_id IS NOT NULL AND group_id IS NULL)
      OR
      (group_id IS NOT NULL AND person_id IS NULL)
    `,
  ),
}));

export type SheetLink = typeof sheetLinks.$inferSelect;
export type NewSheetLink = typeof sheetLinks.$inferInsert;
