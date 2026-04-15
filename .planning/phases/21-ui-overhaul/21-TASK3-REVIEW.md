---
phase: 21-ui-overhaul
reviewed: 2026-04-15T11:30:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - resources/js/Pages/Member/Dashboard/components/MetricGrid.tsx
  - resources/js/Pages/Member/Dashboard/Index.tsx
findings:
  critical: 0
  warning: 2
  info: 3
  total: 5
status: issues_found
---

# Task 3: Geometric Grid & MetricCard Redesign Review

**Reviewed:** 2026-04-15T11:30:00Z
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

The implementation of the Geometric Grid and MetricCard redesign successfully captures the intended "Midnight Bloom" aesthetic. The use of a 1px gap grid (`gap-px` with `bg-border`) creates a sharp, technical look that aligns with the project's premium functional-contrast goal. TypeScript usage is generally strong, with clear interfaces for dashboard payload data.

The primary issues are related to **modularity** and **code organization**. The `Index.tsx` file has become a "God Component," housing numerous sub-components and utility functions that should be extracted for maintainability and reuse. Additionally, there is structural duplication between the `MetricCard` and its `LoadingState` skeleton which may lead to visual drift.

## Warnings

### WR-01: Component Modularity & File Complexity

**File:** `resources/js/Pages/Member/Dashboard/Index.tsx`
**Issue:** The file exceeds 550 lines and contains 8+ internal sub-components (`MetricCard`, `BalanceCard`, `QuickActionsCard`, `WindowSelector`, etc.). This violates the principle of component modularity and makes the main `MemberDashboard` harder to test and maintain. The implementation plan specifically suggested extracting `MetricCard`, but it remains internal.
**Fix:** Extract major sub-components to the `components/` directory. At minimum, move `MetricCard` and `WindowSelector` as they are highly reusable.

### WR-02: Structural Duplication in Skeletons

**File:** `resources/js/Pages/Member/Dashboard/Index.tsx:404-420`
**Issue:** The `LoadingState` component manually reconstructs the DOM structure and Tailwind classes of the `MetricCard`. If the padding, alignment, or internal spacing of `MetricCard` is updated, the skeleton will become visually inconsistent (e.g., the accent bar might misalign or padding might differ during fetch).
**Fix:** Move the container styles of `MetricCard` into a shared constant or sub-component. Ideally, export a `MetricCard.Skeleton` component from the new `MetricCard.tsx` file.

## Info

### IN-01: In-file Utility Functions

**File:** `resources/js/Pages/Member/Dashboard/Index.tsx:462-550`
**Issue:** Generic helpers like `fetchJson`, `resolveDateRange`, and `computeChange` are defined at the bottom of the page component. These are not page-specific logic and should be shared.
**Fix:** Move `fetchJson` to a shared fetch utility and date helpers to a date utility library.

### IN-02: Text Size & Accessibility (A11y)

**File:** `resources/js/Pages/Member/Dashboard/Index.tsx:288-312`
**Issue:** Metric titles use `text-[11px]` and suffixes use `text-[10px]`. While aesthetically pleasing and consistent with the "technical" theme, these sizes are below the standard 12px recommendation for accessibility and may be difficult to read for some users in dark mode.
**Fix:** Consider bumping the minimum size to `text-[12px]` (or `text-xs`) while increasing `tracking-widest` to maintain the desired look.

### IN-03: Loose Type Assertion in fetchJson

**File:** `resources/js/Pages/Member/Dashboard/Index.tsx:464`
**Issue:** The use of `as` for the JSON response payload is a hard type assertion that bypasses runtime validation.
**Fix:** Use a Zod schema or a type-guard function to validate the API response structure, especially since the project appears to use `gravito-impulse` which integrates Zod.

---

_Reviewed: 2026-04-15T11:30:00Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
