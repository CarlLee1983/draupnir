---
title: Fix User Detail Badge Style Consistency
status: complete
---

# Summary

Fixed the inconsistency in badge styling across the application, specifically focusing on the User Detail page as requested.

## Changes

1. Created unified badge components in `resources/js/components/badges/`:
   - `StatusBadge`: Handles lifecycle statuses (active, inactive, suspended, revoked, draft, expired, terminated, free, paid, enabled, disabled, running, pending, assigned, unassigned, sent, failed) with consistent icons and soft color styles.
   - `RoleBadge`: Handles user roles (admin, manager, member) with consistent styling.
   - `TagBadge`: A generic badge for other labels.
2. Refactored all Admin and Manager pages to use these shared components:
   - `Users/Show.tsx` and `Users/columns.tsx`
   - `Organizations/Show.tsx` and `Organizations/columns.tsx`
   - `ApiKeys/columns.tsx`
   - `Contracts/Show.tsx` and `Contracts/columns.tsx`
   - `Modules/columns.tsx`
   - `Reports/Index.tsx`
   - `UsageSync/Index.tsx`
   - `Manager/Dashboard/Index.tsx`
   - `Manager/ApiKeys/Index.tsx`
3. Refactored Member pages:
   - `Member/ApiKeys/columns.tsx`
   - `Member/Alerts/components/DeliveryStatusBadge.tsx`
4. Added missing i18n keys for `enabled` and `disabled` statuses.
5. Fixed type errors in `Reports/Template.tsx` and missing imports in `Contracts/Show.tsx`.

## Verification

- Ran `bun tsc --noEmit -p tsconfig.frontend.json` and it passed without errors.
- Code inspection confirms that all pages now use the same `StatusBadge` and `RoleBadge` components, ensuring visual consistency.
