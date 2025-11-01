# Frontend Integration Guide: Task-Based API

## Quick Start

The new task-based API allows you to execute operations (like refunds) on transactions through a simple REST endpoint.

## Endpoint

```
POST /api/transactions/{transactionId}/tasks
```

## Usage Examples

### 1. Full Refund

```javascript
async function refundTransaction(transactionId, amount) {
  const response = await fetch(`/api/transactions/${transactionId}/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      taskType: 'FULL_REFUND',
      amount: amount
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return await response.json();
}

// Usage
try {
  const result = await refundTransaction('txn-uuid-123', 50000);
  console.log('Refund successful:', result.createdTxnIds);
  // Refresh your transaction list
} catch (error) {
  console.error('Refund failed:', error.message);
}
```

### 2. Partial Refund

```javascript
async function partialRefund(transactionId, refundAmount) {
  const response = await fetch(`/api/transactions/${transactionId}/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      taskType: 'PARTIAL_REFUND',
      amount: refundAmount
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return await response.json();
}

// Usage
const result = await partialRefund('txn-uuid-123', 25000);
```

### 3. Refund with Custom Person

```javascript
async function refundToAnotherPerson(transactionId, amount, personId) {
  const response = await fetch(`/api/transactions/${transactionId}/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      taskType: 'FULL_REFUND',
      amount: amount,
      personId: personId  // Optional: override the person
    })
  });

  return await response.json();
}
```

## UI Component Example

### React Component with Task Button

```jsx
import { useState } from 'react';

function TransactionRow({ transaction }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleRefund = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/transactions/${transaction.id}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskType: 'FULL_REFUND',
          amount: transaction.amount
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      const result = await response.json();
      
      // Show success message
      alert(`Refund successful! Created transaction: ${result.createdTxnIds[0]}`);
      
      // Refresh the transaction list
      window.location.reload();
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <tr>
      <td>{transaction.date}</td>
      <td>{transaction.description}</td>
      <td>{transaction.amount}</td>
      <td>
        <button 
          onClick={handleRefund}
          disabled={loading || transaction.status === 'canceled'}
        >
          {loading ? 'Processing...' : 'Refund'}
        </button>
        {error && <span className="error">{error}</span>}
      </td>
    </tr>
  );
}
```

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskType` | string | Yes | Type of task: `PARTIAL_REFUND`, `FULL_REFUND`, `CANCEL_ORDER`, `SPLIT_BILL`, `SETTLE_DEBT` |
| `amount` | number | Yes (for refunds) | Amount to refund |
| `personId` | string | No | Override the person associated with the refund |

## Response Format

### Success Response (201)

```json
{
  "success": true,
  "parentTxnId": "original-transaction-uuid",
  "createdTxnIds": ["new-refund-transaction-uuid"]
}
```

### Error Response (4xx/5xx)

```json
{
  "error": "Error message describing what went wrong"
}
```

## Error Handling

### Common Errors

| Status Code | Error | Cause |
|-------------|-------|-------|
| 400 | "Transaction ID is required" | Missing transaction ID in URL |
| 400 | "taskType is required" | Missing taskType in request body |
| 400 | "amount is required for refund tasks" | Missing amount for refund |
| 400 | "amount must be a positive number" | Invalid amount value |
| 400 | "taskType must be one of: ..." | Invalid task type |
| 404 | "Parent transaction not found" | Transaction doesn't exist |
| 500 | Various | Server or database error |

### Error Handling Pattern

```javascript
async function executeTask(transactionId, taskType, params) {
  try {
    const response = await fetch(`/api/transactions/${transactionId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskType, ...params })
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle specific error codes
      switch (response.status) {
        case 400:
          throw new Error(`Invalid request: ${data.error}`);
        case 404:
          throw new Error('Transaction not found');
        case 500:
          throw new Error('Server error. Please try again later.');
        default:
          throw new Error(data.error || 'Unknown error');
      }
    }

    return data;
  } catch (error) {
    console.error('Task execution failed:', error);
    throw error;
  }
}
```

## What Happens Behind the Scenes

When you execute a refund task:

1. ✅ Creates a new transaction with opposite type (expense → income)
2. ✅ Links it to the parent via `parent_txn_id`
3. ✅ Marks the original transaction as `canceled`
4. ✅ Recalculates cashback ledger (invalidates cashback)
5. ✅ Recalculates debt ledger (if applicable)
6. ✅ Updates account balance
7. ✅ All operations are atomic (all succeed or all fail)

## Best Practices

1. **Always handle errors**: Show user-friendly error messages
2. **Show loading states**: Disable buttons during processing
3. **Refresh data**: Reload transaction list after successful task
4. **Validate amounts**: Check amount > 0 before sending request
5. **Confirm actions**: Show confirmation dialog for destructive operations
6. **Check status**: Don't allow tasks on already canceled transactions

## Future Task Types

These task types are planned but not yet implemented:

- `CANCEL_ORDER`: Cancel an order and reverse all effects
- `SPLIT_BILL`: Split a transaction among multiple people
- `SETTLE_DEBT`: Settle outstanding debt with a payment

When these are implemented, they will use the same API pattern.

## Migration from Old API

If you were using the old `/api/linked-txn` endpoint:

### Before (Old API)
```javascript
POST /api/linked-txn
{
  "parentTxnId": "uuid",
  "type": "refund",
  "amount": 50000
}
```

### After (New API)
```javascript
POST /api/transactions/{uuid}/tasks
{
  "taskType": "FULL_REFUND",
  "amount": 50000
}
```

## Support

For questions or issues, refer to:
- Full API documentation: `/docs/P1-S4-task-based-api.md`
- Completion report: `/P1-S4-COMPLETION-REPORT.md`
