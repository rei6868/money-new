CREATE TYPE "public"."batch_import_status" AS ENUM('pending', 'processing', 'done');--> statement-breakpoint
CREATE TYPE "public"."batch_import_type" AS ENUM('transfer', 'payment', 'topup', 'other');--> statement-breakpoint
CREATE TABLE "batch_imports" (
	"batch_import_id" varchar(36) PRIMARY KEY NOT NULL,
	"batch_name" varchar(160) NOT NULL,
	"import_type" "batch_import_type" NOT NULL,
	"status" "batch_import_status" NOT NULL,
	"account_id" varchar(36) NOT NULL,
	"total_amount" numeric(18, 2) NOT NULL,
	"deadline" date NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "batch_imports" ADD CONSTRAINT "batch_imports_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("account_id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "batch_imports" ADD CONSTRAINT "batch_imports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."people"("person_id") ON DELETE restrict ON UPDATE cascade;
