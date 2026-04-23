---
title: Fix User Detail Badge Style Consistency
status: in-progress
---

# Fix User Detail Badge Style Consistency

The user detail page (`/admin/users/:id`) has badge styles that do not match the main user list (`/admin/users`). 
The list view uses refined badges with icons and soft colors, while the detail page uses basic badges.

## Steps

1. Extract `roleBadge` and `statusBadge` from `resources/js/Pages/Admin/Users/columns.tsx` into a reusable component.
2. Update `resources/js/Pages/Admin/Users/columns.tsx` to use the new component.
3. Update `resources/js/Pages/Admin/Users/Show.tsx` to use the new component and match the refined style.
4. Verify the changes visually (if possible) or by code inspection.

## Success Criteria

- Both list and detail views use identical badge styling for roles and statuses.
- Detail view includes icons in the status badges.
