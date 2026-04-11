import { useEffect, useState, type ReactNode } from 'react'
import { Head } from '@inertiajs/react'
import { MemberLayout } from '@/layouts/MemberLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { CostTrendAreaChart, type CostTrendPoint } from '@/components/charts/CostTrendAreaChart'
import { ModelCostBarChart, type ModelCostPoint } from '@/components/charts/ModelCostBarChart'
import { TokenUsageAreaChart, type TokenUsagePoint } from '@/components/charts/TokenUsageAreaChart'
import {
  ModelComparisonTable,
  type ModelComparisonRow,
} from '@/components/charts/ModelComparisonTable'
import { formatCredit, formatNumber } from '@/lib/format'
import { BarChart3, Clock3, CreditCard, RefreshCcw, Sparkles, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'

type WindowOption = 7 | 30 | 90

interface Balance {
  balance: string
  lowBalanceThreshold: string
  status: string
}

interface KpiUsage {
  totalRequests: number
  totalCost: number
  totalTokens: number
  avgLatency: number
}

interface KpiPayload {
  usage: KpiUsage
  lastSyncedAt: string | null
}

interface DashboardBundle {
  kpi: KpiPayload
  costTrends: readonly CostTrendPoint[]
  tokenTrends: readonly TokenUsagePoint[]
  modelCost: readonly ModelCostPoint[]
  modelComparison: readonly ModelComparisonRow[]
}

interface Props {
  orgId?: string | null
  balance: Balance | null
  error: string | null
}

const WINDOW_OPTIONS: readonly { value: WindowOption; label: string }[] = [
  { value: 7, label: '7d' },
  { value: 30, label: '30d' },
  { value: 90, label: '90d' },
]

const DAY_MS = 24 * 60 * 60 * 1000

export default function MemberDashboard({ orgId, balance, error }: Props) {
  const [selectedWindow, setSelectedWindow] = useState<WindowOption>(30)
  const [bundle, setBundle] = useState<DashboardBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    if (!orgId) {
      setLoading(false)
      setBundle(null)
      setFetchError(null)
      return
    }

    const controller = new AbortController()
    const { startTime, endTime } = resolveDateRange(selectedWindow)
    const query = new URLSearchParams({
      start_time: startTime,
      end_time: endTime,
    })
    const baseUrl = `/api/organizations/${encodeURIComponent(orgId)}/dashboard`

    async function loadAnalytics(): Promise<void> {
      setLoading(true)
      setFetchError(null)

      try {
        const [kpi, costTrends, modelComparison] = await Promise.all([
          fetchJson<KpiPayload>(`${baseUrl}/kpi-summary?${query.toString()}`, controller.signal),
          fetchJson<{ buckets?: readonly CostTrendPoint[] }>(`${baseUrl}/cost-trends?${query.toString()}`, controller.signal),
          fetchJson<{ rows?: readonly ModelComparisonRow[] }>(`${baseUrl}/model-comparison?${query.toString()}`, controller.signal),
        ])

        const costTrendPoints = costTrends.buckets ?? []
        const modelComparisonRows = modelComparison.rows ?? []

        setBundle({
          kpi,
          costTrends: costTrendPoints,
          tokenTrends: costTrendPoints,
          modelCost: modelComparisonRows,
          modelComparison: modelComparisonRows,
        })
      } catch (error_) {
        if (controller.signal.aborted) return
        const message = error_ instanceof Error ? error_.message : 'Failed to load dashboard analytics'
        setFetchError(message)
        setBundle(null)
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void loadAnalytics()

    return () => controller.abort()
  }, [orgId, selectedWindow])

  const hasUsageRows = (bundle?.kpi.usage.totalRequests ?? 0) > 0
  const showEmptyState = Boolean(orgId) && !fetchError && !hasUsageRows

  return (
    <MemberLayout>
      <Head title="總覽" />

      <div className="space-y-8">
        <header className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Member Dashboard
              </p>
              <h1 className="text-3xl font-semibold tracking-tight">總覽</h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                以 7 / 30 / 90 天時間窗檢視 cached usage_records 的成本、請求量、Token 與模型分布。
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <WindowSelector value={selectedWindow} onChange={setSelectedWindow} />
              <StalenessLabel
                lastSyncedAt={bundle?.kpi.lastSyncedAt ?? null}
                isLoading={loading}
              />
            </div>
          </div>
        </header>

        {error && <InfoCard tone="destructive" title="Organization" message={error} />}
        {fetchError && <InfoCard tone="destructive" title="Analytics" message={fetchError} />}

        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <BalanceCard balance={balance} />
          <QuickActionsCard orgId={orgId} />
        </div>

        {loading ? (
          <LoadingState />
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                title="成本"
                value={bundle ? formatCredit(bundle.kpi.usage.totalCost) : '—'}
                suffix="USD"
                icon={<CreditCard className="h-4 w-4" />}
                accentClassName="from-emerald-400 to-teal-500"
              />
              <MetricCard
                title="請求數"
                value={bundle ? formatNumber(bundle.kpi.usage.totalRequests) : '—'}
                icon={<Sparkles className="h-4 w-4" />}
                accentClassName="from-sky-400 to-cyan-500"
              />
              <MetricCard
                title="總 Tokens"
                value={bundle ? formatNumber(bundle.kpi.usage.totalTokens) : '—'}
                icon={<BarChart3 className="h-4 w-4" />}
                accentClassName="from-orange-400 to-amber-500"
              />
              <MetricCard
                title="平均延遲"
                value={bundle ? `${formatNumber(bundle.kpi.usage.avgLatency)} ms` : '—'}
                icon={<Clock3 className="h-4 w-4" />}
                accentClassName="from-violet-400 to-fuchsia-500"
              />
            </section>

            <section className="space-y-4">
              {showEmptyState ? (
                <EmptyStateCard />
              ) : hasUsageRows ? (
                <div className="grid gap-4 xl:grid-cols-2">
                  <CostTrendAreaChart data={bundle?.costTrends ?? []} />
                  <TokenUsageAreaChart data={bundle?.tokenTrends ?? []} />
                  <ModelCostBarChart data={bundle?.modelCost ?? []} />
                  <ModelComparisonTable data={bundle?.modelComparison ?? []} className="xl:col-span-2" />
                </div>
              ) : null}
            </section>
          </>
        )}
      </div>
    </MemberLayout>
  )
}

function WindowSelector({
  value,
  onChange,
}: {
  value: WindowOption
  onChange: (value: WindowOption) => void
}) {
  return (
    <div className="inline-flex rounded-xl border bg-background p-1 shadow-sm">
      {WINDOW_OPTIONS.map((option) => {
        const active = value === option.value
        return (
          <Button
            key={option.value}
            type="button"
            variant={active ? 'default' : 'ghost'}
            size="sm"
            className={cn(
              'min-w-16 rounded-lg px-4 transition-all',
              active ? 'shadow-sm' : 'text-muted-foreground',
            )}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Button>
        )
      })}
    </div>
  )
}

function MetricCard({
  title,
  value,
  suffix,
  icon,
  accentClassName,
}: {
  title: string
  value: string
  suffix?: string
  icon: ReactNode
  accentClassName: string
}) {
  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accentClassName}`} />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="rounded-full border bg-background p-2 text-foreground shadow-sm">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold tracking-tight">{value}</span>
          {suffix ? <span className="text-sm text-muted-foreground">{suffix}</span> : null}
        </div>
      </CardContent>
    </Card>
  )
}

function BalanceCard({ balance }: { balance: Balance | null }) {
  const isLow = balance
    ? Number.parseFloat(balance.balance) < Number.parseFloat(balance.lowBalanceThreshold)
    : false

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Credit 餘額</CardTitle>
          <CardDescription>目前組織可用額度</CardDescription>
        </div>
        <Wallet className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="flex items-center gap-3">
        <div className="text-2xl font-semibold">
          {balance ? formatCredit(balance.balance) : '—'}
        </div>
        {balance && isLow ? <Badge variant="destructive">低額度</Badge> : null}
      </CardContent>
    </Card>
  )
}

function QuickActionsCard({ orgId }: { orgId?: string | null }) {
  const keysQuery = orgId ? `?orgId=${encodeURIComponent(orgId)}` : ''

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">快速操作</CardTitle>
          <CardDescription>常用 member 工作流</CardDescription>
        </div>
        <RefreshCcw className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <a
          href={`/member/api-keys/create${keysQuery}`}
          className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          建立 API Key
        </a>
        <a
          href={`/member/usage${keysQuery}`}
          className="inline-flex h-9 items-center rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          查看用量
        </a>
      </CardContent>
    </Card>
  )
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={`metric-skeleton-${index}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartSkeleton title="成本趨勢" />
        <ChartSkeleton title="Token 用量" />
        <ChartSkeleton title="模型成本" />
        <ChartSkeleton title="模型比較" className="xl:col-span-2" />
      </div>
    </div>
  )
}

function ChartSkeleton({ title, className }: { title: string; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-[300px] w-full rounded-xl" />
      </CardContent>
    </Card>
  )
}

function EmptyStateCard() {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="text-base">No usage data yet</CardTitle>
        <CardDescription>
          Data syncs every 5 minutes from Bifrost. Check back after your first API call.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="max-w-2xl text-sm text-muted-foreground">
          The selected time window does not contain any cached `usage_records` rows yet.
        </p>
      </CardContent>
    </Card>
  )
}

function InfoCard({
  title,
  message,
  tone,
}: {
  title: string
  message: string
  tone: 'default' | 'destructive'
}) {
  return (
    <Card className={tone === 'destructive' ? 'border-destructive/50' : undefined}>
      <CardHeader>
        <CardTitle className={tone === 'destructive' ? 'text-destructive' : undefined}>{title}</CardTitle>
      </CardHeader>
      <CardContent className={tone === 'destructive' ? 'text-destructive' : undefined}>
        {message}
      </CardContent>
    </Card>
  )
}

async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  const payload = (await response.json()) as {
    success?: boolean
    message?: string
    error?: string
    data?: T
  }

  if (!response.ok || payload.success === false) {
    throw new Error(payload.error ?? payload.message ?? `Request failed with ${response.status}`)
  }

  if (!payload.data) {
    throw new Error('Empty response payload')
  }

  return payload.data
}

function resolveDateRange(days: WindowOption): { startTime: string; endTime: string } {
  const end = new Date()
  const start = new Date(end.getTime() - (days - 1) * DAY_MS)

  return {
    startTime: start.toISOString(),
    endTime: end.toISOString(),
  }
}

function formatStaleness(deltaMins: number): string {
  if (deltaMins < 1) return 'just now'
  if (deltaMins < 60) return `${deltaMins} min ago`
  const hrs = Math.floor(deltaMins / 60)
  return hrs === 1 ? '1 hr ago' : `${hrs} hrs ago`
}

function StalenessLabel({
  lastSyncedAt,
  isLoading,
}: {
  lastSyncedAt: string | null
  isLoading: boolean
}) {
  if (isLoading) {
    return <span className="text-xs text-muted-foreground">Syncing…</span>
  }

  if (!lastSyncedAt) {
    return <span className="text-xs text-muted-foreground">Not yet synced</span>
  }

  const deltaMins = Math.floor((Date.now() - new Date(lastSyncedAt).getTime()) / 60_000)
  const label = formatStaleness(deltaMins)

  if (deltaMins > 30) {
    return (
      <Badge variant="destructive" className="text-xs">
        {label}
      </Badge>
    )
  }

  if (deltaMins > 10) {
    return (
      <Badge variant="secondary" className="border-amber-200 bg-amber-100 text-xs text-amber-800">
        {label}
      </Badge>
    )
  }

  return <span className="text-xs text-muted-foreground">{label}</span>
}
