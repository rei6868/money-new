-- Drop foreign key constraint from transactions to linked_transactions
ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "transactions_linked_txn_id_linked_transactions_linked_txn_id_fk";

-- Drop the linked_txn_id column from transactions
ALTER TABLE "transactions" DROP COLUMN IF EXISTS "linked_txn_id";

-- Drop the linked_transactions table
DROP TABLE IF EXISTS "linked_transactions";

-- Drop the linked transaction enums
DROP TYPE IF EXISTS "linked_txn_status";
DROP TYPE IF EXISTS "linked_txn_type";

-- Add parent_txn_id column to transactions for self-reference
ALTER TABLE "transactions" ADD COLUMN "parent_txn_id" varchar(36);

-- Add foreign key constraint for parent_txn_id
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_parent_txn_id_transactions_transaction_id_fk" 
  FOREIGN KEY ("parent_txn_id") REFERENCES "public"."transactions"("transaction_id") ON DELETE set null ON UPDATE no action;
