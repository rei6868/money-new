# Card Profit/Loss Schema

## Table: `card_pl`

Tracks the annual profit or loss for each credit card account by aggregating
cashback, bonuses, and fees. Every row corresponds to a single account-year
combination.

| Column | Type | Notes |
| --- | --- | --- |
| `card_pl_id` | string (PK) | Primary key for the P/L entry. Typically a UUID. |
| `account_id` | string (FK) | References `accounts.account_id`. Identifies the card/account being evaluated. |
| `year` | string | Calendar or fiscal year for the aggregated metrics (e.g. `2024`). |
| `total_earned` | numeric(18,2) | Sum of all rewards earned in the year including cashback, statement credits, referral bonuses, and other card perks. |
| `total_fee` | numeric(18,2) | Aggregated annual fee expense and any other cost tied to the card for the year. |
| `net_pl` | numeric(18,2) (generated) | Computed automatically as `total_earned - total_fee`. Stored as a generated column to ensure consistent calculations. |
| `notes` | text | Optional notes explaining adjustments, prorations, or other context. |
| `created_at` | timestamptz | Timestamp for when the record was created. Defaults to `now()`. |
| `updated_at` | timestamptz | Timestamp for the most recent update. Defaults to `now()`. |

## Net P/L Calculation

The net profit/loss is maintained as a generated database column. The formula is:

```sql
net_pl = coalesce(total_earned, 0) - coalesce(total_fee, 0)
```

Using the database to compute the value avoids drift between application logic
and reporting queries. Any updates to `total_earned` or `total_fee` will trigger
the stored calculation automatically.
