# Stack Research

**Domain:** Dashboard Analytics Visualization — Bun + TypeScript + Inertia.js + React 19
**Researched:** 2026-04-11
**Confidence:** HIGH

## Critical Pre-Finding

**Recharts 3.8.1 is already installed** (`package.json` line 88: `"recharts": "^3.8.1"`).
The project already has two chart components in production use:
- `resources/js/components/charts/UsageLineChart.tsx` — LineChart with ResponsiveContainer
- `resources/js/components/charts/CreditBarChart.tsx` — BarChart with ResponsiveContainer

The dashboard visualization milestone does NOT need to add a chart library. It needs to extend what is already there.

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| recharts | ^3.8.1 (installed) | All chart rendering | Already installed, React 19 compatible, ESM-native, zero new dep overhead, TypeScript-first in v3, used by shadcn/ui |
| react | ^19.2.5 (installed) | Component runtime | Already installed; recharts 3.x targets React 18+ with React 19 working without overrides |
| tailwindcss | 3 (installed) | Chart container styling | Utility classes on wrappers; recharts SVG is self-styled but containers/cards use Tailwind |

### Supporting Libraries (all already installed — zero new deps)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| recharts `ResponsiveContainer` | bundled with recharts | Makes charts fluid-width | Use on every chart; wrap all chart roots |
| recharts `ComposedChart` | bundled | Overlay line + bar on same axes | Cost vs. request volume dual-axis charts |
| recharts `AreaChart` | bundled | Time-series cost/usage trends | Continuous-data trend visualization |
| recharts `PieChart` | bundled | Model share breakdown | Proportional comparisons (model cost %) |
| recharts `RadarChart` | bundled | Multi-model comparison | Latency/cost/quality radar view |
| `@radix-ui/react-*` | installed | Tooltip, dialog, dropdown wrappers | Chart filter controls, date-range pickers |
| `lucide-react` | ^1.8.0 (installed) | Icon set for stat cards | Trending arrows, cost indicators |
| `zod` | ^4.3.6 (installed) | Validate chart data payloads from API | Type-safe chart prop construction from Inertia page props |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Biome | Lint/format chart component files | Already configured; no extra setup |
| `tsc --noEmit` | Type-check recharts prop usage | Recharts 3 exports typed `dataKey` helpers; use `ChartHelper` generic for strict dataKey inference |
| Vite + `@vitejs/plugin-react` | Bundle chart components for browser | Already configured in `vite.config.*`; recharts is ESM so tree-shaking works |

---

## Installation

Nothing to install. All required libraries are already present:

```bash
# Verify recharts is present (should show 3.8.x)
bun pm ls | grep recharts
```

If a shadcn-style `ChartContainer` wrapper component is desired (optional, copy-paste only):

```bash
# Copy from shadcn/ui — no package install needed
# https://ui.shadcn.com/docs/components/radix/chart
# The chart.tsx wrapper is ~200 lines of plain React + recharts, pasted into:
# resources/js/components/ui/chart.tsx
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| recharts (already installed) | Chart.js / react-chartjs-2 | Never here — Canvas-based, heavier, adds a new dep, no benefit over SVG recharts for this data type |
| recharts (already installed) | Tremor | Tremor is built ON recharts; adds abstraction overhead without adding capability; contradicts "no new framework deps" constraint |
| recharts (already installed) | Victory (FormidableHQ) | Only if React Native mobile target required — not applicable here |
| recharts (already installed) | Visx (Airbnb) | If very custom/bespoke layouts are needed; 15KB but much lower-level and requires more boilerplate; not worth switching |
| recharts (already installed) | D3 directly | If recharts becomes a bottleneck on highly custom layouts; overkill for standard analytics dashboards |
| shadcn `chart.tsx` wrapper (optional) | Raw recharts only | Current chart components use raw recharts. shadcn wrapper adds consistent theming via CSS vars; adopt only if visual consistency with the rest of the shadcn/Radix component system is a priority |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Tremor | Built on recharts but adds a 50KB wrapper layer; "no new framework dependencies" constraint violated | recharts directly (already installed) |
| nivo | Peer depends on specific React versions; D3-heavy; much larger bundle; adds dep; same output as recharts | recharts |
| Ant Design Charts (AntV G2) | Pulls in the entire AntD ecosystem; massive bundle; no Tailwind alignment | recharts |
| Plotly.js / react-plotly.js | 3MB+ bundle; designed for scientific/statistical charts not SaaS dashboards | recharts |
| ECharts / echarts-for-react | Apache project, heavy, poor ESM tree-shaking, adds a dep | recharts |

---

## Stack Patterns by Variant

**For time-series cost/usage trends (primary use case):**
- Use `AreaChart` or `LineChart` with `ResponsiveContainer`
- `XAxis` with time-bucketed labels (daily, weekly)
- Two `Line` / `Area` dataSeries: `totalCost` + `totalRequests`
- Because AreaChart conveys magnitude at a glance, better than bare LineChart for cost

**For model comparison (cost per model, request share):**
- Use `BarChart` (grouped) for side-by-side model comparison
- Use `PieChart` / `RadialBarChart` for percentage breakdown
- Because bar is better for absolute comparisons; pie for proportional "what fraction"

**For dual-metric overlays (requests + cost on same time axis):**
- Use `ComposedChart` with `Bar` (requests) + `Line` (cost)
- Add dual `YAxis` (left = requests, right = cost $)
- Because requests and cost have different units; dual axis prevents misleading scale

**For chart data from Inertia page props:**
- Define Zod schema matching Inertia prop shape
- Use `z.infer<typeof schema>[]` as the chart `data` prop type
- Prevents runtime shape mismatches between server DTO and chart component

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| recharts@3.8.1 | react@19.2.5 | CONFIRMED: recharts 3.x removed react-is dependency; React 19 works without overrides. The `overrides.react-is` workaround only applied to recharts 2.x. |
| recharts@3.8.1 | TypeScript@5.3 | CONFIRMED: recharts 3.0 rewrote state management with full TS types; `ChartHelper<T>` generic available for strict dataKey inference |
| recharts@3.8.1 | Bun runtime | CONFIRMED: recharts ships ESM-first; Bun handles ESM natively. No CJS-only modules in the dependency tree. Vite bundles for browser, Bun never executes recharts server-side. |
| recharts@3.8.1 | Vite@8 | CONFIRMED: recharts is tree-shakeable ESM; Vite's rollup bundler will dead-code-eliminate unused chart types |
| recharts@3.8.1 | @inertiajs/react@3.0.3 | COMPATIBLE: Inertia page components are standard React components; recharts components render inside them without any adapter needed |

---

## Bundle Size

| Library | Minified | Gzipped | Notes |
|---------|----------|---------|-------|
| recharts@3.8.1 | ~445KB | ~130KB | Full install; tree-shaking reduces this to only imported chart types |
| recharts (tree-shaken, 3 chart types) | ~120KB | ~38KB | Estimated for AreaChart + BarChart + PieChart import set |
| Vite production build | applies dead-code elimination | — | Only imported recharts components are bundled |

The project already pays this bundle cost (recharts is installed and imported). No new bundle cost for the dashboard analytics milestone.

---

## Integration Pattern with Inertia Page Components

Recharts components integrate directly as React components inside Inertia page files. The existing pattern in `UsageLineChart.tsx` and `CreditBarChart.tsx` is already correct. For the new dashboard analytics work, extend this pattern:

```typescript
// resources/js/components/charts/CostTrendChart.tsx
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export interface CostTrendPoint {
  readonly date: string
  readonly cost: number
  readonly requests: number
}

interface Props {
  readonly data: CostTrendPoint[]
  readonly title?: string
}

export function CostTrendChart({ data, title = 'Cost Trend' }: Props) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="date" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip />
            <Area type="monotone" dataKey="cost" stroke="hsl(222.2 47.4% 11.2%)" fill="hsl(222.2 47.4% 11.2% / 0.1)" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
```

Inertia page passes typed props directly:

```typescript
// resources/js/Pages/Admin/Dashboard/Index.tsx
// Props come from the server-side DashboardController via Inertia::render()
interface Props {
  readonly costTrend: CostTrendPoint[]
  readonly modelBreakdown: ModelShare[]
}

export default function AdminDashboard({ costTrend, modelBreakdown }: Props) {
  return (
    <AdminLayout>
      <CostTrendChart data={costTrend} title="Cost Analysis" />
      <ModelBreakdownChart data={modelBreakdown} />
    </AdminLayout>
  )
}
```

---

## Sources

- GitHub recharts/recharts issues/4558 — React 19 support status; confirmed resolved in 3.x (HIGH confidence)
- GitHub recharts/recharts releases — confirmed latest version is 3.8.1 as of March 2025 (HIGH confidence)
- shadcn/ui chart docs (ui.shadcn.com/docs/components/radix/chart) — recharts 3.x usage patterns, ChartContainer pattern (HIGH confidence)
- package.json project file — direct inspection confirming recharts@^3.8.1 already installed (HIGH confidence)
- resources/js/components/charts/*.tsx — direct code inspection confirming recharts already in use (HIGH confidence)
- WebSearch: LogRocket "Best React chart libraries 2025" — bundle size comparisons, Tremor-on-recharts relationship (MEDIUM confidence)
- Bundlephobia recharts@3.8.1 listing — bundle size reference (MEDIUM confidence, page content not fully extractable)

---
*Stack research for: Dashboard Analytics Visualization (v1.2)*
*Researched: 2026-04-11*
