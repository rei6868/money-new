CREATE EXTENSION IF NOT EXISTS "pgcrypto";--> statement-breakpoint
CREATE TYPE "public"."transaction_history_action" AS ENUM('update', 'delete', 'cashback_update');--> statement-breakpoint
CREATE TABLE "transaction_history" (
	"history_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"transaction_id" varchar(36),
	"transaction_id_snapshot" varchar(36) NOT NULL,
	"old_amount" numeric(18, 2),
	"new_amount" numeric(18, 2),
	"old_cashback" numeric(18, 2),
	"new_cashback" numeric(18, 2),
	"old_debt" numeric(18, 2),
	"new_debt" numeric(18, 2),
	"action_type" "transaction_history_action" NOT NULL,
	"seq_no" integer NOT NULL DEFAULT 1,
	"edited_by" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "transaction_history" ADD CONSTRAINT "transaction_history_transaction_id_transactions_transaction_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("transaction_id") ON DELETE SET NULL ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "transaction_history_transaction_snapshot_seq_idx" ON "transaction_history" ("transaction_id_snapshot","seq_no");--> statement-breakpoint
CREATE INDEX "transaction_history_transaction_id_idx" ON "transaction_history" ("transaction_id");
