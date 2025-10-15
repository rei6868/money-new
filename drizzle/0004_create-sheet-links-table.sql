CREATE TYPE "public"."sheet_link_type" AS ENUM('report', 'debt', 'sync');--> statement-breakpoint
CREATE TABLE "sheet_links" (
	"sheet_link_id" varchar(36) PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"person_id" varchar(36),
	"group_id" varchar(36),
	"type" "sheet_link_type" NOT NULL,
	"last_sync" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sheet_links_target_exclusivity_check" CHECK ((("person_id" IS NOT NULL) AND ("group_id" IS NULL)) OR (("group_id" IS NOT NULL) AND ("person_id" IS NULL)))
);
--> statement-breakpoint
ALTER TABLE "sheet_links" ADD CONSTRAINT "sheet_links_person_id_people_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("person_id") ON DELETE set null ON UPDATE no action;
