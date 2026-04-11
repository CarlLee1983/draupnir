# Feature Research

**Domain:** LLM Gateway Cost & Usage Analytics Dashboard (v1.2)
**Researched:** 2026-04-11
**Confidence:** HIGH — grounded in existing codebase data shape + LLM observability tool ecosystem (Langfuse, Datadog LLM Observability, CostGoat)

---

## Context: Existing Data Available

Draupnir's `LogEntry` DTO already carries: `timestamp`, `keyId`, `model`, `provider`, `inputTokens`, `outputTokens`, `totalTokens`, `latencyMs`, `cost`, `status`. `UsageStats` carries: `totalRequests`, `totalCost`, `totalTokens`, `avgLatency`. The `/api/organizations/:orgId/dashboard/usage` endpoint accepts `startTime`, `endTime`, `providers`, `models`, `limit` filters. This means most table-stakes charts are achievable against data the backend already returns — no schema change needed.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that every SaaS cost/usage dashboard ships. Missing any of these makes the dashboard feel unfinished for all three roles (engineers, product, finance).

| Feature | Why Expected | Complexity | Role | Notes |
|---------|--------------|------------|------|-------|
| **KPI summary cards** — total cost, total requests, total tokens, avg latency | First thing every role looks at on page load | LOW | All | Already wired via `GetDashboardSummaryService`; just needs card-level UI rendering |
| **Cost over time (line chart)** — daily/weekly/monthly spend trend | Finance needs to spot trend direction; product needs to know if growth is cost-efficient | MEDIUM | Finance, Product | Requires client-side time bucketing of `LogEntry[]` by `timestamp`; no new API needed |
| **Requests over time (line chart)** — volume trend | Engineers monitor for traffic spikes; finance reconciles with cost line | MEDIUM | Engineers, Finance | Same bucketing as cost-over-time; can render as second Y-axis or twin chart |
| **Token usage over time (stacked area chart)** — input vs output token split | Engineers and product both care whether output token growth outpaces input (cost driver) | MEDIUM | Engineers, Product | Stacked area distinguishes input/output cost share; same log data |
| **Cost by model (bar chart)** — which model is consuming the most budget | Most critical finance/product view; identifies runaway model usage | MEDIUM | Finance, Product | Group `LogEntry[]` by `model` field; sum `cost` per model |
| **Cost by provider (bar chart)** — Bifrost provider breakdown | Multi-provider orgs need per-provider spend split | LOW | Finance | Group by `provider` field |
| **Model comparison table** — model vs model: cost, latency, tokens per request | Engineers and product evaluate whether a cheaper model is acceptable | MEDIUM | Engineers, Product | Aggregated stats per model; derived from existing log data |
| **Time window selector** — preset ranges (7d, 30d, 90d, custom) | Every user expects to change date range without writing query params | LOW | All | Pure frontend; passes `startTime`/`endTime` to existing API |
| **Active key count + key status summary** | Engineers need to know how many keys are live; already in `DashboardSummaryResponse` | LOW | Engineers | Already returned by summary API |

### Differentiators (Competitive Advantage)

Features that would distinguish Draupnir's analytics from generic admin dashboards. Aligned with the core value: teams should be able to track, allocate, and optimize LLM spend without external tooling.

| Feature | Value Proposition | Complexity | Role | Notes |
|---------|-------------------|------------|------|-------|
| **Period-over-period comparison** — this month vs last month delta shown inline on each KPI card | Finance teams track budget against prior period without manually cross-referencing two reports | MEDIUM | Finance | Requires two parallel API calls with shifted time windows; display delta with directional color (cost increase = red, decrease = green) |
| **Cost projection / monthly forecast** — extrapolate current burn rate to end of month | Finance can answer "will we hit budget?" before the month ends | HIGH | Finance | Linear extrapolation on current-period burn rate is enough for v1; no ML required. Flag: requires sufficient data (at least 7 days in current period) |
| **Model efficiency scatter plot** — cost per request vs latency per model | Engineers identify the best cost/latency tradeoff; justifies model routing decisions | MEDIUM | Engineers | Plot each model as a point: x=avgLatency, y=avgCostPerRequest; derived from existing log aggregation |
| **Monthly PDF report** — one-click or scheduled export of cost + usage summary | Finance and product can share numbers with stakeholders without dashboard access | HIGH | Finance, Product | Requires server-side PDF generation (e.g. Puppeteer/Playwright rendering a report page, or a PDF library); browser `window.print()` is a viable low-cost alternative for v1 |
| **Per-API-key cost breakdown** — which key ID drives most cost | Engineers do chargeback attribution; finance tracks per-team allocation | MEDIUM | Engineers, Finance | Group logs by `keyId`; join to key name via existing `AppApiKey` data; requires API-key name resolution |
| **Error rate trend** — requests with `status: 'error'` over time | Engineers detect degraded gateway health; prevents attributing latency spikes to cost | MEDIUM | Engineers | `status` field already present in `LogEntry` |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Real-time streaming dashboard (WebSocket/SSE)** | "Live" feel; engineers want to watch traffic as it happens | Bifrost logs are polled/aggregated; sub-second accuracy is not meaningful for cost analytics. WebSocket infra adds significant complexity for negligible finance/product value. Engineers watching live traffic belong in an observability tool (Langfuse, Datadog), not a cost dashboard | Use 60-second auto-refresh with a "last updated" timestamp. Enough freshness for all three roles |
| **Heatmap (day-of-week / hour-of-day)** | Looks impressive; shows usage patterns | Requires months of data to be meaningful; misleads with sparse early-stage data. High UI complexity for marginal actionability vs a simple trend line | Offer day-of-week filter as a dimension on existing charts once data density justifies it |
| **Natural language query interface** | "AI-powered" analytics feels modern | Requires LLM integration on top of the dashboard itself; adds latency, cost, and a new attack surface. Adds zero value when the target audience already has a clear set of metrics they need | Pre-built filter controls (model, provider, date range, key) serve the same discovery need without LLM overhead |
| **User-level drill-down (which end-user hit which model)** | Product managers want user-level attribution | `LogEntry` has `keyId` not `userId`; Bifrost does not surface end-user identity in usage logs. Implementing this requires a separate event-tracking layer outside Draupnir's current architecture | Per-key breakdown is the correct granularity for the current data model |
| **Fully customizable dashboard (drag-and-drop widgets)** | Power users want to rearrange charts | Extremely high frontend complexity (react-grid-layout + persisted layouts + per-user state). Dashboard is for three known roles with known needs — customization is overkill | Provide role-aware tab views (Engineers / Finance / Overview) so each role sees their relevant subset by default |
| **Anomaly detection alerts (ML-based)** | Looks like enterprise feature; addresses cost spike fear | Requires a background job, statistical modeling, and notification infra. Threshold-based alerts (e.g., "cost exceeded $X today") deliver 90% of the value at 10% of the complexity | Implement simple threshold alerts (configurable cost ceiling per org) as a v1.x follow-on |

---

## Feature Dependencies

```
Time Window Selector
    └──required by──> Cost Over Time
    └──required by──> Requests Over Time
    └──required by──> Token Usage Over Time
    └──required by──> Cost by Model
    └──required by──> Period-Over-Period Comparison

Cost by Model
    └──enables──> Model Comparison Table
    └──enables──> Model Efficiency Scatter Plot

KPI Summary Cards
    └──enhanced by──> Period-Over-Period Comparison
    └──enhanced by──> Cost Projection

Per-API-Key Cost Breakdown
    └──requires──> Key Name Resolution (join AppApiKey names)

Monthly PDF Report
    └──depends on──> All chart data being stable and server-renderable
    └──conflicts with──> Real-time dashboard (PDF needs a snapshot; real-time has no "moment")
```

### Dependency Notes

- **Time Window Selector required by all charts:** All time-series and aggregation charts pass `startTime`/`endTime` to `GET /api/organizations/:orgId/dashboard/usage`. The selector must exist before any chart can be interactive.
- **Per-API-Key breakdown requires key name join:** `LogEntry.keyId` is a gateway ID. Mapping to human-readable key names requires resolving against `AppApiKey` records. This is a data-layer concern before the chart is buildable.
- **Monthly PDF report depends on stable chart data:** PDF generation (even via browser `window.print()`) requires chart components to be server-renderable or fully hydrated. Implement charts first, then PDF layer.

---

## MVP Definition

### Launch With (v1.2)

Minimum to make the dashboard meaningfully useful for all three roles.

- [ ] **KPI summary cards with delta badges** — totalCost, totalRequests, totalTokens, avgLatency with period-over-period delta (last 30d vs prior 30d). Already have data; just UI.
- [ ] **Cost over time line chart (30d default)** — daily bucketing. Finance's single most-asked question.
- [ ] **Cost by model bar chart** — ranked by total spend. Product and finance identify runaway models.
- [ ] **Token usage stacked area chart** — input vs output split over time. Engineers diagnose prompt vs completion cost drivers.
- [ ] **Time window selector** — 7d / 30d / 90d / custom. Required for any chart to be interactive.
- [ ] **Model comparison table** — per-model: total cost, total requests, avg latency, avg cost/request. Engineers make routing decisions.

### Add After Validation (v1.2.x)

Add these once core charts are in use and role-specific pain points emerge.

- [ ] **Period-over-period KPI delta** — trigger: finance asks "compared to last month?"
- [ ] **Per-API-key cost breakdown** — trigger: engineers doing chargeback attribution
- [ ] **Error rate trend chart** — trigger: engineering ops reports latency anomalies
- [ ] **Monthly PDF report (browser print)** — trigger: finance needs to share numbers externally

### Future Consideration (v1.3+)

Defer until product-market fit on the analytics feature is established.

- [ ] **Cost projection / monthly forecast** — requires sufficient data history and statistical validation
- [ ] **Model efficiency scatter plot** — powerful but requires familiarity with the core charts first
- [ ] **Threshold-based cost alerts** — requires notification infra (email/Slack) outside dashboard scope
- [ ] **Scheduled PDF delivery** — requires cron job infra

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| KPI summary cards | HIGH | LOW | P1 |
| Time window selector | HIGH | LOW | P1 |
| Cost over time (line) | HIGH | MEDIUM | P1 |
| Cost by model (bar) | HIGH | MEDIUM | P1 |
| Token usage stacked area | HIGH | MEDIUM | P1 |
| Model comparison table | HIGH | MEDIUM | P1 |
| Period-over-period delta | HIGH | MEDIUM | P2 |
| Per-API-key breakdown | MEDIUM | MEDIUM | P2 |
| Error rate trend | MEDIUM | MEDIUM | P2 |
| Monthly PDF (browser print) | HIGH | MEDIUM | P2 |
| Cost projection | MEDIUM | HIGH | P3 |
| Model efficiency scatter | MEDIUM | MEDIUM | P3 |
| Threshold alerts | HIGH | HIGH | P3 |
| Scheduled PDF delivery | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for v1.2 launch
- P2: Should have, add in v1.2.x patch
- P3: Future milestone (v1.3+)

---

## Interactivity Expectations by Chart Type

| Chart | Hover tooltip | Drill-down | Filter sync | Zoom | Export |
|-------|--------------|------------|-------------|------|--------|
| KPI summary cards | No | No | Time window | No | Via PDF |
| Cost over time (line) | YES — date + value | No | YES — links to model filter | Chart-level (Recharts brush) | Via PDF |
| Requests over time (line) | YES — date + count | No | YES | Chart-level brush | Via PDF |
| Token usage (stacked area) | YES — input/output split | No | YES | Chart-level brush | Via PDF |
| Cost by model (bar) | YES — model + total cost | Click to filter all charts by model | YES | No | CSV row |
| Cost by provider (bar) | YES — provider + cost | Click to filter by provider | YES | No | CSV row |
| Model comparison table | N/A | Click model to pre-fill model filter | YES | N/A | CSV export |
| Per-API-key breakdown | YES — key name + cost | No | YES | No | CSV row |

**Filter sync:** When a model bar is clicked, the time-series charts above should automatically filter to that model. This requires a shared filter state (e.g., React context or URL query params). The `UsageChartQuery` already supports `models` and `providers` as comma-separated strings — the API is ready; the state management is the work.

---

## Data Freshness Requirements by Feature

| Feature | Acceptable Staleness | Source | Notes |
|---------|----------------------|--------|-------|
| KPI summary cards | 5 min | Cached aggregation | `GetDashboardSummaryService` result can be cached at service layer |
| Cost/token trend charts | 5 min | Aggregated from logs | Time-series aggregation is expensive; cache at 5-min interval is appropriate |
| Cost by model | 5 min | Aggregated from logs | Same cache window as trend charts |
| Model comparison table | 5 min | Aggregated from logs | No real-time need |
| Period-over-period delta | 15 min | Two aggregation calls | Prior-period data is historical; less freshness needed |
| Monthly PDF report | Point-in-time snapshot | Page render at export time | Must capture current filter state at click moment |
| Error rate trend | 1 min | Raw logs, recent window | Engineers use this reactively; freshness matters more here |

**Architecture implication:** The v1.2 charts are achievable with server-side aggregation on each page load (tolerable for <1000 log entries). For larger orgs, a 5-minute server-side cache layer (Redis or in-memory TTL) should be introduced before charts feel slow. Real-time WebSocket infra is not warranted — 60-second polling or manual refresh is sufficient.

---

## Competitor Feature Analysis

| Feature | Langfuse | Datadog LLM Obs | CostGoat | Draupnir v1.2 |
|---------|----------|-----------------|---------|----------------|
| Cost over time | Line chart, custom dashboards | Time series widget | Cost trend | Line chart |
| Cost by model | Group by model dimension | Tag-based breakdown | Per-model spend | Bar chart |
| Token input/output split | Yes, granular usage types | Yes | Partial | Stacked area |
| Period comparison | Custom date ranges | Built-in compare | No | Delta badges on KPIs |
| PDF export | No native | Dashboard snapshot | No | Browser print (v1.2) |
| Per-key breakdown | Per-trace/user | Per-tag | No | Per-keyId (v1.2.x) |
| Model comparison | Custom widgets | Side-by-side metrics | Basic | Comparison table |
| Anomaly alerts | No | Yes (enterprise) | Threshold alerts | Defer to v1.3 |

Draupnir's advantage: embedded in the gateway itself, no SDK integration overhead, org-scoped by default, available to engineers/product/finance without separate tooling subscriptions.

---

## Sources

- Langfuse token/cost tracking docs: https://langfuse.com/docs/observability/features/token-and-cost-tracking
- Langfuse custom dashboards: https://langfuse.com/docs/metrics/features/custom-dashboards
- Datadog LLM Observability: https://www.datadoghq.com/product/ai/llm-observability/
- CostGoat LLM cost tracker: https://www.binadox.com/products/llm-cost-tracker/
- Best React chart libraries 2025 (LogRocket): https://blog.logrocket.com/best-react-chart-libraries-2025/
- Period-over-period analysis (Metabase): https://www.metabase.com/learn/metabase-basics/querying-and-dashboards/time-series/time-series-comparisons
- Metabase dashboard/reporting features: https://www.metabase.com/features/analytics-dashboards
- Datadog AI-assisted metrics monitoring: https://www.datadoghq.com/blog/ai-powered-metrics-monitoring/

---
*Feature research for: Draupnir v1.2 Dashboard Analytics*
*Researched: 2026-04-11*
