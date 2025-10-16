## Highlights
- Added optional `shop_id` FK to `transactions` in Drizzle schema with docs update and schema expectation coverage.
- Generated migration 0013 to add the column in Postgres and ran `drizzle-kit push` against Neon.
- Expanded schema verification script to handle Neon array responses and documented field reference for transactions.

## Test & Device Logs
- npx drizzle-kit push --config drizzle.config.ts ✅ (Neon schema updated)
- npm run db:verify ✅ (fails persist for legacy subscriptions tables; `transactions` now only reports missing legacy FK on `linked_txn_id`)

## QA Trace
- docs/neon-schema-verification.md refreshed with latest verification results.
