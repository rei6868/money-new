# P1-S3: LinkedTXN Workflow Engine Implementation

## Overview
Implemented the Workflow Engine that handles complex, multi-step transaction operations like refunds, splits, batch imports, and settlements.

## Architecture

### Workflow Pattern
1. User action creates a `linked_transactions` instruction record (status: `active`)
2. Workflow processor executes multi-step logic atomically
3. Related transactions created and ledgers updated
4. Instruction record updated to `done` status

### Key Principle: Atomic Multi-Step Operations
All workflow steps execute within a single database transaction to ensure consistency.

## Implementation

### API Endpoint: `POST /api/linked-txn`

**Request Format:**
```json
{
  "parentTxnId": "uuid-of-original-transaction",
  "type": "refund",
  "amount": 50000,
  "personId": "uuid-optional",
  "notes": "Partial refund reason"
}
```

**Supported Types:**
- `refund`: Partial or full refund workflow
- `split`: Bill splitting (placeholder)
- `batch`: Batch import operations (placeholder)
- `settle`: Settlement runs (placeholder)

### Refund Workflow (Fully Implemented)

When processing a refund, the engine:

1. **Creates Refund Transaction**
   - Generates opposite transaction type (expense → income, income → expense)
   - Links to parent via `linkedTxnId`
   - Sets status to `active`

2. **Updates Parent Transaction**
   - Changes status to `canceled`
   - Preserves original record for audit trail

3. **Recalculates Cashback Ledger**
   - Invalidates cashback movement for parent transaction
   - Reduces `total_cashback` in ledger
   - Increases `remaining_budget` by refunded cashback amount
   - Updates `last_updated` timestamp

4. **Recalculates Debt Ledger** (if applicable)
   - Reduces `new_debt` by refunded amount
   - Adjusts `net_debt` accordingly
   - Updates `last_updated` timestamp

5. **Updates Account Balance**
   - Adjusts `current_balance` based on refund direction
   - Maintains balance integrity

6. **Finalizes Workflow**
   - Updates `linked_transactions` record
   - Sets `relatedTxnIds` array with created transaction IDs
   - Changes status from `active` to `done`

## Database Schema

### linked_transactions Table
Already exists in schema with fields:
- `linked_txn_id` (PK)
- `parent_txn_id` (FK to transactions)
- `type` (enum: refund, split, batch, settle)
- `related_txn_ids` (array of transaction IDs)
- `status` (enum: active, done, canceled)
- `notes` (text)
- `created_at`, `updated_at`

## Error Handling

- Validates required fields (parentTxnId, type)
- Validates type against allowed enum values
- Validates amount for refund operations
- Returns 400 for validation errors
- Returns 404 if parent transaction not found
- Returns 500 for processing errors
- Rolls back entire workflow on any failure

## Response Format

**Success (201):**
```json
{
  "success": true,
  "linkedTxnId": "uuid-of-workflow",
  "relatedTxnIds": ["uuid-of-refund-txn"]
}
```

**Error (4xx/5xx):**
```json
{
  "error": "Error message",
  "details": ["additional", "context"]
}
```

## Testing Scenarios

1. **Full Refund**
   - Create transaction with cashback
   - Refund full amount
   - Verify cashback invalidated
   - Verify balance restored

2. **Partial Refund**
   - Create transaction for 100,000
   - Refund 30,000
   - Verify partial cashback adjustment
   - Verify balance partially restored

3. **Debt Refund**
   - Create debt transaction
   - Refund amount
   - Verify debt ledger adjusted
   - Verify debt movement recorded

4. **Concurrent Refunds**
   - Test transaction isolation
   - Verify no race conditions

## Future Enhancements

1. Implement `split` workflow for bill splitting
2. Implement `batch` workflow for bulk imports
3. Implement `settle` workflow for settlements
4. Add partial refund validation (amount <= parent amount)
5. Add refund history tracking
6. Add webhook notifications for workflow completion
7. Add idempotency keys for retry safety
