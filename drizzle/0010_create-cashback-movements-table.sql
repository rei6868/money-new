CREATE TYPE "public"."cashback_status" AS ENUM('init', 'applied', 'exceed_cap', 'invalidated');--> statement-breakpoint
CREATE TYPE "public"."cashback_type" AS ENUM('percent', 'fixed');--> statement-breakpoint
CREATE TABLE "cashback_movements" (
	"cashback_movement_id" varchar(36) PRIMARY KEY NOT NULL,
	"transaction_id" varchar(36) NOT NULL,
	"account_id" varchar(36) NOT NULL,
	"cycle_tag" varchar(10) NOT NULL,
	"cashback_type" "cashback_type" NOT NULL,
	"cashback_value" numeric(18, 4) NOT NULL,
	"cashback_amount" numeric(18, 2) NOT NULL,
	"status" "cashback_status" NOT NULL,
	"budget_cap" numeric(18, 2),
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "cashback_movements_account_cycle_idx" ON "cashback_movements" ("account_id","cycle_tag");--> statement-breakpoint
ALTER TABLE "cashback_movements" ADD CONSTRAINT "cashback_movements_transaction_id_transactions_transaction_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("transaction_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cashback_movements" ADD CONSTRAINT "cashback_movements_account_id_accounts_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("account_id") ON DELETE restrict ON UPDATE no action;
