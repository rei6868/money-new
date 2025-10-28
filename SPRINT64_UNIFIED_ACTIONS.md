# Sprint 6.4 — Redesign Quick Add & Unified Header Actions

## 🎯 Objective
Completely re-implement Quick Add as a standalone, robust module and rework header action bar (Add, Search, Quick Add, Filter, Customize) for both Transactions and Accounts.  
• Guarantee consistent behavior, accessibility, and smooth UI—desktop AND mobile.

---

## 🧩 PART 1 — Delete ALL legacy Quick Add code
- Remove all previous popover/hover/onclick logic tied to inline action buttons in table, footer, or floating.
- Delete any duplicate or partial popover logic from both app/modules.

---

## 🧩 PART 2 — New Quick Add Module

**File:** `/components/common/QuickAddMenu.tsx (new)`

### Implementation
- Accepts props for context (`type="transactions"` or `"accounts"`) to render correct menu options.
- Uses `@headlessui/react` Popover under the hood but with controlled focus (menu remains open when clicked or hovered, closes only on select or click outside).
- Menu launches with animation (`scale-fade` .2s), auto-places right or left as needed.
- On mobile (≤600px), Quick Add expands DOWN as an overlay (no overlap with system bars/footer).
- Each Quick Add item triggers the corresponding modal dialog (or mockup if form not ready).

**Features:**
- Standalone: Can be plugged into any page/header.
- Z-index 80+, always over table/UI.
- Rigorously tested for tap/hover/select usability.
- No “double close” bug: selection triggers only once, after menu is visually confirmed open.

---

## 🧩 PART 3 — Header Bar Redesign (Add, Search, Quick Add, Filter, Customize)

**Order on Desktop (LTR):**  
- Add Button (left: primary action, always show, e.g. "+ Add Transaction")
- Search Bar (beside Add, clear and restore icons present at right end of input)
- Quick Add (compact button, rightmost)
- Filter button (icon, opens filter modal — use mock for now)
- Customize (icon, opens modal with drag/select all/restore, see below)

**Mobile:**  
- All 5 buttons condensed as icon-only, on a single scrollable row:
  - Add (big plus icon)
  - Search (magnifier; tap to expand input)
  - Quick Add (lightning; triggers overlay)
  - Filter (funnel)
  - Customize (settings)

- Row: sticky to top, no text label, spacing (min 8px), icons 36–44px.
- Touch targets min 36px.

---

## 🧩 PART 4 — Customize Modal (Columns)
- Modal pops up above all, not pushed by table layout.
- Drag to reorder columns with animation, can “pin” columns left/right.
- Each column shown as a chip; can select/deselect all but `Notes` (always locked).
- Select All/Reset buttons in modal header.
- Remove all old toggle logic from table header, only this modal controls column visibility/order.
- All changes applied in real-time.

---

## 🧩 PART 5 — Search Bar / Filter
- Search input: 
  - With clear (“X” icon) and restore (“reset”/“undo”).
  - Actions run instantly on input change/click.
- Filter button next to Search (desktop), or among icons (mobile).
  - Filter modal is a mockup (empty panel with title and “Coming soon”).

---

## 🧩 PART 6 — Interaction, Polish & QA
| Feature           | Desktop                    | Mobile                                |
|-------------------|---------------------------|---------------------------------------|
| Add/Quick Add     | On left/right of header   | As icon row, each can open modal      |
| QuickAdd Usability| Focused, usable by tab    | Touch works, menu never overlaps bar  |
| Search Bar        | Shows after Add, wide     | Tap icon to expand/collapse           |
| Customize Modal   | Drag OK, not overlay table| Scrolls up/down, thumb-resize modal   |
| Filter Modal      | Mock, visually correct    | Same (overlay on small screen)        |

**Extra:**
- All state lives in context/store or local state—no more global window event leaks.
- Test with real keyboard navigation/VO for a11y.

---

## ⚙️ Branch & Delivery

- Branch: `feature/unified-actions-bar-6-4`
- Commit message:
  ```
  feat(ui): redesign quick add, header action bar, search/filter/customize
  ```
- Output: `/components/common/QuickAddMenu.tsx`, `/components/common/HeaderActionsBar.tsx`, modal code, updates in `/pages/transactions` and `/pages/accounts`
- Reviewer: `rei6868`
### **Tóm tắt tiếng Việt**
- Xóa toàn bộ code QuickAdd cũ, triển khai lại module mới chuẩn popover+mobile.
- Header: Add – Search – Quick Add – Filter – Customize trên cùng 1 hàng, icon hết ở mobile.
- Search, filter, custom đều xử lý logic visibility real-time/chỉ show qua modal, không bị tràn layout.
- Customize cho phép drag, reorder, lock notes.
- Quick Add phải thao tác được mọi device, không bug click/hover (test kỹ mobile/desktop).

Kết quả: UI/UX hiện đại, 1 dòng action control cho mọi context, điều khiển sạch sẽ và tương thích tốt mobile. Paste prompt vào file `SPRINT64_UNIFIED_ACTIONS.md` và giao cho agent phát triển nhánh mới.
