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
  foreignKey,
} from "drizzle-orm/pg-core";

import { people } from "./people";
import { accounts } from "./accounts";

export const subscriptionTypeEnum = pgEnum("subscription_type", [
  "youtube",
  "icloud",
  "spotify",
  "netflix",
  "other",
]);

export const subscriptionIntervalEnum = pgEnum("subscription_interval", [
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
  "custom",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "paused",
  "cancelled",
]);

export const subscriptionMemberRoleEnum = pgEnum("subscription_member_role", [
  "owner",
  "member",
  "participant",
  "viewer",
]);

export const subscriptionMemberStatusEnum = pgEnum("subscription_member_status", [
  "active",
  "left",
  "inactive",
  "pending",
]);

export const subscriptions = pgTable(
  "subscriptions",
  {
    subscriptionId: varchar("subscription_id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 180 }).notNull(),
    provider: varchar("provider", { length: 120 }),
    type: subscriptionTypeEnum("type").notNull(),
    pricePerMonth: numeric("price_per_month", { precision: 12, scale: 2 }).notNull(),
    currencyCode: varchar("currency_code", { length: 10 }).default("USD"),
    billingInterval: subscriptionIntervalEnum("billing_interval").notNull(),
    nextBillingDate: date("next_billing_date"),
    ownerId: varchar("owner_id", { length: 36 })
      .notNull()
      .references(() => people.personId, { onDelete: "restrict" }),
    billingAccountId: varchar("billing_account_id", { length: 36 })
      .notNull()
      .references(() => accounts.accountId, { onDelete: "restrict" }),
    status: subscriptionStatusEnum("status").notNull().default("active"),
    imageUrl: text("img_url"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    subscriptionNameAccountIdx: uniqueIndex("subscriptions_account_name_uidx").on(
      table.billingAccountId,
      table.name
    ),
  })
);

export const subscriptionMembers = pgTable(
  "subscription_members",
  {
    memberId: varchar("member_id", { length: 36 }).primaryKey(),
    subscriptionId: varchar("subscription_id", { length: 36 })
      .notNull()
      .references(() => subscriptions.subscriptionId, { onDelete: "cascade" }),
    personId: varchar("person_id", { length: 36 })
      .notNull()
      .references(() => people.personId, { onDelete: "cascade" }),
    reimbursementAccountId: varchar("reimbursement_account_id", { length: 36 }).references(
      () => accounts.accountId,
      { onDelete: "set null" }
    ),
    role: subscriptionMemberRoleEnum("role").notNull().default("participant"),
    joinDate: date("join_date").notNull(),
    leaveDate: date("leave_date"),
    shareRatio: numeric("share_ratio", { precision: 5, scale: 4 }),
    status: subscriptionMemberStatusEnum("status").notNull().default("active"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    subscriptionMemberUnique: uniqueIndex("subscription_members_subscription_person_idx").on(
      table.subscriptionId,
      table.personId
    ),
    shareRatioBounds: check(
      "subscription_members_share_ratio_check",
      sql`share_ratio IS NULL OR (share_ratio >= 0 AND share_ratio <= 1)`
    ),
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
  })
);

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type SubscriptionMember = typeof subscriptionMembers.$inferSelect;
export type NewSubscriptionMember = typeof subscriptionMembers.$inferInsert;