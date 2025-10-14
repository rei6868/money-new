# People Table Schema

The People table stores every debtor or financial participant referenced by accounts, transactions, and future subscription/SheetLink mappings. It is independent from authenticated user accounts so multiple persons can exist per household or organisation.

## Drizzle ORM Definition

```ts
import { people } from "@/db/schema/people";
```

See [`src/db/schema/people.ts`](../src/db/schema/people.ts) for the concrete implementation and inline documentation.

## Field Reference

| Field | Type | Required | Business Logic & Purpose |
|-------|------|----------|---------------------------|
| `personId` | `varchar(36)` | ✅ | Primary key and unique identifier (typically UUID) used for all references to the person. |
| `fullName` | `varchar(180)` | ✅ | Human-readable name rendered across UI components, exports, and notifications. |
| `contactInfo` | `text` | ⛔️ (optional) | Free-form contact details such as phone, email, or messenger handles for operations follow-ups. |
| `status` | `person_status` enum | ✅ | Lifecycle state with values `active`, `inactive`, or `archived` that governs visibility and participation in workflows. |
| `groupId` | `varchar(36)` | ⛔️ (optional) | Placeholder link to a future Groups/Households table so multiple people can be bundled under a shared entity. |
| `imgUrl` | `text` | ⛔️ (optional) | CDN-hosted avatar thumbnail (e.g., `https://res.cloudinary.com/demo/avatar.jpg`) displayed in dashboards and profile cards. |
| `note` | `text` | ⛔️ (optional) | Internal annotations or operational notes relevant to the person. |
| `createdAt` | `timestamptz` (default `now()`) | ✅ | Record creation timestamp to support auditing and chronological reporting. |
| `updatedAt` | `timestamptz` (default `now()`) | ✅ | Tracks the latest modification time for change detection and sync pipelines. |

## Implementation Notes

- **Status enum** is defined separately (`person_status`) so additional lifecycle states can be added without altering existing records.
- **Group references** are intentionally nullable to allow future normalisation via a dedicated Group/Household table without schema churn.
- **Avatar URLs** use plain text storage, enabling integration with Cloudinary or other CDN services for consistent rendering across devices.
- **Timestamps** rely on database defaults to ensure accurate capture even when inserted through background jobs or integrations.

Future stories introducing subscription management or SheetLink integrations should create bridge tables that reference `personId` instead of embedding those fields directly into the People table.
