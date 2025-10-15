CREATE TYPE "public"."person_status" AS ENUM('active', 'inactive', 'archived');--> statement-breakpoint
CREATE TABLE "people" (
	"person_id" varchar(36) PRIMARY KEY NOT NULL,
	"full_name" varchar(180) NOT NULL,
	"contact_info" text,
	"status" "person_status" NOT NULL,
	"group_id" varchar(36),
	"img_url" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
