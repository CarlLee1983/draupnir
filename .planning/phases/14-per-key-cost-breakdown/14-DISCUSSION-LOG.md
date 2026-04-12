# Phase 14: Per-Key Cost Breakdown - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-12
**Phase:** 14-per-key-cost-breakdown
**Areas discussed:** Page placement & navigation, Per-key table design, Model distribution visualization, Data scoping & filtering

---

## Page Placement & Navigation

### Where should the per-key cost breakdown live?

| Option | Description | Selected |
|--------|-------------|----------|
| New dedicated page | Separate /member/cost-breakdown with own nav entry | :white_check_mark: |
| Tab within dashboard | Add tab row to existing dashboard page | |
| Extend existing dashboard | Add sections below existing charts | |

**User's choice:** New dedicated page
**Notes:** Keeps main dashboard focused on KPIs/trends, gives cost breakdown room for tables + charts.

### URL and nav label?

| Option | Description | Selected |
|--------|-------------|----------|
| Cost Breakdown | /member/cost-breakdown | :white_check_mark: |
| Usage Analytics | /member/analytics | |
| Cost Attribution | /member/cost-attribution | |

**User's choice:** Cost Breakdown

### Time window sharing?

| Option | Description | Selected |
|--------|-------------|----------|
| Own selector | Independent 7d/30d/90d on Cost Breakdown page | :white_check_mark: |
| Shared state | Same window as dashboard | |

**User's choice:** Own independent selector

### Print button?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, include print button | Reuse window.print() + @media print from Phase 12 | :white_check_mark: |
| No, skip for now | PDF export only on main dashboard | |
| You decide | Claude decides | |

**User's choice:** Yes, include print button

---

## Per-Key Table Design

### Table columns?

| Option | Description | Selected |
|--------|-------------|----------|
| Full metrics | Key Name, Cost, Reqs, Tokens, $/Req, Tok/Req, % of Total | :white_check_mark: |
| Compact essentials | Key Name, Cost, Reqs, % of Total (expandable detail) | |
| You decide | Claude picks | |

**User's choice:** Full metrics (7 columns)

### Totals row?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, totals row | Bottom row with org-wide totals | :white_check_mark: |
| No totals row | KPI cards already show org totals | |
| You decide | Claude decides | |

**User's choice:** Yes, totals row

### Default sort order?

| Option | Description | Selected |
|--------|-------------|----------|
| Cost descending | Highest spending keys first | :white_check_mark: |
| Key name alphabetical | Predictable order by name | |
| % share descending | Emphasizes proportion | |

**User's choice:** Cost descending

### Expandable rows?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, expandable rows | Click row to see per-model breakdown for that key | :white_check_mark: |
| No, flat table only | Per-model breakdown is separate section | |
| You decide | Claude picks | |

**User's choice:** Yes, expandable rows

---

## Model Distribution Visualization

### Chart type?

| Option | Description | Selected |
|--------|-------------|----------|
| Donut chart | Ring chart with total cost in center, Recharts PieChart | :white_check_mark: |
| Horizontal bar chart | Bars sorted by cost | |
| Treemap | Rectangular blocks sized by cost | |

**User's choice:** Donut chart

### Companion table?

| Option | Description | Selected |
|--------|-------------|----------|
| Chart + table side by side | Donut left, table right (Model, Cost, Requests, % Share) | :white_check_mark: |
| Chart only with legend | Color-coded legend | |
| Reuse existing model table | Add % column to ModelComparisonTable | |

**User's choice:** Chart + table side by side

### Model grouping limit?

| Option | Description | Selected |
|--------|-------------|----------|
| Top 8, rest as Other | Show up to 8 distinct segments | :white_check_mark: |
| Top 5, rest as Other | More aggressive grouping | |
| Show all, no grouping | Every model gets own segment | |

**User's choice:** Top 8, rest as Other

---

## Data Scoping & Filtering

### MEMBER role behavior?

| Option | Description | Selected |
|--------|-------------|----------|
| Same page, filtered data | MEMBER sees same page, only their own keys | :white_check_mark: |
| Hide page for MEMBER | ADMIN/MANAGER only | |
| Simplified MEMBER view | Simpler version for MEMBER | |

**User's choice:** Same page, filtered data (consistent with Phase 10 D-08)

### Additional filters?

| Option | Description | Selected |
|--------|-------------|----------|
| Time window only | Just 7d/30d/90d selector, expandable rows for drill-down | :white_check_mark: |
| Time window + model filter | Add model dropdown | |
| Time window + key filter | Add key selector | |

**User's choice:** Time window only

### Data query approach?

| Option | Description | Selected |
|--------|-------------|----------|
| New bulk query method | queryPerKeyCost(orgId, range) — single SQL GROUP BY | :white_check_mark: |
| Loop over keys | Existing queryStatsByKey for each key (N+1) | |
| You decide | Claude picks | |

**User's choice:** New bulk query method

### Expand fetch strategy?

| Option | Description | Selected |
|--------|-------------|----------|
| Lazy fetch on expand | Fetch per-model data only when user expands row | :white_check_mark: |
| Eager fetch all | Fetch all per-model-per-key data upfront | |

**User's choice:** Lazy fetch on expand

---

## Claude's Discretion

- New Inertia page component structure and layout
- Backend service design and DTO shapes
- Donut chart color palette
- Print CSS specifics
- Empty state design
- Nav icon choice

## Deferred Ideas

- Model filter dropdown — v2
- Key filter for model distribution — v2
- Custom date range picker — v2
- Shared time window state between pages — rejected for simplicity
