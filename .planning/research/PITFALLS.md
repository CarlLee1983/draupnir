# Pitfalls Research

**Domain:** Dashboard Analytics on Existing DDD Service (Draupnir v1.2)
**Researched:** 2026-04-11
**Confidence:** HIGH (direct codebase inspection; all claims grounded in existing src/)

---

## Critical Pitfalls

### Pitfall 1: Admin Dashboard Uses Hardcoded Sample Data

**What goes wrong:**
`src/Pages/Admin/Dashboard/Index.tsx` (line 21–27) renders `sampleUsageData` — five hardcoded
date/requests/tokens entries. The Admin dashboard chart is visually complete but shows fictional
numbers to real users. This will ship to production if no one explicitly wires a real data query
to the Admin page handler.

**Why it happens:**
The frontend page and chart components were built before a page-handler class existed that could
fetch live data. The placeholder was accepted because v1.1 only required page handlers to be
unit-testable, not to prove end-to-end data fidelity. No test currently asserts that the admin
dashboard renders from real props.

**How to avoid:**
1. Create `AdminDashboardPage.ts` (analogous to `MemberDashboardPage.ts`) that calls
   `GetDashboardSummaryService` (or a new admin-scoped equivalent) and populates `usageData` as a
   prop.
2. Remove `sampleUsageData` from the React component; accept `usageData: UsageDataPoint[]` as a
   prop.
3. Add a page-handler unit test that asserts the prop is non-empty when the mock gateway has seeded
   stats.

**Warning signs:**
- Chart renders even when the gateway mock returns zero usage.
- `AdminDashboard` component file contains any literal `{ date: '...' }` objects.
- No `AdminDashboardPage.ts` file exists under `src/Pages/Admin/`.

**Phase to address:**
Must be the first task in analytics phase — before any design review, because every stakeholder
demo will be using fake data until this is fixed.

---

### Pitfall 2: `getLogs` Return Type Is `Record<string, unknown>[]` — Loses Type Safety Across Every Layer

**What goes wrong:**
`IUsageAggregator.getLogs` returns `readonly Record<string, unknown>[]`. The `UsageAggregator`
implementation casts the gateway's typed `LogEntry[]` to `unknown` and then back. The Member/Usage
page handler passes this through to `usageLogs: Record<string, unknown>[]` as an Inertia prop.
The React `logsToChartData` function then accesses `log.timestamp`, `log.input_tokens`,
`log.output_tokens`, `log.total_tokens` — all as `unknown` with runtime `Number()` coercions.

The `LogEntry` type in `types.ts` uses `inputTokens` / `outputTokens` / `totalTokens` (camelCase),
but the React component reads `input_tokens` / `output_tokens` / `total_tokens` (snake_case).
These fields will always be `undefined`, silently producing zero-token charts.

**Why it happens:**
The `Record<string, unknown>` escape hatch was introduced to avoid a cross-layer type dependency
from Dashboard Application layer → Foundation LLMGateway types. The key mismatch went undetected
because `MockGatewayClient` returns well-typed `LogEntry[]` and tests mock at the aggregator level
— no test asserts the React component receives correct field names.

**How to avoid:**
1. Define a `UsageLogDTO` in `Dashboard/Application/DTOs/DashboardDTO.ts` that mirrors `LogEntry`
   fields explicitly (timestamp, model, provider, inputTokens, outputTokens, totalTokens,
   latencyMs, cost, status).
2. Map `LogEntry` → `UsageLogDTO` inside `UsageAggregator.getLogs` before returning.
3. Update `IUsageAggregator.getLogs` to return `readonly UsageLogDTO[]`.
4. Update the React `Props` interface in `Member/Usage/Index.tsx` and fix `logsToChartData` to use
   camelCase field names.
5. Add a test asserting that `logsToChartData` produces non-zero token counts when given a seeded
   log.

**Warning signs:**
- Usage page renders "0 tokens" when the gateway has data.
- `usageLogs` prop typed as `Record<string, unknown>[]` in any React component.
- `log.input_tokens` (snake_case) anywhere in frontend TypeScript.

**Phase to address:**
Phase 1 of analytics milestone (data pipeline correctness), before any chart design work.

---

### Pitfall 3: Permission Boundary Is Membership-Only — No Per-Role Data Scoping

**What goes wrong:**
`OrgAuthorizationHelper.requireOrgMembership` approves any org member (ADMIN, MANAGER, MEMBER
roles) for dashboard access. Both `GetDashboardSummaryService` and `GetUsageChartService` use only
this check. There is no enforcement of: "MEMBER sees only their own keys' usage; MANAGER sees all
org keys." The service always queries `findByOrgId(orgId)` — all keys for the org, regardless of
who is asking.

A MEMBER in org-1 currently receives usage stats aggregated across every key in the org, including
keys owned by other members. This crosses a data boundary that the RBAC model (ADMIN/MANAGER/MEMBER)
intends to enforce.

**Why it happens:**
Dashboard was designed as a "pure read / CQRS read side" (DESIGN_DECISIONS.md §3.3) which
correctly has no domain layer. The simplification was appropriate for the summary stats but was
never revisited when per-member scoping became relevant. `OrgAuthorizationHelper` only has
`requireOrgMembership` and `requireOrgManager` — there is no `requireSelfOrManager` pattern.

**How to avoid:**
1. Add a `callerOrgRole` field to the resolved auth context (it's already in `membership.role`
   from `OrgAuthResult` — just needs to be surfaced to the service).
2. Implement scope-based key filtering: if `callerOrgRole === 'member'`, filter to
   `apiKeyRepository.findByUserAndOrgId(callerUserId, orgId)` instead of `findByOrgId(orgId)`.
3. Add a test: a MEMBER calling `GetDashboardSummaryService` with two org keys (one theirs, one
   another user's) should only see stats for their own key.

**Warning signs:**
- `GetDashboardSummaryService` calls `findByOrgId` without first checking the caller's org role.
- No test asserts that a MEMBER's stats differ from a MANAGER's stats on the same org.
- `callerSystemRole` is `'user'` but there is no lookup of the org-level role.

**Phase to address:**
Phase 1 — permission model must be locked before charts are built, because fixing it later
requires changing the service interface, DTO, and tests simultaneously.

---

### Pitfall 4: Parallel Gateway Calls Not Bounded — Dashboard Blocks on N Keys

**What goes wrong:**
`GetDashboardSummaryService.execute` calls `apiKeyRepository.findByOrgId(orgId)` which returns all
keys, then passes all `gatewayKeyId` values to `usageAggregator.getStats(virtualKeyIds)`. The
`UsageAggregator` makes a single `gatewayClient.getUsageStats(keyIds)` call — which is fine for
the current Bifrost API that accepts an array.

However, `GetUsageChartService.execute` calls both `getLogs` and `getStats` via `Promise.all` with
the full key array. If the gateway starts rate-limiting per-key or if the dashboard is extended to
do per-key breakdown (a natural analytics evolution), each key becomes a separate gateway call.
With no bound, an org with 50 active keys triggers 50 concurrent gateway requests, a latency cliff
and potential 429 storm.

Additionally, neither service has a timeout. If the gateway is slow, the entire Inertia page render
hangs until it times out at the HTTP layer.

**Why it happens:**
Current `ILLMGatewayClient` takes `keyIds: readonly string[]` as a batch — the gateway accepts
arrays, so there's no per-key fan-out today. But dashboard analytics naturally evolve toward
per-key time series, which would require per-key queries.

**How to avoid:**
1. For the current batch API: add a gateway call timeout (e.g., `Promise.race` against a
   `AbortSignal` with a 5-second deadline) in `UsageAggregator`.
2. If per-key fan-out is introduced later: use a concurrency limiter (e.g., `p-limit` or a manual
   semaphore — no new dependency needed with Bun's native primitives) capped at 5 concurrent calls.
3. The page handler should render a degraded state (stats = null, error message) rather than
   hanging when the gateway is slow.

**Warning signs:**
- `Promise.all` over an unbounded array of gateway calls in any service.
- Page handler has no timeout guard around gateway-dependent data fetch.
- No test for `UsageAggregator` behavior when `gatewayClient.getUsageStats` throws or times out.

**Phase to address:**
Phase 2 (reliability / resilience) — acceptable to defer from Phase 1, but must land before
production traffic.

---

## Moderate Pitfalls

### Pitfall 5: Data Freshness Confusion Between Dashboard Summary and Usage Page

**What goes wrong:**
`MemberDashboardPage` calls `GetDashboardSummaryService` (which fetches live gateway stats) and
`GetBalanceService` (which reads from the local `credits` table, synced on a schedule per
DESIGN_DECISIONS.md §3.1). These two data sources have different staleness windows — gateway stats
can be seconds old; credit balance can be up to 5 minutes stale.

When a user has just made many LLM calls, the dashboard shows `totalRequests: 47` (live) but
`balance: $X` (5-minute-old stale). If costs are high, the balance displayed can be significantly
higher than the actual current balance. Users may perceive this as a billing inaccuracy.

**How to avoid:**
1. Add a staleness indicator to the balance display: show the `synced_at` timestamp from the
   `credits` table as "as of 3 minutes ago."
2. Document the freshness contract in the DTO: `CreditBalanceDTO.syncedAt: string` (ISO timestamp).
3. Do not mix "live" and "cached" numbers in the same summary stat block without a visual
   distinction.

**Warning signs:**
- `GetBalanceService` result and `GetDashboardSummaryService` result rendered side-by-side without
  any timestamp.
- Credit DTO has no `syncedAt` field exposed to the frontend.

**Phase to address:**
Phase 2, after per-role scoping is locked.

---

### Pitfall 6: `UsageQuery` Filters Are Opaque Strings Forwarded to Bifrost Unvalidated

**What goes wrong:**
`UsageChartQuery.providers` and `UsageChartQuery.models` are `string | undefined` — raw
comma-separated values read directly from query params and forwarded to `UsageAggregator.getLogs`
as `usageQuery.providers`. No Zod validation, no allowlist, no sanitization. These strings pass
through `ILLMGatewayClient` into `BifrostGatewayAdapter` and ultimately into Bifrost's API query
string.

If Bifrost treats these as filter parameters, a malformed value could produce unexpected results
or reveal error messages from the gateway. More critically, Draupnir's coding style mandates Zod
validation for all user input — this is a gap in policy compliance.

**How to avoid:**
1. Validate `providers` and `models` with a Zod schema at the controller/page-handler boundary:
   `z.string().regex(/^[a-zA-Z0-9,_-]*$/).optional()`.
2. Apply the same validation in `DashboardController.usage` and `MemberUsagePage.handle`.

**Warning signs:**
- Any query param read with `ctx.getQuery()` that flows into a service method without a
  `z.parse()` or equivalent.
- `usageQuery` passed to aggregator contains raw URL query string values.

**Phase to address:**
Phase 1 — validation belongs at the input boundary before any data work.

---

### Pitfall 7: Admin Dashboard Has No Page-Handler Test

**What goes wrong:**
v1.1 achieved full page-handler unit test coverage for Member and Auth pages. The Admin dashboard
page (`src/Pages/Admin/`) has no `AdminDashboardPage.ts` and therefore no test. If analytics work
produces a real admin page handler, it will either be added without a corresponding test (breaking
the coverage standard) or added with a test that cannot reuse the existing `SharedDataMiddleware`
fixture pattern.

**How to avoid:**
1. Create `AdminDashboardPage.ts` before implementing analytics features, following the same
   pattern as `MemberDashboardPage.ts`.
2. Write the unit test first, using `MockGatewayClient` seeded with representative data.
3. Reference the v1.1 test plan structure: `describe → beforeEach → it` pattern with
   `MemoryDatabaseAccess` and `SharedDataMiddleware` mock.

**Warning signs:**
- Admin analytics implementation starts with modifications to the React component before the
  page-handler class and test exist.

**Phase to address:**
Phase 1 — establish the test fixture before any chart data work.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| `Record<string, unknown>[]` for log return type | Avoids cross-layer type dependency | Silent field-name mismatches; zero-value charts in production | Never — costs nothing to define a `UsageLogDTO` |
| Hardcoded `sampleUsageData` in Admin page | Frontend renders immediately without backend wiring | Fake data in production dashboards | Only as a placeholder during initial UI skeleton, must be removed before v1.2 ships |
| `requireOrgMembership` only (no role scoping) | Simple auth check | Any org member sees all org data | Acceptable for MANAGER/ADMIN views; never acceptable for MEMBER views |
| No timeout on gateway calls | Simpler code path | Page hangs indefinitely on gateway latency | Never for synchronous Inertia page renders |
| Raw string query params forwarded to gateway | Simple pass-through | Violates Zod validation policy; potential injection surface | Never — Zod validation is 3 lines of code |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Bifrost via `ILLMGatewayClient` | Calling `getUsageLogs` and assuming fields match `LogEntry` camelCase names in downstream code | Map `LogEntry` to a `UsageLogDTO` at the aggregator boundary; the React layer must never import `LogEntry` |
| `IUsageAggregator` mock | Seeding `MockGatewayClient` but forgetting to call `.seedUsageLogs()` → tests pass with empty arrays | Always seed both `seedUsageStats` and `seedUsageLogs` in test setup; assert on both |
| Inertia page props | Passing raw service response objects as props (with `success`, `message` wrapper fields) | Strip envelope in page handler; only pass `data` fields as Inertia props — React components must never receive `{ success, message, data }` wrappers |
| `OrgAuthorizationHelper` | Using `requireOrgMembership` for MEMBER-scoped data | Use `requireOrgMembership` to gate access, then check `membership.role` to scope the query |
| Credit balance + live stats | Combining in a single API call or caching both at the same TTL | Treat them as separate data sources; render balance with a staleness timestamp |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Fan-out per-key gateway calls | Dashboard page takes > 3s for orgs with 20+ keys | Batch keys in single gateway call; add timeout; use skeleton loading state | Breaks when per-key time-series is added to analytics |
| Full log fetch without limit | `usageQuery.limit` is optional and defaults to whatever Bifrost returns | Always set a sensible default limit (e.g., 1000) in `GetUsageChartService`; let callers reduce it, never increase beyond a cap | Breaks when an org has 50k+ log entries and the page tries to load all of them |
| Recharts rendering 10k+ data points | Browser tab freezes on usage page | Aggregate logs server-side to daily/hourly buckets before passing as Inertia props; never send raw log array > 200 entries to the frontend | Breaks with high-usage orgs or long date ranges |
| `Promise.all([getLogs, getStats])` without timeout | Page hangs on gateway slowness | Wrap in `Promise.race` with timeout; render degraded state on timeout | Breaks during any Bifrost degradation event |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| MEMBER sees all-org usage stats | Data exposure across user boundary within one org | Scope key query by `callerUserId` when `orgRole === 'member'` |
| Unvalidated `providers`/`models` query params forwarded to gateway | Gateway injection; violates Zod policy | Zod regex validation at controller boundary |
| Admin bypasses org membership check but still fetches by `orgId` | Admin can fetch any org's data — this is intentional, but must be logged | Audit log admin cross-org dashboard access |
| Inertia props include `success`/`message` service envelope fields | Leaks internal error codes (`NOT_ORG_MEMBER`) to frontend JavaScript bundle | Strip envelope in page handler before passing to `inertia.render` |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Dashboard shows "—" for API Keys count while gateway is loading | Looks broken; no loading indicator | Pass `isLoading: boolean` prop or use Inertia's `useForm` progress indicator |
| Credit balance and live usage stats disagree visually | User confusion about billing accuracy | Show `syncedAt` timestamp on balance card |
| Empty state missing on usage chart when org has keys but no calls yet | Blank chart with no explanation | Show "No usage in selected period" empty state when `logs.length === 0` |
| Date range filter state lost on page navigation | User must re-enter filters after clicking back | Encode date range in URL query params; Inertia preserves them on visit |

---

## "Looks Done But Isn't" Checklist

- [ ] **Admin dashboard chart:** Has `sampleUsageData` been removed and replaced with real props? Verify `AdminDashboard` component receives `usageData` from a page handler, not from hardcoded literals.
- [ ] **Log field names:** Does the React `logsToChartData` function use camelCase (`inputTokens`, not `input_tokens`)? Verify by running the function against a seeded `LogEntry` object.
- [ ] **Per-role data scoping:** Does a MEMBER caller receive only their own keys' usage? Verify with a test that seeds two keys (different owners) and asserts MEMBER only gets one key's stats.
- [ ] **Query param validation:** Are `providers` and `models` validated with Zod before reaching the service? Verify `DashboardController.usage` and `MemberUsagePage.handle` both call `z.parse`.
- [ ] **Gateway timeout:** Does the dashboard render a degraded state (not hang) when `getUsageStats` takes > 5 seconds? Verify with a `MockGatewayClient.failNext` test that injects a delay.
- [ ] **Recharts data size:** Is log data capped / aggregated before becoming Inertia props? Verify that no page handler passes more than 200 raw log entries to a chart component.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Hardcoded sample data ships to production | LOW | Create `AdminDashboardPage.ts`, wire to service, remove literal from React component, deploy |
| Wrong field names (snake_case in frontend) | LOW | Add `UsageLogDTO`, update aggregator map, update React `logsToChartData`, add assertion test |
| MEMBER sees all-org data (permission leak) | MEDIUM | Add org-role scoping to key query in both services, add tests, requires coordinated deploy |
| Page hangs on gateway timeout | MEDIUM | Add timeout wrapper to `UsageAggregator`, add degraded state to page handlers, no DB migration needed |
| Recharts freezes on large log volume | MEDIUM | Add server-side aggregation in page handler, update React props type, no service layer change |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Hardcoded sample data in Admin dashboard | Phase 1 (data pipeline) | `AdminDashboardPage.test.ts` asserts chart data props come from mock gateway |
| `Record<string, unknown>` / snake_case field mismatch | Phase 1 (data pipeline) | `logsToChartData` unit test with seeded `LogEntry`; non-zero token count asserted |
| Missing per-role data scoping for MEMBER | Phase 1 (permission model) | Test: MEMBER gets 1 key's stats; MANAGER gets 2 keys' stats on same org |
| Query param validation gap | Phase 1 (input validation) | `DashboardController` test with invalid `providers` param asserts 400 or stripped value |
| Gateway timeout / no resilience | Phase 2 (reliability) | Test: `MockGatewayClient.failNext` with delay; page handler returns degraded response |
| Data freshness confusion | Phase 2 (UX) | `CreditBalanceDTO.syncedAt` field present; React renders timestamp |
| No `AdminDashboardPage` test | Phase 1 | File exists with describe/beforeEach/it structure before any chart work begins |
| Large log volume to Recharts | Phase 2 | Page handler test asserts props never exceed 200 log entries |

---

## Sources

- Direct inspection of `src/Modules/Dashboard/` (all files), `src/Pages/Member/`, `src/Pages/Admin/Dashboard/Index.tsx`
- `resources/js/Pages/Member/Usage/Index.tsx` — `logsToChartData` snake_case field access confirmed
- `resources/js/Pages/Admin/Dashboard/Index.tsx` — hardcoded `sampleUsageData` confirmed (lines 21–27)
- `src/Foundation/Infrastructure/Services/LLMGateway/types.ts` — camelCase `LogEntry` field names confirmed
- `src/Modules/Dashboard/Application/Ports/IUsageAggregator.ts` — `Record<string, unknown>` return type confirmed
- `docs/draupnir/DESIGN_DECISIONS.md` §1.3 (multi-tenant isolation), §2.1 (RBAC roles), §3.1 (credit sync cadence), §3.3 (Dashboard CQRS pattern)

---
*Pitfalls research for: Dashboard Analytics on Draupnir DDD Service (v1.2)*
*Researched: 2026-04-11*
