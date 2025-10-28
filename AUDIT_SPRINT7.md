# Sprint 7 Audit: Deep Clean & Refactor - Table, Filter, Checkbox, UI Bar

## Executive Summary
Comprehensive audit of transaction/account table, filter modal, tabs, selection, and action bar components. Identified critical issues with z-index layering, modal overlay blocking, checkbox state management, and UI/UX inconsistencies.

---

## PT1: CODEBASE AUDIT FINDINGS

### 1. Modal & Overlay Z-Index Issues ⚠️

**CRITICAL ISSUE**: Inconsistent z-index values causing overlay blocking and modal interaction problems.

| Component | Overlay Z-Index | Modal Z-Index | Issue |
|-----------|-----------------|---------------|-------|
| AddModalGlobal | 70 | 80 | ✓ Correct |
| QuickAddModal | 90 (root) | N/A | ✓ Correct |
| ConfirmationModal | 1800 | N/A | ⚠️ TOO HIGH |
| FilterModal | 40 (backdrop) | 41 (wrapper) | ❌ TOO LOW - Can be blocked |
| TransactionAdvancedModal | 500 | N/A | ⚠️ Inconsistent |
| ColumnsCustomizeModal | 110 | N/A | ⚠️ Inconsistent |

**Problem**: FilterModal (z-index 40-41) can be blocked by other overlays. ConfirmationModal (z-index 1800) is excessive.

**Solution**: Standardize to: Overlay=70, Modal=80, TopModal=90 (for critical confirmations)

---

### 2. Pointer-Events Issues

**Files with pointer-events: none on wrapper**:
- `QuickAddModal.module.css` - `.wrapper { pointer-events: none }` ✓ Correct
- `FilterModal.module.css` - `.wrapper { pointer-events: auto }` ✓ Correct
- `ColumnsCustomizeModal.module.css` - No explicit pointer-events (inherits auto) ✓ OK

**Issue**: Inconsistent pointer-events handling. Some modals have wrapper with `pointer-events: none` but panel with `pointer-events: auto`.

---

### 3. Checkbox/Bulk Selection State Management

**Current Implementation** (pages/transactions/index.js):
- `selectedIds` state: Array of selected row IDs ✓
- `handleSelectRow(id, checked)`: Updates selectedIds ✓
- `handleSelectAll(checked)`: Selects all filtered/displayed rows ✓
- `showSelectedOnly`: Filter to show only selected rows ✓

**Issues Found**:
1. ❌ Selection clears when filters/search changes (line 661-665)
2. ❌ No indeterminate state for partial selection
3. ❌ Checkbox state not synced with table header checkbox
4. ❌ Mobile checkbox sizing not optimized (should be 44px+)

---

### 4. Type/Filter/Tabs Logic

**Current Implementation**:
- Types fetched from `/api/transactions/types` ✓ DB-driven
- Tabs: All, [dynamic types], Transfer ✓
- Transfer logic: `type=expense AND linkedTxn != null` ✓
- Tab counts calculated from filtered data ✓

**Issues Found**:
1. ⚠️ Transfer tab logic correct but could be clearer
2. ⚠️ No validation that all DB types are displayed
3. ⚠️ Type normalization inconsistent (typeRaw vs type)

---

### 5. Action Bar & Button Layout

**Current Implementation**:
- FilterBar component: Search + Filter button + Tabs
- filterActionButtons: Add + Quick Add + Customize
- Separate pagination controls in TransactionsTable

**Issues Found**:
1. ❌ Multiple action bars scattered (FilterBar, pagination, selection summary)
2. ❌ Mobile layout: buttons not icon-only, spacing inconsistent
3. ❌ No unified action bar component
4. ❌ Selection summary bar separate from table (causes layout shift)

---

### 6. Table Scrolling & Footer

**Current Issues**:
1. ⚠️ Footer pagination may be hidden on mobile with many rows
2. ⚠️ Filter tags placement not standardized
3. ⚠️ No sticky footer guarantee

---

## PT2-PT6: REQUIRED FIXES

### Priority 1 (Critical):
- [ ] Standardize modal z-index (70/80/90)
- [ ] Fix FilterModal z-index blocking issue
- [ ] Reimplement checkbox state (no auto-clear on filter change)
- [ ] Create unified action bar component

### Priority 2 (High):
- [ ] Fix mobile button sizing (44px+)
- [ ] Ensure footer always visible
- [ ] Move filter tags below footer
- [ ] Standardize pointer-events across modals

### Priority 3 (Medium):
- [ ] Add indeterminate checkbox state
- [ ] Improve type normalization
- [ ] Consolidate action buttons

---

## Files to Delete/Refactor

- [ ] Remove duplicate modal overlay logic
- [ ] Consolidate ActionBar implementations
- [ ] Clean up unused state in pages/transactions/index.js

---

## Next Steps

1. Create feature branch: `feature/audit-ui-fix-table-7A`
2. Implement fixes in order of priority
3. Run full QA on all modals, checkboxes, and responsive layouts
4. Commit with: `refactor: remove legacy/rubbish table & filter logic, reimplement modal/checkbox/actionbar from scratch`

