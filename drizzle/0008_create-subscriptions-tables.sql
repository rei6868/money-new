CREATE TYPE "public"."subscription_interval" AS ENUM('weekly', 'monthly', 'quarterly', 'yearly', 'custom');--> statement-breakpoint
CREATE TYPE "public"."subscription_member_role" AS ENUM('owner', 'member', 'participant', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."subscription_member_status" AS ENUM('active', 'left', 'inactive', 'pending');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'paused', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."subscription_type" AS ENUM('youtube', 'icloud', 'spotify', 'netflix', 'other');--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"subscription_id" varchar(36) PRIMARY KEY NOT NULL,
	"name" varchar(180) NOT NULL,
	"provider" varchar(120),
	"type" "subscription_type" NOT NULL,
	"price_per_month" numeric(12, 2) NOT NULL,
	"currency_code" varchar(10) DEFAULT 'USD',
	"billing_interval" "subscription_interval" NOT NULL,
	"next_billing_date" date,
	"owner_id" varchar(36) NOT NULL,
	"billing_account_id" varchar(36) NOT NULL,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"img_url" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_owner_id_people_person_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."people"("person_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_billing_account_id_accounts_account_id_fk" FOREIGN KEY ("billing_account_id") REFERENCES "public"."accounts"("account_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_account_name_uidx" ON "subscriptions" ("billing_account_id","name");--> statement-breakpoint
CREATE TABLE "subscription_members" (
	"member_id" varchar(36) PRIMARY KEY NOT NULL,
	"subscription_id" varchar(36) NOT NULL,
	"person_id" varchar(36) NOT NULL,
	"reimbursement_account_id" varchar(36),
	"role" "subscription_member_role" DEFAULT 'participant' NOT NULL,
	"join_date" date NOT NULL,
	"leave_date" date,
	"share_ratio" numeric(5, 4),
	"status" "subscription_member_status" DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_members_share_ratio_check" CHECK (("share_ratio" IS NULL) OR (("share_ratio" >= 0) AND ("share_ratio" <= 1)))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_members_subscription_person_idx" ON "subscription_members" ("subscription_id","person_id");--> statement-breakpoint
ALTER TABLE "subscription_members" ADD CONSTRAINT "subscription_members_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("subscription_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "subscription_members" ADD CONSTRAINT "subscription_members_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "public"."people"("person_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "subscription_members" ADD CONSTRAINT "subscription_members_reimbursement_account_id_fkey" FOREIGN KEY ("reimbursement_account_id") REFERENCES "public"."accounts"("account_id") ON DELETE set null ON UPDATE cascade;
