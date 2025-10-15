CREATE TYPE "public"."debt_movement_status" AS ENUM('active', 'settled', 'reversed');--> statement-breakpoint
CREATE TYPE "public"."debt_movement_type" AS ENUM('borrow', 'repay', 'adjust', 'discount', 'split');--> statement-breakpoint
CREATE TABLE "debt_movements" (
	"debt_movement_id" varchar(36) PRIMARY KEY NOT NULL,
	"transaction_id" varchar(36) NOT NULL,
	"person_id" varchar(36) NOT NULL,
	"account_id" varchar(36) NOT NULL,
	"movement_type" "debt_movement_type" NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"cycle_tag" varchar(10),
	"status" "debt_movement_status" NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "debt_movements_person_account_idx" ON "debt_movements" ("person_id","account_id");--> statement-breakpoint
CREATE INDEX "debt_movements_account_cycle_idx" ON "debt_movements" ("account_id","cycle_tag");--> statement-breakpoint
ALTER TABLE "debt_movements" ADD CONSTRAINT "debt_movements_transaction_id_transactions_transaction_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("transaction_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debt_movements" ADD CONSTRAINT "debt_movements_person_id_people_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("person_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debt_movements" ADD CONSTRAINT "debt_movements_account_id_accounts_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("account_id") ON DELETE restrict ON UPDATE no action;
