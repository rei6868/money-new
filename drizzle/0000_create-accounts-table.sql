CREATE TYPE "public"."account_status" AS ENUM('active', 'closed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."account_type" AS ENUM('bank', 'credit', 'saving', 'invest', 'e-wallet', 'group', 'loan', 'mortgage', 'cash', 'other');--> statement-breakpoint
CREATE TABLE "accounts" (
	"account_id" varchar(36) PRIMARY KEY NOT NULL,
	"account_name" varchar(120) NOT NULL,
	"img_url" text,
	"account_type" "account_type" NOT NULL,
	"owner_id" varchar(36) NOT NULL,
	"parent_account_id" varchar(36),
	"asset_ref" varchar(36),
	"opening_balance" numeric(18, 2) NOT NULL,
	"current_balance" numeric(18, 2) NOT NULL,
	"status" "account_status" NOT NULL,
	"total_in" numeric(18, 2) DEFAULT '0' NOT NULL,
	"total_out" numeric(18, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_owner_id_people_person_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."people"("person_id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_parent_account_id_accounts_account_id_fk" FOREIGN KEY ("parent_account_id") REFERENCES "public"."accounts"("account_id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_asset_ref_assets_asset_id_fk" FOREIGN KEY ("asset_ref") REFERENCES "public"."assets"("asset_id") ON DELETE set null ON UPDATE cascade;
