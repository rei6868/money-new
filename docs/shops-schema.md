# Shops Table Schema

The Shops table centralises merchant metadata so transactions and cashback entries can reference a consistent source of truth for brand details.

## Drizzle ORM Definition

```ts
import { shops } from "@/db/schema/shops";
```

See [`src/db/schema/shops.ts`](../src/db/schema/shops.ts) for the concrete implementation and inline documentation.

## Field Reference

| Field | Type | Required | Business Logic & Purpose |
|-------|------|----------|---------------------------|
| `shopId` | `varchar(36)` | ✅ | Primary key referencing each merchant. Typically a UUID or external system identifier to keep joins stable across imports. |
| `shopName` | `varchar(180)` | ✅ | Display name shown on dashboards, statements, and search surfaces. |
| `shopType` | `shop_type` enum | ✅ | Categorises merchants into spend verticals (`food`, `retail`, `digital`, `service`, `other`) for analytics and filtering. |
| `imgUrl` | `text` | ⛔️ (optional) | CDN-backed logo or brand mark shown in carousel and profile components. |
| `url` | `text` | ⛔️ (optional) | Merchant website link, useful for deep links to offers or brand research. |
| `status` | `shop_status` enum | ✅ | Controls whether the merchant is visible in selectors (`active`) or suppressed from default views (`hidden`) while keeping historical data. |
| `notes` | `text` | ⛔️ (optional) | Internal notes documenting partnership details, onboarding context, or follow-up actions. |
| `createdAt` | `timestamptz` (default `now()`) | ✅ | Automatically set timestamp recording when the merchant was added. |
| `updatedAt` | `timestamptz` (default `now()`) | ✅ | Reflects the most recent update for audit trails and syncing. |

## Implementation Notes

- **Enums**: Both `shop_type` and `shop_status` enums live alongside the table so additional categories or lifecycle states can be added without touching downstream queries.
- **Optional assets**: Logos and website URLs are nullable to accommodate merchants that lack public-facing materials.
- **Timestamps**: Defaults rely on the database clock, ensuring consistent auditing even when records are created from ingestion jobs or partner syncs.
