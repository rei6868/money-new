CREATE TABLE "card_pl" (
	"card_pl_id" varchar(36) PRIMARY KEY NOT NULL,
	"account_id" varchar(36) NOT NULL,
	"year" varchar(9) NOT NULL,
	"total_earned" numeric(18, 2) DEFAULT '0' NOT NULL,
	"total_fee" numeric(18, 2) DEFAULT '0' NOT NULL,
	"net_pl" numeric(18, 2) GENERATED ALWAYS AS ((coalesce("total_earned", 0) - coalesce("total_fee", 0))) STORED,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "card_pl" ADD CONSTRAINT "card_pl_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("account_id") ON DELETE cascade ON UPDATE cascade;
