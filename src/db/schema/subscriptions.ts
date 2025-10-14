import { sql } from "drizzle-orm";
import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
  numeric,
  date,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { people } from "./people";

/**
 * Enumerates the source service category for each subscription. The enum can be
 * expanded as the catalogue of supported providers grows (e.g. Notion, Disney+).
 */
export const subscriptionTypeEnum = pgEnum("subscription_type", [
  "youtube",
  "icloud",
  "spotify",
  "netflix",
  "other",
]);

/**
 * Captures the lifecycle status for subscriptions so billing automations can
 * accurately decide whether to emit monthly charges.
 */
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "paused",
  "cancelled",
]);

/**
 * Represents the high-level recurring services tracked in the platform. Each
 * row anchors the billing configuration that downstream jobs use to generate
 * monthly charges for associated members.
 */
export const subscriptions = pgTable("subscriptions", {
  /**
   * Primary key for the subscription record. Uses string identifiers (e.g. UUID)
   * to remain compatible with upstream service integrations.
   */
  subscriptionId: varchar("subscription_id", { length: 36 }).primaryKey(),

  /**
   * Human readable subscription name displayed across dashboards, invoices and
   * member notifications.
   */
  name: varchar("name", { length: 180 }).notNull(),

  /**
   * Category that classifies the subscription for analytics and filtering.
   * Backed by a controlled enum to avoid drift in reporting.
   */
  type: subscriptionTypeEnum("type").notNull(),

  /**
   * Monthly recurring charge denominated in the platform's base currency.
   * Stored as numeric with two decimal places to preserve billing accuracy.
   */
  pricePerMonth: numeric("price_per_month", { precision: 12, scale: 2 }).notNull(),

  /**
   * Foreign key pointing to the person who administrates or owns the
   * subscription contract. Used when creating default member entries and for
   * allocating payments.
   */
  ownerId: varchar("owner_id", { length: 36 }).notNull().references(() => people.personId),

  /**
   * Lifecycle state controlling downstream automation behaviour (e.g. skip
   * invoicing when paused or cancelled).
   */
  status: subscriptionStatusEnum("status").notNull(),

  /**
   * Optional public-facing icon or illustration used in dashboards. Enables
   * richer UI when rendering subscription cards.
   */
  imgUrl: text("img_url"),

  /**
   * Creation timestamp defaults to NOW() so onboarding audits can trace when a
   * subscription was introduced into the system.
   */
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),

  /**
   * Tracks the most recent mutation to the subscription configuration. Enables
   * reconciliation jobs to detect when membership recalculations are required.
   */
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Enumerates roles a subscription member can hold. Owners manage billing while
 * members simply consume the service.
 */
export const subscriptionMemberRoleEnum = pgEnum("subscription_member_role", [
  "owner",
  "member",
]);

/**
 * Status values that control whether a person should still be charged for the
 * subscription in upcoming billing cycles.
 */
export const subscriptionMemberStatusEnum = pgEnum("subscription_member_status", [
  "active",
  "left",
]);

/**
 * Join table that maps people to subscriptions. The shareRatio field empowers
 * proportional cost allocation whenever multiple members split the bill.
 */
export const subscriptionMembers = pgTable("subscription_members", {
    /**
     * Primary key for the membership record. Stored as string (UUID) for
     * compatibility with distributed ID generators.
     */
    memberId: varchar("member_id", { length: 36 }).primaryKey(),

    /**
     * Foreign key linking the membership to its parent subscription.
     */
    subscriptionId: varchar("subscription_id", { length: 36 })
      .notNull()
      .references(() => subscriptions.subscriptionId, { onDelete: "cascade" }),

    /**
     * Foreign key to the person participating in the subscription.
     */
    personId: varchar("person_id", { length: 36 })
      .notNull()
      .references(() => people.personId, { onDelete: "cascade" }),

    /**
     * Indicates whether the member administrates the subscription or is a
     * regular participant. Multiple owners are allowed to support shared
     * administration.
     */
    role: subscriptionMemberRoleEnum("role").notNull(),

    /**
     * Date the member joined the subscription, used when generating pro-rated
     * charges or analysing history.
     */
    joinDate: date("join_date").notNull(),

    /**
     * When populated, indicates the date the member stopped participating in
     * the subscription. Helps automation avoid charging former members while
     * preserving historic participation data.
     */
    leaveDate: date("leave_date"),

    /**
     * Optional ratio (0-1) representing the proportion of the monthly price the
     * member should absorb. Null implies equal split handled at runtime.
     */
    shareRatio: numeric("share_ratio", { precision: 5, scale: 4 }),

    /**
     * Lifecycle flag denoting if the member is still active in the subscription
     * and should be billed in upcoming cycles.
     */
    status: subscriptionMemberStatusEnum("status").notNull(),

    /**
     * Optional free-form notes that capture manual adjustments, custom split
     * rules or context needed for finance reviews.
     */
    notes: text("notes"),

    /**
     * Creation timestamp for the membership record.
     */
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),

    /**
     * Update timestamp to support downstream sync processes.
     */
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  /**
   * Ensures a person cannot be enrolled twice in the same subscription.
   */
  subscriptionMemberUnique: uniqueIndex("subscription_members_subscription_person_idx").on(
    table.subscriptionId,
    table.personId,
  ),
  /**
   * Validates percentage-based allocations remain within the expected bounds.
   */
  shareRatioBounds: check(
    "subscription_members_share_ratio_check",
    sql`share_ratio IS NULL OR (share_ratio >= 0 AND share_ratio <= 1)`,
  ),
}));

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type SubscriptionMember = typeof subscriptionMembers.$inferSelect;
export type NewSubscriptionMember = typeof subscriptionMembers.$inferInsert;
