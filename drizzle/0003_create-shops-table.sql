CREATE TYPE "public"."shop_status" AS ENUM('active', 'hidden');--> statement-breakpoint
CREATE TYPE "public"."shop_type" AS ENUM('food', 'retail', 'digital', 'service', 'other');--> statement-breakpoint
CREATE TABLE "shops" (
	"shop_id" varchar(36) PRIMARY KEY NOT NULL,
	"shop_name" varchar(180) NOT NULL,
	"shop_type" "shop_type" NOT NULL,
	"img_url" text,
	"url" text,
	"status" "shop_status" NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
