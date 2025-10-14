# CashbackLedger Schema

The `cashback_ledger` table provides a cycle-level summary of cashback activity
for each account. It powers dashboards, budget monitoring, and eligibility
messaging by condensing the granular records stored in `cashback_movements` into
one authoritative row per account/cycle.

## Field mapping

| Column | Type | Notes |
| --- | --- | --- |
| `cashback_ledger_id` | `varchar(36)` | Primary key for the ledger entry. |
| `account_id` | `varchar(36)` | Foreign key to `accounts.account_id`. Required. |
| `cycle_tag` | `varchar(10)` | Period tag (YYYY-MM) representing the cashback cycle. Required. |
| `total_spend` | `numeric(18,2)` | Aggregated qualifying spend for the cycle. Defaults to 0. |
| `total_cashback` | `numeric(18,2)` | Sum of credited cashback after caps. Defaults to 0. |
| `budget_cap` | `numeric(18,2)` | Maximum cashback allowance evaluated for the cycle. Defaults to 0. |
| `eligibility` | enum | `eligible`, `not_eligible`, `reached_cap`, `pending`. |
| `remaining_budget` | `numeric(18,2)` | Budget headroom (can be negative when overrides exceed the cap). Defaults to 0. |
| `status` | enum | `open`, `closed`. |
| `notes` | `text` | Optional operational comments. |
| `last_updated` | `timestamptz` | Timestamp of the last aggregation run. |

## Aggregation + sync flow

The ledger is maintained by a scheduled aggregation job (or a trigger in smaller
setups) that reconciles the granular `cashback_movements` rows into the
per-cycle snapshot. A typical run performs the following steps:

1. **Detect active cycles**: Query `cashback_movements` for distinct
   `(account_id, cycle_tag)` pairs that changed since the last run (e.g. via
   `updated_at` watermarking) to minimise work.
2. **Aggregate totals**: For each pair, compute:
   - `total_spend` from the sum of the movement's `cashback_amount` gross-up to
     the original transaction spend if required by the program.
   - `total_cashback` from the sum of `cashback_amount`.
   - `budget_cap` from the latest `budget_cap` snapshot in the movements (falling
     back to account defaults when null).
3. **Derive eligibility**: Evaluate program rules (minimum spend, enrollment
   status, cap utilisation) using the aggregated totals and set the
   `eligibility` enum. When `total_cashback` >= `budget_cap`, emit
   `reached_cap`; otherwise choose `eligible`/`not_eligible`/`pending` based on
   rule outcomes.
4. **Compute remaining budget**: `remaining_budget = budget_cap - total_cashback`.
   Allow negative values when the ledger intentionally exceeded the cap so
   analysts can track the overage.
5. **Persist the ledger row**: Upsert into `cashback_ledger` keyed by
   `(account_id, cycle_tag)` using the unique index. Update `last_updated` with
   the job timestamp and roll forward `status` to `closed` when the cycle has
   completed.
6. **Emit events** (optional): Notify downstream systems or dashboards that the
   ledger changed so caches and alerts stay in sync.

This workflow guarantees the ledger remains an authoritative, denormalised view
suitable for reporting while leaving the detailed transaction-level history in
`cashback_movements` for audits and recalculations.
