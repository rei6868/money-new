CREATE TYPE "public"."linked_txn_status" AS ENUM('active', 'done', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."linked_txn_type" AS ENUM('refund', 'split', 'batch', 'settle');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('active', 'pending', 'void', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('expense', 'income', 'debt', 'repayment', 'cashback', 'subscription', 'import', 'adjustment');--> statement-breakpoint
CREATE TABLE "transactions" (
	"transaction_id" varchar(36) PRIMARY KEY NOT NULL,
	"account_id" varchar(36) NOT NULL,
	"person_id" varchar(36),
	"type" "transaction_type" NOT NULL,
	"category_id" varchar(36),
	"subscription_member_id" varchar(36),
	"linked_txn_id" varchar(36),
	"status" "transaction_status" NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"fee" numeric(18, 2),
	"occurred_on" date NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_accounts_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("account_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_person_id_people_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("person_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_categories_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("category_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_subscription_member_id_subscription_members_member_id_fk" FOREIGN KEY ("subscription_member_id") REFERENCES "public"."subscription_members"("member_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE TABLE "linked_transactions" (
	"linked_txn_id" varchar(36) PRIMARY KEY NOT NULL,
	"parent_txn_id" varchar(36),
	"type" "linked_txn_type" NOT NULL,
	"related_txn_ids" varchar(36)[] DEFAULT ARRAY[]::varchar[] NOT NULL,
	"notes" text,
	"status" "linked_txn_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "linked_transactions" ADD CONSTRAINT "linked_transactions_parent_txn_id_fkey" FOREIGN KEY ("parent_txn_id") REFERENCES "public"."transactions"("transaction_id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_linked_txn_id_linked_transactions_linked_txn_id_fk" FOREIGN KEY ("linked_txn_id") REFERENCES "public"."linked_transactions"("linked_txn_id") ON DELETE set null ON UPDATE no action;
