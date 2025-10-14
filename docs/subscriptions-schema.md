# Subscription Domain Schemas

The subscription domain tracks recurring services, the people enrolled in them, and external Google Sheet integrations used for reporting or synchronisation. These tables are designed to feed future automation that generates monthly charges per member and keeps external spreadsheets in sync with the platform.

## Drizzle ORM Definitions

```ts
import {
  subscriptions,
  subscriptionMembers,
  sheetLinks,
} from "@/db/schema/subscriptions";
```

See [`src/db/schema/subscriptions.ts`](../src/db/schema/subscriptions.ts) for the full implementation and inline commentary.

---

## `subscriptions` Table

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `subscriptionId` | `varchar(36)` | ✅ | Primary key for the subscription (typically UUID) that downstream jobs and members reference. | `sub_6bb448f3` |
| `name` | `varchar(180)` | ✅ | Display name shown in dashboards, invoices, and notifications. | `YouTube Premium Family` |
| `type` | `subscription_type` enum | ✅ | Categorises the subscription for analytics; values include `youtube`, `icloud`, `spotify`, `netflix`, `other`. | `youtube` |
| `pricePerMonth` | `numeric(12,2)` | ✅ | Total monthly recurring cost in the platform's base currency. | `299000.00` |
| `ownerId` | `varchar(36)` FK → `people.person_id` | ✅ | Person responsible for managing the subscription contract and default charge allocation. | `person_123` |
| `status` | `subscription_status` enum | ✅ | Lifecycle flag controlling invoicing behaviour (`active`, `paused`, `cancelled`). | `active` |
| `createdAt` | `timestamptz` (default `now()`) | ✅ | When the subscription was registered; useful for onboarding audits. | `2024-03-01T00:05:00Z` |
| `updatedAt` | `timestamptz` (default `now()`) | ✅ | Tracks the last configuration change so recalculation jobs can react. | `2024-03-15T09:12:33Z` |

**Design notes**
- Enums keep downstream analytics consistent while remaining extensible.
- `ownerId` lets automation attribute default payments and creates a starting `subscriptionMembers` record during onboarding.

---

## `subscription_members` Table

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `memberId` | `varchar(36)` | ✅ | Primary key for the membership row (UUID). | `submem_01` |
| `subscriptionId` | `varchar(36)` FK → `subscriptions.subscription_id` | ✅ | Links the member back to the parent subscription. | `sub_6bb448f3` |
| `personId` | `varchar(36)` FK → `people.person_id` | ✅ | Identifies the enrolled person. | `person_123` |
| `role` | `subscription_member_role` enum | ✅ | Distinguishes administrators (`owner`) from regular consumers (`member`). | `member` |
| `joinDate` | `date` | ✅ | When the person joined, used for prorating invoices. | `2024-03-10` |
| `shareRatio` | `numeric(5,4)` | ⛔️ (optional) | Explicit cost split for this member (`0.25` = 25%); `null` means runtime equal split logic. | `0.3333` |
| `status` | `subscription_member_status` enum | ✅ | Indicates whether to keep generating charges (`active` or `left`). | `active` |
| `createdAt` | `timestamptz` (default `now()`) | ✅ | Membership creation timestamp for historical audits. | `2024-03-10T12:00:00Z` |
| `updatedAt` | `timestamptz` (default `now()`) | ✅ | Tracks the last membership update (role/status changes). | `2024-04-01T08:30:00Z` |

**Design notes**
- A unique index prevents duplicate person/subscription combinations.
- A check constraint ensures `shareRatio` stays between `0` and `1`, paving the way for accurate charge allocation logic.

---

## `sheet_links` Table

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `sheetLinkId` | `varchar(36)` | ✅ | Primary key for each external Google Sheet integration. | `sheet_9a4` |
| `url` | `text` | ✅ | Full shareable Google Sheet URL. | `https://docs.google.com/spreadsheets/d/...` |
| `personId` | `varchar(36)` FK → `people.person_id` | ⛔️ (optional) | Populated when the sheet represents one person. | `person_456` |
| `groupId` | `varchar(36)` | ⛔️ (optional) | Reserved for future group/household mapping. | `group_001` |
| `sheetType` | `sheet_type` enum | ✅ | Business classification (`report`, `debt`, `sync`, `other`) guiding pipeline selection. | `debt` |
| `mappingType` | `sheet_mapping_type` enum | ✅ | Declares whether the link targets a `person` or `group`. | `person` |
| `lastSync` | `timestamptz` | ⛔️ (optional) | Timestamp of the latest successful sync; `null` if never synced. | `2024-04-02T03:21:00Z` |
| `createdAt` | `timestamptz` (default `now()`) | ✅ | Records when the integration was added. | `2024-02-01T10:00:00Z` |
| `updatedAt` | `timestamptz` (default `now()`) | ✅ | Tracks the last configuration change (URL rotation, mapping switch). | `2024-03-28T15:17:42Z` |

**Design notes**
- A check constraint guarantees `mappingType` aligns with which foreign key column is populated, simplifying ETL logic.
- `lastSync` is nullable so new connections do not block activation while awaiting the first run.

---

### Automation Considerations

- **Monthly billing:** The combination of `subscriptions.pricePerMonth`, `subscriptionMembers.shareRatio`, and `subscriptionMembers.status` provides enough data for cronjobs to calculate per-person charges.
- **Sheet synchronisation:** `sheetLinks.sheetType`, `mappingType`, and `lastSync` guide future workers on which sync routine to trigger and when to retry.
