# SheetLink Table Schema

The SheetLink table normalises how Google Sheet URLs map to financial entities inside the platform. Each record ties a single spreadsheet to either a person or a future group/household so import, reconciliation, and reporting jobs can reuse a shared configuration.

## Drizzle ORM Definition

```ts
import { sheetLinks } from "@/db/schema/sheetLinks";
```

See [`src/db/schema/sheetLinks.ts`](../src/db/schema/sheetLinks.ts) for the implementation and inline documentation.

## Field Reference

| Field | Type | Required | Business Logic & Purpose |
|-------|------|----------|---------------------------|
| `sheetLinkId` | `varchar(36)` | ✅ | Primary key for the sheet link (UUID). Ensures each spreadsheet configuration is addressable and auditable. |
| `url` | `text` | ✅ | Direct Google Sheet link used by sync jobs and operations teams. Supports long share URLs. |
| `personId` | `varchar(36)` | ⚪️ (one of `personId`/`groupId` required) | Points to the person represented by the sheet. Nullified automatically if the person is removed. |
| `groupId` | `varchar(36)` | ⚪️ (one of `personId`/`groupId` required) | Placeholder for the upcoming Groups table so a sheet can represent a household/collective view. |
| `type` | `sheet_link_type` enum | ✅ | Declares how the sheet is used: `report`, `debt`, or `sync`. Guides downstream automation. |
| `lastSync` | `timestamptz` | ⛔️ (optional) | Timestamp of the most recent successful sync run. Null for sheets that have never been processed. |
| `notes` | `text` | ⛔️ (optional) | Operational annotations such as access hints, manual steps, or owner context. |
| `createdAt` | `timestamptz` (default `now()`) | ✅ | Automatically captured creation time for audit history. |
| `updatedAt` | `timestamptz` (default `now()`) | ✅ | Mutation timestamp used by sync workers to detect changes in configuration. |

## Implementation Notes

- **Target exclusivity:** A check constraint guarantees that exactly one of `personId` or `groupId` is populated, preventing ambiguous mappings.
- **Forward compatibility:** `groupId` is left as a nullable `varchar(36)` until the dedicated Groups table lands in later stories.
- **Sync metadata:** `lastSync` and `notes` provide light-weight observability for scheduled jobs while keeping the schema minimal.

Use the SheetLink records in upcoming automation tasks to locate which sheet should be processed for a given person or group before reconciling balances.
