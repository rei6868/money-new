# P1-S4: Task-Based API Refactor

## Overview
Refactored the workflow engine from P1-S3 to a task-based API architecture that aligns with the Project Phoenix frontend design. The new architecture eliminates the `linked_transactions` table in favor of a simpler self-referencing `parent_txn_id` column.

## Architecture Changes

### Database Schema
- **REMOVED**: `linked_transactions` table and related enums (`linked_txn_type`, `linked_txn_status`)
- **REMOVED**: `linked_txn_id` column from `transactions` table
- **ADDED**: `parent_txn_id` column to `transactions` table (self-referencing foreign key)

### API Endpoint
**New Route**: `POST /api/transactions/[id]/tasks`

This endpoint handles task execution on a specific transaction identified by `[id]`.

## API Usage

### Request Format
```http
POST /api/transactions/{transactionId}/tasks
Content-Type: application/json

{
  "taskType": "PARTIAL_REFUND",
  "amount": 50000,
  "personId": "uuid-optional"
}
```

### Supported Task Types
- `PARTIAL_REFUND`: Partial refund of a transaction
- `FULL_REFUND`: Full refund of a transaction
- `CANCEL_ORDER`: Cancel order workflow (placeholder)
- `SPLIT_BILL`: Bill splitting workflow (placeholder)
- `SETTLE_DEBT`: Debt settlement workflow (placeholder)

### Response Format

**Success (201)**:
```json
{
  "success": true,
  "parentTxnId": "uuid-of-parent-transaction",
  "createdTxnIds": ["uuid-of-created-transaction"]
}
```

**Error (4xx/5xx)**:
```json
{
  "error": "Error message"
}
```

## Refund Workflow

When processing a refund task, the engine executes the following steps atomically:

1. **Validates Parent Transaction**
   - Fetches the parent transaction by ID
   - Returns 404 if not found

2. **Creates Opposite Transaction**
   - Generates opposite transaction type (expense → income, income → expense)
   - Sets `parent_txn_id` to reference the parent transaction
   - Sets status to `active`

3. **Updates Parent Transaction**
   - Changes parent status to `canceled`
   - Preserves original record for audit trail

4. **Recalculates Cashback Ledger**
   - Invalidates cashback movement for parent transaction
   - Reduces `total_cashback` in ledger
   - Increases `remaining_budget` by refunded cashback amount
   - Updates `last_updated` timestamp

5. **Recalculates Debt Ledger** (if applicable)
   - Reduces `new_debt` by refunded amount
   - Adjusts `net_debt` accordingly
   - Updates `last_updated` timestamp

6. **Updates Account Balance**
   - Adjusts `current_balance` based on refund direction
   - Maintains balance integrity

## Migration

### Database Migration
Run the migration script:
```bash
npm run db:push
```

The migration file `0018_refactor-to-task-based-api.sql` handles:
- Dropping `linked_txn_id` foreign key constraint
- Dropping `linked_txn_id` column from transactions
- Dropping `linked_transactions` table
- Dropping enum types
- Adding `parent_txn_id` column with self-referencing foreign key

### Code Changes
1. **Removed**: `/pages/api/linked-txn/` directory
2. **Created**: `/pages/api/transactions/[id]/tasks.ts`
3. **Updated**: Transaction API endpoints to remove `linkedTxnId` references

## Frontend Integration

The UI should implement a "Task" button on each transaction row that triggers:

```javascript
// Example: Refund a transaction
const response = await fetch(`/api/transactions/${transactionId}/tasks`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    taskType: 'PARTIAL_REFUND',
    amount: 50000
  })
});

const result = await response.json();
// result.createdTxnIds contains the IDs of created transactions
```

## Error Handling

- **400**: Missing or invalid parameters (taskType, amount)
- **404**: Parent transaction not found
- **500**: Database error or processing failure
- All operations are atomic - failures roll back the entire workflow

## Testing

Test scenarios:
1. Full refund with cashback
2. Partial refund
3. Refund with debt adjustment
4. Invalid task type
5. Missing parent transaction
6. Concurrent task execution

## Future Enhancements

1. Implement `CANCEL_ORDER` workflow
2. Implement `SPLIT_BILL` workflow
3. Implement `SETTLE_DEBT` workflow
4. Add validation for partial refund amount (amount <= parent amount)
5. Add idempotency keys for retry safety
6. Add webhook notifications for task completion
