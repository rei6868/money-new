CREATE TYPE "public"."cashback_eligibility" AS ENUM('eligible', 'not_eligible', 'reached_cap', 'pending');--> statement-breakpoint
CREATE TYPE "public"."cashback_ledger_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TABLE "cashback_ledger" (
	"cashback_ledger_id" varchar(36) PRIMARY KEY NOT NULL,
	"account_id" varchar(36) NOT NULL,
	"cycle_tag" varchar(10) NOT NULL,
	"total_spend" numeric(18, 2) DEFAULT '0' NOT NULL,
	"total_cashback" numeric(18, 2) DEFAULT '0' NOT NULL,
	"budget_cap" numeric(18, 2) DEFAULT '0' NOT NULL,
	"eligibility" "cashback_eligibility" NOT NULL,
	"remaining_budget" numeric(18, 2) DEFAULT '0' NOT NULL,
	"status" "cashback_ledger_status" NOT NULL,
	"notes" text,
	"last_updated" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cashback_ledger" ADD CONSTRAINT "cashback_ledger_account_id_accounts_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("account_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cashback_ledger_account_cycle_uidx" ON "cashback_ledger" ("account_id","cycle_tag");
