# Accounts Table Schema

The Accounts table captures every financial account represented inside the platform. It is intentionally normalised to keep transactional and reporting logic deterministic across a wide set of account types (banking, credit, e-wallets, investment, and aggregation/group accounts).

## Drizzle ORM Definition

```ts
${""}import { accounts } from "@/db/schema/accounts";
```

See [`src/db/schema/accounts.ts`](../src/db/schema/accounts.ts) for the full definition and inline commentary that explains implementation details and expectations for each column.

## Field Reference

| Field | Type | Required | Business Logic & Purpose |
|-------|------|----------|---------------------------|
| `accountId` | `varchar(36)` | ✅ | Primary key; unique identifier for the account and anchor for all related transactions and balances. |
| `accountName` | `varchar(120)` | ✅ | Display label presented to end users, exports, and notifications. Must be provided to avoid ambiguity in UI references. |
| `imgUrl` | `text` | ⛔️ (optional) | CDN-hosted URL to the account avatar/bank logo/card art (e.g., `https://res.cloudinary.com/demo/card.png`) surfaced across dashboards and mobile cards. |
| `accountType` | `account_type` enum | ✅ | Controlled vocabulary describing the financial instrument (bank, credit, saving, invest, e-wallet, group, loan, mortgage, cash, other). Drives categorised reporting and feature flags. |
| `ownerId` | `varchar(36)` | ✅ | References the `People` table to map the account to its owner/manager. Required so balances always have a responsible person. |
| `parentAccountId` | `varchar(36)` FK (self) | ⛔️ (optional) | Links a child account to a parent group account to enable aggregate balances. When null the account is top-level. Cascades updates, sets null on parent deletion. |
| `assetRef` | `varchar(36)` | ⛔️ (optional) | Optional pointer to an `Asset` record used when the account is collateralised or backed by a physical/financial asset. |
| `openingBalance` | `numeric(18,2)` | ✅ | Snapshot of balance at onboarding time. Immutable baseline used for reconciliation and historical comparisons. |
| `currentBalance` | `numeric(18,2)` | ✅ | Continuously updated balance reflecting the latest transaction postings or synced statements. |
| `status` | `account_status` enum | ✅ | Operational lifecycle (`active`, `closed`, `archived`). Controls whether transactions may post and how the account appears in UI filters. |
| `totalIn` | `numeric(18,2)` (default `0`) | ✅ | Running total of inbound transaction amounts credited to the account. Managed automatically by ledger logic. |
| `totalOut` | `numeric(18,2)` (default `0`) | ✅ | Running total of outbound transaction amounts debited from the account. Managed automatically by ledger logic. |
| `createdAt` | `timestamptz` (default `now()`) | ✅ | Creation timestamp for auditing, data lineage, and chronological filtering. |
| `updatedAt` | `timestamptz` (default `now()`) | ✅ | Last modification timestamp. Must be updated by application workflows during any mutation to maintain audit accuracy. |
| `notes` | `text` | ⛔️ (optional) | Free-form operational or reconciliation comments that do not belong in structured fields. |

## Business Usage Summary

- **Primary identification (`accountId`)** ensures every ledger entry and transaction can trace back to a unique account without relying on mutable attributes like names.
- **Presentation layer (`accountName`, `notes`)** stores the human-readable context required by customer support, statements, and dashboards.
- **Categorisation (`accountType`, `status`)** underpins reporting dimensions, conditional business rules (e.g., credit limit enforcement), and filtering in analytics.
- **Ownership and relationships (`ownerId`, `parentAccountId`, `assetRef`)** provide linkage to people, grouped accounts, and optional collateral assets for compliance and roll-up reporting.
- **Financial metrics (`openingBalance`, `currentBalance`, `totalIn`, `totalOut`)** capture both the baseline and running cashflow components, enabling fast aggregate calculations without replaying the entire transaction log.
- **Lifecycle tracking (`createdAt`, `updatedAt`)** supports auditability, sync scheduling, and differential exports when accounts change state.

## Migration & Verification Guide

1. **Generate migration**: Use Drizzle Kit (or your chosen migration tooling) to emit SQL from `src/db/schema/accounts.ts`. Example: `drizzle-kit generate:pg --config=drizzle.config.ts`.
2. **Apply migration**: Run the generated SQL against your database. Example: `drizzle-kit push --config=drizzle.config.ts` or execute the SQL in your database console.
3. **Verify enums**: Confirm both `account_type` and `account_status` enums exist and include the expected values via `SELECT unnest(enum_range(NULL::account_type));`.
4. **Check table structure**: Inspect `information_schema.columns` or use `\d accounts` (Postgres) to ensure all columns, defaults, and nullable states match the schema table above.
5. **Test parent linkage**: Insert a parent account (type `group`) and a child pointing to it; confirm that deleting the parent sets the child's `parent_account_id` to `NULL` as per the `SET NULL` policy.
6. **Validate totals**: Insert sample transactions (or mock updates) to verify that ledger logic maintains `total_in`, `total_out`, and updates `current_balance` as per business rules.
7. **Audit timestamps**: Confirm `created_at` defaults to `NOW()` on insert and that your application layer updates `updated_at` on subsequent modifications.

Following the steps above ensures the Accounts table is properly created, related enums are registered, and key behaviours (self-referential hierarchy, lifecycle flags, and running totals) operate as intended before higher-layer development begins.
