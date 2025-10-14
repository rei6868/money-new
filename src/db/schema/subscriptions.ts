// subscriptions.ts
import { sql } from "drizzle-orm";
import {
  foreignKey,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
  numeric,
  date,
  check,
} from "drizzle-orm/pg-core";

import { accounts } from "./accounts";
import { people } from "./people";

/**
 * Enumerates supported billing cadences for subscriptions managed by the
 * platform. These values align with finance reporting requirements and are
 * intentionally extensible for future product offerings.
 */
export const subscriptionIntervalEnum = pgEnum("subscription_interval", [
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
  "custom",
]);

/**
 * Lifecycle states for a subscription contract. Controls how billing jobs and
 * UI surfaces treat the record.
 */
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "paused",
  "canceled",
]);

/**
 * Role of a subscription member in relation to the billing agreement. Owners
 * are responsible for payment, participants share the cost, and viewers are
 * informational-only (e.g. children in a family plan).
 */
export const subscriptionMemberRoleEnum = pgEnum("subscription_member_role", [
  "owner",
  "participant",
  "viewer",
]);

/**
 * Lifecycle of an individual subscription member. Keeps reconciliation logic
 * and reminders consistent for suspended vs. active participants.
 */
export const subscriptionMemberStatusEnum = pgEnum("subscription_member_status", [
  "active",
  "inactive",
  "pending",
]);

/**
 * Canonical subscription catalogue that powers recurring billing, reminders,
 * and budgeting analytics. Each column is documented so product and finance
 * stakeholders have a shared understanding of the persistence model.
 */
export const subscriptions = pgTable(
  "subscriptions",
  {
    /**
     * Primary key for the subscription. Stored as a string to support UUIDs or
     * external identifiers from billing providers.
     */
    subscriptionId: varchar("subscription_id", { length: 36 }).primaryKey(),

    /**
     * Human-friendly label displayed across dashboards and reminders.
     */
    subscriptionName: varchar("subscription_name", { length: 160 }).notNull(),

    /**
     * Optional service provider label (e.g. Netflix, Figma) stored separately
     * from subscriptionName so reporting can group by vendor.
     */
    provider: varchar("provider", { length: 120 }),

    /**
     * Account responsible for paying the subscription. Required so ledger
     * postings know which balance to debit.
     */
    billingAccountId: varchar("billing_account_id", { length: 36 })
      .notNull()
      .references(() => accounts.accountId, { onDelete: "restrict" }),

    /**
     * Person coordinating the subscription (e.g. household admin). Helps the
     * operations team know who to contact when payments fail.
     */
    ownerId: varchar("owner_id", { length: 36 })
      .notNull()
      .references(() => people.personId, { onDelete: "restrict" }),

    /**
     * Recurring charge amount for the plan. Optional because some plans are
     * variable or usage based.
     */
    amount: numeric("amount", { precision: 18, scale: 2 }),

    /**
     * ISO currency code for the billing amount.
     */
    currencyCode: varchar("currency_code", { length: 10 }).default("USD"),

    /**
     * Billing cadence that dictates scheduling for automation and reminders.
     */
    billingInterval: subscriptionIntervalEnum("billing_interval").notNull(),

    /**
     * Optional anchor date for the next billing cycle.
     */
    nextBillingDate: date("next_billing_date"),

    /**
     * Lifecycle status of the subscription.
     */
    status: subscriptionStatusEnum("status").notNull().default("active"),

    /**
     * Free-form notes used by customer support or automation workflows.
     */
    notes: text("notes"),

    /**
     * Record creation timestamp for auditing.
     */
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),

    /**
     * Timestamp of the latest update.
     */
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    subscriptionNameAccountIdx: uniqueIndex("subscriptions_account_name_uidx").on(
      table.billingAccountId,
      table.subscriptionName,
    ),
  }),
);

/**
 * Join table representing people participating in a subscription along with
 * their cost-sharing responsibility.
 */
export const subscriptionMembers = pgTable(
  "subscription_members",
  {
    /**
     * Primary key for the member entry.
     */
    memberId: varchar("member_id", { length: 36 }).primaryKey(),

    /**
     * References the subscription this member belongs to.
     */
    subscriptionId: varchar("subscription_id", { length: 36 })
      .notNull()
      .references(() => subscriptions.subscriptionId, { onDelete: "cascade" }),

    /**
     * Person participating in the subscription.
     */
    personId: varchar("person_id", { length: 36 })
      .notNull()
      .references(() => people.personId, { onDelete: "cascade" }),

    /**
     * Optional account used when this participant reimburses the owner.
     */
    reimbursementAccountId: varchar("reimbursement_account_id", { length: 36 }).references(
      () => accounts.accountId,
      { onDelete: "set null" },
    ),

    /**
     * Share of the subscription cost assigned to the member. Stored as a
     * decimal where 0.5 = 50%.
     */
    responsibilityShare: numeric("responsibility_share", { precision: 5, scale: 4 }),

    /**
     * Role of the member in the subscription contract.
     */
    role: subscriptionMemberRoleEnum("role").notNull().default("participant"),

    /**
     * Lifecycle state for the membership record.
     */
    status: subscriptionMemberStatusEnum("status").notNull().default("active"),

    /**
     * Optional free-form notes per participant.
     */
    notes: text("notes"),

    /**
     * Creation timestamp.
     */
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),

    /**
     * Update timestamp.
     */
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    subscriptionPersonIdx: uniqueIndex("subscription_members_subscription_person_uidx").on(
      table.subscriptionId,
      table.personId,
    ),

    // Keep explicit FKs for clarity & migration safety.
    subscriptionFk: foreignKey({
      columns: [table.subscriptionId],
      foreignColumns: [subscriptions.subscriptionId],
      name: "subscription_members_subscription_id_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    personFk: foreignKey({
      columns: [table.personId],
      foreignColumns: [people.personId],
      name: "subscription_members_person_id_fkey",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    reimbursementAccountFk: foreignKey({
      columns: [table.reimbursementAccountId],
      foreignColumns: [accounts.accountId],
      name: "subscription_members_reimbursement_account_id_fkey",
    })
      .onDelete("set null")
      .onUpdate("cascade"),

    // Adapted from the other branch: keep bounds validation for share %
    responsibilityShareBounds: check(
      "subscription_members_responsibility_share_check",
      sql`responsibility_share IS NULL OR (responsibility_share >= 0 AND responsibility_share <= 1)`,
    ),
  }),
);

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;

export type SubscriptionMember = typeof subscriptionMembers.$inferSelect;
export type NewSubscriptionMember = typeof subscriptionMembers.$inferInsert;
