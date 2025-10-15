CREATE TYPE "public"."debt_ledger_status" AS ENUM('open', 'partial', 'repaid', 'overdue');--> statement-breakpoint
CREATE TABLE "debt_ledger" (
	"debt_ledger_id" varchar(36) PRIMARY KEY NOT NULL,
	"person_id" varchar(36) NOT NULL,
	"cycle_tag" varchar(10),
	"initial_debt" numeric(18, 2) DEFAULT '0' NOT NULL,
	"new_debt" numeric(18, 2) DEFAULT '0' NOT NULL,
	"repayments" numeric(18, 2) DEFAULT '0' NOT NULL,
	"debt_discount" numeric(18, 2) DEFAULT '0',
	"net_debt" numeric(18, 2) DEFAULT '0' NOT NULL,
	"status" "debt_ledger_status" NOT NULL,
	"last_updated" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "debt_ledger" ADD CONSTRAINT "debt_ledger_person_id_people_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("person_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "debt_ledger_person_cycle_uidx" ON "debt_ledger" ("person_id","cycle_tag");
