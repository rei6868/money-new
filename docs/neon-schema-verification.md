# Neon Schema Verification Report

Generated at 2025-10-16T08:39:53.544Z.

## accounts
- Documentation: [docs/accounts-schema.md](docs/accounts-schema.md)
- Status: **PASS**
- Columns checked: 15
- Columns found: 15
- Issues: None
- Warnings: None

## people
- Documentation: [docs/people-schema.md](docs/people-schema.md)
- Status: **PASS**
- Columns checked: 9
- Columns found: 9
- Issues: None
- Warnings: None

## categories
- Documentation: _Not provided_
- Status: **PASS**
- Columns checked: 7
- Columns found: 7
- Issues: None
- Warnings: None

## assets
- Documentation: [docs/assets-schema.md](docs/assets-schema.md)
- Status: **PASS**
- Columns checked: 14
- Columns found: 14
- Issues: None
- Warnings: None

## shops
- Documentation: [docs/shops-schema.md](docs/shops-schema.md)
- Status: **PASS**
- Columns checked: 9
- Columns found: 9
- Issues: None
- Warnings: None

## batch_imports
- Documentation: [docs/batch-import-schema.md](docs/batch-import-schema.md)
- Status: **PASS**
- Columns checked: 11
- Columns found: 11
- Issues: None
- Warnings: None

## cashback_ledger
- Documentation: [docs/cashback-ledger-schema.md](docs/cashback-ledger-schema.md)
- Status: **PASS**
- Columns checked: 11
- Columns found: 11
- Issues: None
- Warnings: None

## cashback_movements
- Documentation: [docs/cashback-movement-schema.md](docs/cashback-movement-schema.md)
- Status: **PASS**
- Columns checked: 12
- Columns found: 12
- Issues: None
- Warnings: None

## debt_ledger
- Documentation: [docs/debt-ledger-schema.md](docs/debt-ledger-schema.md)
- Status: **PASS**
- Columns checked: 11
- Columns found: 11
- Issues: None
- Warnings: None

## debt_movements
- Documentation: [docs/debt-movement-schema.md](docs/debt-movement-schema.md)
- Status: **PASS**
- Columns checked: 11
- Columns found: 11
- Issues: None
- Warnings: None

## transactions
- Documentation: [docs/transactions-schema.md](docs/transactions-schema.md)
- Status: **FAIL**
- Columns checked: 15
- Columns found: 15
- Issues:
  - Foreign key on columns [linked_txn_id] → linked_transactions(linked_txn_id) missing.
- Warnings: None

## linked_transactions
- Documentation: [docs/linked-transactions-schema.md](docs/linked-transactions-schema.md)
- Status: **PASS**
- Columns checked: 8
- Columns found: 8
- Issues: None
- Warnings: None

## card_pl
- Documentation: [docs/card-pl-schema.md](docs/card-pl-schema.md)
- Status: **PASS**
- Columns checked: 9
- Columns found: 9
- Issues: None
- Warnings: None

## subscriptions
- Documentation: _Not provided_
- Status: **FAIL**
- Columns checked: 13
- Columns found: 15
- Issues:
  - Missing column `subscription_name`.
  - Missing column `amount`.
  - Index `subscriptions_account_name_uidx` expected columns [billing_account_id, subscription_name], found [billing_account_id,name].
- Warnings:
  - Unexpected columns present: name, type, price_per_month, img_url.

## subscription_members
- Documentation: _Not provided_
- Status: **FAIL**
- Columns checked: 10
- Columns found: 12
- Issues:
  - Missing column `responsibility_share`.
  - Expected index `subscription_members_subscription_person_uidx` was not found.
- Warnings:
  - Unexpected columns present: join_date, leave_date, share_ratio.
