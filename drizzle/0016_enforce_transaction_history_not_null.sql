DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.table_constraints
		WHERE constraint_schema = 'public'
			AND table_name = 'transaction_history'
			AND constraint_name = 'transaction_history_transaction_id_transactions_transaction_id_fk'
	) THEN
		ALTER TABLE "transaction_history" DROP CONSTRAINT "transaction_history_transaction_id_transactions_transaction_id_fk";
	END IF;
END$$;--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'transaction_history'
			AND column_name = 'transaction_id_snapshot'
	) THEN
		EXECUTE 'UPDATE "transaction_history" SET "transaction_id" = "transaction_id_snapshot" WHERE "transaction_id" IS NULL AND "transaction_id_snapshot" IS NOT NULL';
	END IF;
END$$;--> statement-breakpoint
UPDATE "transaction_history" SET "transaction_id" = "history_id"::text WHERE "transaction_id" IS NULL;--> statement-breakpoint
ALTER TABLE "transaction_history" ALTER COLUMN "transaction_id" SET NOT NULL;--> statement-breakpoint
