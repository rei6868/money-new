CREATE TYPE "public"."category_kind" AS ENUM('expense', 'income', 'transfer', 'debt', 'cashback', 'subscription', 'other');--> statement-breakpoint
CREATE TABLE "categories" (
	"category_id" varchar(36) PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"kind" "category_kind" NOT NULL,
	"parent_category_id" varchar(36),
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_category_id_fkey" FOREIGN KEY ("parent_category_id") REFERENCES "public"."categories"("category_id") ON DELETE set null ON UPDATE cascade;
