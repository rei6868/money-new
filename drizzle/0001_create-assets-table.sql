CREATE TYPE "public"."asset_status" AS ENUM('active', 'sold', 'transferred', 'frozen');--> statement-breakpoint
CREATE TYPE "public"."asset_type" AS ENUM('saving', 'invest', 'real_estate', 'crypto', 'bond', 'collateral', 'other');--> statement-breakpoint
CREATE TABLE "assets" (
	"asset_id" varchar(36) PRIMARY KEY NOT NULL,
	"asset_name" varchar(180) NOT NULL,
	"asset_type" "asset_type" NOT NULL,
	"owner_id" varchar(36) NOT NULL,
	"linked_account_id" varchar(36),
	"status" "asset_status" NOT NULL,
	"current_value" numeric(18, 2) NOT NULL,
	"initial_value" numeric(18, 2),
	"currency" varchar(10),
	"acquired_at" date,
	"img_url" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_owner_id_people_person_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."people"("person_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_linked_account_id_accounts_account_id_fk" FOREIGN KEY ("linked_account_id") REFERENCES "public"."accounts"("account_id") ON DELETE set null ON UPDATE no action;
