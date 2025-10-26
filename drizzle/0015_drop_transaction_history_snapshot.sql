DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM pg_class c
		JOIN pg_namespace n ON n.oid = c.relnamespace
		WHERE c.relkind = 'i'
			AND c.relname = 'transaction_history_transaction_snapshot_seq_idx'
			AND n.nspname = 'public'
	) THEN
		EXECUTE 'DROP INDEX "transaction_history_transaction_snapshot_seq_idx"';
	END IF;
END$$;--> statement-breakpoint
ALTER TABLE "transaction_history" DROP COLUMN IF EXISTS "transaction_id_snapshot";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "transaction_history_transaction_seq_idx" ON "transaction_history" ("transaction_id","seq_no");--> statement-breakpoint
