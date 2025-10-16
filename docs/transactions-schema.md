# Transactions Table Schema

The Transactions table records each monetary event flowing through the platform. Fields are intentionally verbose so downstream reconciliation, analytics, and enrichment (shops, categories, linked workflows) stay deterministic and auditable.

## Drizzle ORM Definition

```ts
${""}import { transactions } from "@/db/schema/transactions";
```

See [`src/db/schema/transactions.ts`](../src/db/schema/transactions.ts) for the canonical implementation and inline commentary that explains the platform-specific expectations for each column.

## Field Reference

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `transactionId` | `varchar(36)` | Yes | Primary key for the ledger entry. Usually a UUID or integration-provided identifier. |
| `accountId` | `varchar(36)` | Yes | FK to `accounts.account_id`; anchors the transaction to the owning account so balances reconcile correctly. |
| `personId` | `varchar(36)` | No | FK to `people.person_id`; optional link to the individual connected to the transaction. |
| `shopId` | `varchar(36)` | No | FK to `shops.shop_id`; captures the merchant/shop that fulfilled the transaction for merchant analytics and cashback logic. |
| `type` | `transaction_type` enum | Yes | Business classification (`expense`, `income`, `debt`, etc.) that drives ledger handling. |
| `categoryId` | `varchar(36)` | No | FK to `categories.category_id`; optional budgeting/reporting rollup. |
| `subscriptionMemberId` | `varchar(36)` | No | FK to `subscription_members.member_id`; ties subscription charges back to the responsible member. |
| `linkedTxnId` | `varchar(36)` | No | Identifier for multi-step workflows (refunds, splits, batches) stored in `linked_transactions`. |
| `status` | `transaction_status` enum | Yes | Lifecycle flag controlling whether the transaction impacts balances (`active`, `pending`, `void`, `canceled`). |
| `amount` | `numeric(18,2)` | Yes | Monetary value of the transaction stored at currency precision. |
| `fee` | `numeric(18,2)` | No | Optional processing/platform fee associated with the transaction. |
| `occurredOn` | `date` | Yes | Real-world posting or spending date (separate from creation timestamp). |
| `notes` | `text` | No | Free-form annotations or reconciliation context. |
| `createdAt` | `timestamptz` (default `now()`) | Yes | Insert timestamp for audit trails and change detection. |
| `updatedAt` | `timestamptz` (default `now()`) | Yes | Last updated timestamp; must be maintained during any mutation. |

## Operational Considerations

- **Merchant enrichment**: `shopId` lets ingestion jobs attach transactions to a normalised merchant catalogue. Keep it `NULL` when a transaction has no known shop to avoid blocking ledger ingestion.
- **Foreign-key hygiene**: `accountId`, `shopId`, `personId`, `categoryId`, and `subscriptionMemberId` all enforce referential integrity. Deletes cascade to `NULL` where appropriate so historical transactions remain queryable.
- **Workflow linkage**: `linkedTxnId` pairs with the `linked_transactions` table for multi-step scenarios; ensure it is populated before inserting downstream linkage records.
- **Audit timestamps**: `createdAt` defaults to the database clock and `updatedAt` should be advanced by the application layer during updates to preserve chronological accuracy.

