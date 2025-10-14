# Batch Import Table Schema

The Batch Imports table stores metadata for every file or payload processed in bulk (payments, transfers, top-ups). It allows the operations team to monitor ownership, deadlines, and processing state for each batch while the individual line items live in specialised movement tables.

## Drizzle ORM Definition

```ts
import { batchImports } from "@/db/schema/batchImports";
```

See [`src/db/schema/batchImports.ts`](../src/db/schema/batchImports.ts) for the concrete implementation and inline documentation.

## Field Reference

| Field | Type | Required | Business Logic & Purpose |
|-------|------|----------|---------------------------|
| `batchImportId` | `varchar(36)` | ✅ | Primary key used to link jobs, ledger movements, and audit events. Typically generated as a UUID by the ingestion service. |
| `batchName` | `varchar(160)` | ✅ | Human friendly label shown in the ops console and notifications so teams can quickly identify the batch. |
| `importType` | `batch_import_type` enum | ✅ | Declares which workflow produced the batch (`transfer`, `payment`, `topup`, `other`). Drives validation rules and UI copy. |
| `status` | `batch_import_status` enum | ✅ | Progress indicator consumed by dashboards and automations. Values: `pending`, `processing`, `done`. |
| `accountId` | `varchar(36)` | ✅ | Foreign key to the Accounts table that receives or sends the funds. Required to reconcile balances. |
| `totalAmount` | `numeric(18,2)` | ✅ | Total monetary value of the batch. Used for reconciliation and SLA tracking. |
| `deadline` | `date` | ✅ | SLA deadline for finalising the batch (posting or follow-up). Feeds deadline widgets and alerts. |
| `userId` | `varchar(36)` | ✅ | Foreign key to the People table representing the operator accountable for the batch. Enables work assignment dashboards. |
| `notes` | `text` | ⛔️ (optional) | Free-form context, escalation details, or follow-up instructions visible in the batch details view. |
| `createdAt` | `timestamptz` (default `now()`) | ✅ | Creation timestamp for audit trails and chronological reporting. |
| `updatedAt` | `timestamptz` (default `now()`) | ✅ | Captures the last modification to power activity feeds and caching. |

## UI & Operations Guidance

### Status Management
- **Pending**: default state for newly created batches. UI should prompt the assignee to upload supporting files or kick off validation.
- **Processing**: set when the import job is actively running (e.g., parsing CSV, pushing ledger entries). Surfaces a spinner and disables destructive actions to avoid conflicts.
- **Done**: assigned once all movements post successfully. UI should display completion timestamp and allow generating reconciliation reports.

Transitions should be linear (`pending → processing → done`) and only automated services with audit logging should move batches forward. Manual overrides must capture a note.

### Deadline Handling
- Deadlines are calendar dates (no time zone offsets) so the UI should display them using the organisation locale and highlight overdue batches in red.
- A reminder should trigger one business day before the deadline for the assigned user. This requires checking `deadline` against the current date.
- When the deadline passes without reaching `done`, flag the batch in dashboards and prompt escalation steps (e.g., notify finance lead).

### Work Assignment
- The `userId` points to a Person record. UI should render the person's name and avatar (if available) next to the batch status.
- Reassigning the batch updates `userId` and optionally appends to the notes field for historical context.

These conventions ensure consistent handling of batch imports across product, operations, and engineering workflows.
