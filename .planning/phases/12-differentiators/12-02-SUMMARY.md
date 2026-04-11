---
phase: 12-differentiators
plan: 02
subsystem: Dashboard
tags:
  - frontend
  - ui
  - dashboard
  - print
dependency_graph:
  requires:
    - 12-01
  provides:
    - DASHBOARD-06
  affects:
    - resources/js/Pages/Member/Dashboard/Index.tsx
    - resources/js/components/layout/AppShell.tsx
tech_stack:
  added: []
  patterns:
    - Tailwind print:hidden
    - MetricCard Extension
key_files:
  created: []
  modified:
    - resources/js/Pages/Member/Dashboard/Index.tsx
    - resources/js/components/layout/AppShell.tsx
decisions:
  - layout: "Download Report" button placed in header alongside staleness label.
  - printing: Hidden sidebar, topbar, and action cards in print mode to ensure a clean report.
metrics:
  duration: 20m
  completed_date: "2026-04-12"
---

# Phase 12 Plan 02: Frontend KPI Badges and PDF Export Summary

The dashboard has been updated with period-over-period change badges and a "Download Report" feature. All non-essential UI elements are hidden when printing to provide a clean PDF report.

## Substantive Changes

- **Change Badges**: Added percentage change indicators to all four KPI cards.
  - Green (emerald-100) for positive changes.
  - Red (destructive) for negative changes.
  - Grey (secondary) for zero change.
  - Absent badge when the prior period has zero usage (prevents division by zero).
- **Download Report**: Added a "Download Report" button to the header that triggers `window.print()`.
- **Print Optimization**: 
  - Applied `print:hidden` to Sidebar, TopBar, Balance card, Quick Actions card, and the Download button itself.
  - The resulting print layout focuses on KPI cards, charts, and the model comparison table.
- **DTO Binding**: Wired `Index.tsx` to the new `previousPeriod` field in `KpiPayload`.

## Deviations from Plan

None.

## Self-Check: PASSED

- [x] TypeScript `npx tsc --noEmit` passing.
- [x] Backend tests for dual-period querying passing.
- [x] `Index.tsx` includes `previousPeriod`, `computeChange`, and `renderChangeBadge`.
- [x] `AppShell.tsx` hides Sidebar and TopBar in print.
- [x] Manual verification of print layout and badge colors complete.
