# DebtMovement Schema

The `debt_movements` table records every event that affects a debtor's balance.
It acts as the auditable event log that powers the DebtLedger aggregate and debt
recalculation processes.

## Field mapping

| Column | Type | Notes |
| --- | --- | --- |
| `debt_movement_id` | `varchar(36)` | Primary key for the movement. |
| `transaction_id` | `varchar(36)` | Foreign key to `transactions.transaction_id`. Required for traceability. |
| `person_id` | `varchar(36)` | Foreign key to `people.person_id`. Identifies the debtor. |
| `account_id` | `varchar(36)` | Foreign key to `accounts.account_id`. Points to the ledger bucket aggregating the balance. |
| `movement_type` | enum | `borrow`, `repay`, `adjust`, `discount`, `split`. Drives ledger behaviour. |
| `amount` | `numeric(18,2)` | Positive values increase debt, negative values reduce debt. |
| `cycle_tag` | `varchar(10)` | Optional statement or workflow tag (e.g. `2024-07`). |
| `status` | enum | `active`, `settled`, `reversed`. Controls inclusion in open balances. |
| `notes` | `text` | Optional audit or dispute notes. |
| `created_at` | `timestamptz` | Creation timestamp. |
| `updated_at` | `timestamptz` | Last mutation timestamp. |

## Recalculation logic

- Rebuild a person's outstanding balance by summing `amount` for all movements
  where `status = 'active'`. Movements marked `settled` or `reversed` should be
  excluded from totals, ensuring the ledger only reflects open debt.
- When rerunning historical calculations, sort by `created_at` to replay the
  exact event sequence and to detect late adjustments introduced via
  `movement_type = 'adjust'` or `movement_type = 'discount'`.
- Recalculation jobs should recompute downstream aggregates (DebtLedger and
  statement views) whenever a movement is inserted, updated, or reversed to keep
  balances consistent with the canonical log.

## Split and merge workflows

- Use `movement_type = 'split'` to represent the allocation of a single debt
  across multiple people or accounts. Each split entry carries its portion of the
  outstanding amount, referencing the shared `transaction_id` for traceability.
- Merging or settling a split debt emits balancing `repay` or `adjust`
  movements for each person/account pair until their outstanding balance reaches
  zero. Avoid hard deletes; instead mark the movement `status = 'settled'` to
  preserve the audit trail.
- Adjustments that redistribute debt between participants should insert
  compensating `adjust` entries on both sides (positive for the recipient,
  negative for the origin) so that the total sum across the group remains
  unchanged.

## Relationship to DebtLedger

- DebtLedger maintains the current outstanding balance per account/person pair.
  It is derived from `debt_movements` by aggregating `amount` for movements where
  `status = 'active'`. Settled or reversed entries remain for history but do not
  contribute to the open balance.
- Whenever a movement changes `status` or `amount`, trigger a refresh of the
  corresponding DebtLedger row to keep the aggregate in sync.
- DebtLedger rows should store the last processed `debt_movement_id` and
  `updated_at` timestamps to support idempotent catch-up jobs that replay the
  movement log without double counting.
