# Phase 11: Resilience & UX Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-12
**Phase:** 11 — Resilience & UX Polish

---

## Area Selection

**Question:** Which areas do you want to discuss for Phase 11?
**Options presented:** Staleness indicator, Sync timeout & failure UX, Stale data warning threshold, Performance index strategy
**Selected:** Staleness indicator, Sync timeout & failure UX, Stale data warning threshold
**Not selected:** Performance index strategy (delegated to Claude's discretion)

---

## Area 1: Staleness Indicator

**Q: How should lastSyncedAt reach the frontend?**
Options:
- Bundle into KPI response (Recommended) — zero new endpoints
- New /sync-status endpoint — more flexible, extra fetch
- SSR prop from MemberDashboardPage — snapshot stale before charts load

**Selected:** Bundle into KPI response

---

**Q: Where should the 'Last updated N min ago' label appear?**
Options:
- Header area, near time window selector (Recommended) — `[ 7d | 30d | 90d ]  Last updated 3 min ago`
- Above chart section only — not visible when scrolled to KPI cards
- In each chart card footer — repetitive, all charts share one cursor

**Selected:** Header area, near time window selector

---

**Q: Continue or next area?**
**Selected:** Next area — Sync timeout & failure UX

---

## Area 2: Sync Timeout & Failure UX

**Q: Where should the sync timeout be enforced?**
Options:
- In BifrostSyncService.sync() via Promise.race (Recommended)
- At the gatewayClient.getUsageLogs() call only — partial syncs could still block
- In the scheduler wrapper at DashboardServiceProvider — harder to test

**Selected:** In BifrostSyncService.sync() via Promise.race

---

**Q: What timeout value should trigger the sync abort?**
Options:
- 30 seconds (Recommended) — headroom for 500 logs at 100-200ms each
- 10 seconds — aggressive, might fire on healthy but busy sync
- 60 seconds — permissive, hangs block scheduler for full minute

**Selected:** 30 seconds

---

**Q: When sync fails or times out, what do users see?**
Options:
- Just the staleness label turns stale (Recommended) — no error banner
- Inline warning banner above charts — more visible, noisy for transient failures
- Silent — current behaviour (Phase 11 improves on this)

**Selected:** Just the staleness label turns stale

---

**Q: Continue or next area?**
**Selected:** Next area — Stale data warning threshold

---

## Area 3: Stale Data Warning Threshold

**Q: When should the staleness label change appearance?**
Options:
- Always neutral, no colour change — clean, low-noise
- Amber after 10 min, red after 30 min (Recommended) — progressive signal
- Red only after 30 min — single warning, less granular

**Selected:** Amber after 10 min, red after 30 min

---

**Q: Should the label hide when data is very fresh (< 1 min)?**
Options:
- Always show, even if 'just now' (Recommended) — consistent, always shows data provenance
- Hide when < 1 min old — cleaner, but creates flash-of-no-label effect

**Selected:** Always show

---

**Q: Ready to create context?**
**Selected:** Create context
