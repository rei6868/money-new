import { pgEnum, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

/**
 * Enumerates the lifecycle state for each person record within the platform.
 * This ensures downstream services treat active vs. inactive vs. archived
 * people consistently.
 */
export const personStatusEnum = pgEnum("person_status", [
  "active",
  "inactive",
  "archived",
]);

/**
 * People table captures all debtors and financial contacts that participate in
 * the platform, independent of user accounts. Each column is documented for
 * clarity across engineering and product stakeholders.
 */
export const people = pgTable("people", {
  /**
   * Primary key for the person. Uses string identifiers (e.g. UUID) to support
   * integration with external systems or imports.
   */
  personId: varchar("person_id", { length: 36 }).primaryKey(),

  /**
   * Full name displayed across UI surfaces and reports. Required so each record
   * is human readable and easy to identify by operations teams.
   */
  fullName: varchar("full_name", { length: 180 }).notNull(),

  /**
   * Optional contact information (phone number, email, messenger handle). This
   * field is stored as free-form text to accommodate multiple formats.
   */
  contactInfo: text("contact_info"),

  /**
   * Lifecycle status dictating whether the person is actively associated with
   * current transactions, paused, or archived from everyday views.
   */
  status: personStatusEnum("status").notNull(),

  /**
   * Optional reference to a group or household identifier. Enables future
   * linkage once group management tables are introduced.
   */
  groupId: varchar("group_id", { length: 36 }),

  /**
   * Optional URL to the person's avatar stored on a CDN such as Cloudinary.
   * Used on dashboards, cards, and mobile views for visual recognition.
   */
  imgUrl: text("img_url"),

  /**
   * Free-form notes for operations teams (e.g. debtor remarks or preferred
   * contact methods). Optional to avoid clutter when not needed.
   */
  note: text("note"),

  /**
   * Creation timestamp. Defaults to the database clock so record insertion time
   * is always captured for auditing.
   */
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),

  /**
   * Timestamp of the most recent update, enabling change tracking and audit
   * trails throughout the person's lifecycle.
   */
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Person = typeof people.$inferSelect;
export type NewPerson = typeof people.$inferInsert;
