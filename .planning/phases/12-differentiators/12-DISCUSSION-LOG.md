# Phase 12: Differentiators - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-12
**Phase:** 12 — Differentiators

---

## Areas Selected for Discussion

User selected: Badge data flow, PDF scope & print layout, Download button placement
User skipped: Badge presentation (left to Claude's discretion)

---

## Area 1: Badge Data Flow

**Q: How should the prior-period data be fetched for the change badge?**

Options presented:
- Backend computes delta (returns `previousPeriod` field)
- Frontend double-fetch (two API calls, frontend computes delta)
- Backend returns delta % directly (pre-computed percentages)

**Selected:** Backend computes delta — KPI response adds `previousPeriod: KpiUsage`; frontend computes the % from both values.

---

**Q: Should the prior period mirror the selected window, or always compare to the calendar month prior?**

Options presented:
- Mirror window (7d → prior 7d, 30d → prior 30d, 90d → prior 90d)
- Calendar month prior (always compare to same period in prior calendar month)

**Selected:** Mirror window — consistent and predictable across all window sizes.

---

**Q: Should change badges show on all four KPI cards, or only cost?**

Options presented:
- All four KPI cards (cost, requests, tokens, latency)
- Cost only

**Selected:** All four KPI cards — consistent appearance, backend returns `previousPeriod` for all four metrics.

---

## Area 2: PDF Scope & Print Layout

**Q: What should the PDF output include?**

Options presented:
- Current view as-is (`@media print` CSS to hide chrome)
- Summary-only print view (dedicated condensed layout)
- Full report with all three windows

**Selected:** Current view as-is — simplest approach, no new print component needed.

---

**Q: What should be hidden in the print output?**

Options presented (multi-select):
- Navigation sidebar
- Action buttons (Download Report, Quick Actions card)
- Staleness label
- Balance card

**Selected:** Navigation sidebar, Action buttons, Balance card.
**Not hidden:** Staleness label (user chose to keep it in the PDF).

---

## Area 3: Download Button Placement

**Q: Where should the 'Download Report' button live?**

Options presented:
- Header row, right side (alongside time window selector and staleness label)
- QuickActionsCard
- Footer of page

**Selected:** Header row, right side.

Layout:
```
[ 7d | 30d | 90d ]    Last updated 3 min ago    [Download Report]
```

---

## Deferred Ideas Noted

- Per-key breakdown (v1.2.x)
- Error rate trend (v1.2.x)
- Custom date picker (v1.2.x)
- Puppeteer PDF for email delivery (v1.3)
