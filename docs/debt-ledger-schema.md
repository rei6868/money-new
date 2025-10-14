# DebtLedger Schema

The `debt_ledger` table records a per-person snapshot of outstanding debt for a
specific billing cycle (or the current cycle when `cycle_tag` is null). It is
rebuilt from the granular `debt_movements` stream so dashboards, reminder
services, and finance reports can read a single row instead of scanning events.

## Field mapping

| Column | Type | Notes |
| --- | --- | --- |
| `debt_ledger_id` | `varchar(36)` | Primary key for the ledger entry. |
| `person_id` | `varchar(36)` | Foreign key to `people.person_id`. Required. |
| `cycle_tag` | `varchar(10)` | Optional cycle identifier (e.g. `2025-10`). |
| `initial_debt` | `numeric(18,2)` | Opening balance carried into the cycle. Defaults to 0. |
| `new_debt` | `numeric(18,2)` | Debt added during the cycle. Defaults to 0. |
| `repayments` | `numeric(18,2)` | Payments or credits that reduce debt. Defaults to 0. |
| `debt_discount` | `numeric(18,2)` | Optional cashback/discount reductions. Defaults to 0. |
| `net_debt` | `numeric(18,2)` | Stored as `initial + new - repayments - discount`. Defaults to 0. |
| `status` | enum | `open`, `partial`, `repaid`, `overdue`. |
| `last_updated` | `timestamptz` | Timestamp of the latest aggregation update. |
| `notes` | `text` | Optional operational context. |

## Sync + reporting workflow

Debt data is normalised by aggregating `debt_movements` (each representing a
mutation of a person's balance) into the `debt_ledger` table. The service or
trigger performing the sync should:

1. **Select affected persons/cycles** by querying `debt_movements` for recently
   changed `(person_id, cycle_tag)` tuples.
2. **Aggregate balances** by summing `initial_debt`, `new_debt`, `repayments`,
   and `debt_discount` inputs per tuple and computing `net_debt` using the
   formula `initial + new - repayments - discount`.
3. **Set status** using business rules (e.g. `repaid` when `net_debt` is zero,
   `overdue` when the due date passes with a positive balance).
4. **Upsert the ledger row** keyed by `(person_id, cycle_tag)` updating
   `last_updated` for observability and leaving a single authoritative record per
   person/cycle.
5. **Emit downstream signals** (optional) so reminder jobs, dashboards, and
   financial statements refresh with the latest numbers.

This normalised ledger enables fast read patterns while ensuring the source of
truth stays in `debt_movements` for auditing and recalculations.
