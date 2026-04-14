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
import type { I18nMessage } from '@/lib/i18n'
import { useTranslation } from '@/lib/i18n'

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
  previousPeriod: KpiUsage
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
  error: I18nMessage | null
}

const WINDOW_OPTIONS: readonly { value: WindowOption; label: string }[] = [
  { value: 7, label: '7d' },
  { value: 30, label: '30d' },
  { value: 90, label: '90d' },
]

const DAY_MS = 24 * 60 * 60 * 1000

export default function MemberDashboard({ orgId, balance, error }: Props) {
  const { t } = useTranslation()
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
      <Head title={t('ui.member.dashboard.title')} />

      <div className="space-y-8">
        <header className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
                {t('ui.member.dashboard.subtitle')}
              </p>
              <h1 className="text-3xl font-semibold tracking-tight">{t('ui.member.dashboard.title')}</h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                {t('ui.member.dashboard.description')}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <WindowSelector value={selectedWindow} onChange={setSelectedWindow} />
              <div className="flex items-center gap-2">
                <StalenessLabel lastSyncedAt={bundle?.kpi.lastSyncedAt ?? null} isLoading={loading} />
                <Button variant="outline" size="sm" className="print:hidden" onClick={() => window.print()}>
                  {t('ui.member.dashboard.downloadReport')}
                </Button>
              </div>
            </div>
          </div>
        </header>

        {error && <InfoCard tone="destructive" title="Organization" message={t(error.key, error.params)} />}
        {fetchError && <InfoCard tone="destructive" title="Analytics" message={fetchError} />}

        <div className="grid gap-4 lg:grid-cols-[1fr_auto] print:hidden">
          <BalanceCard balance={balance} />
          <QuickActionsCard orgId={orgId} />
        </div>

        {loading ? (
          <LoadingState />
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                title={t('ui.member.dashboard.metricCost')}
                value={bundle ? formatCredit(bundle.kpi.usage.totalCost) : '—'}
                suffix="USD"
                icon={<CreditCard className="h-4 w-4" />}
                accentClassName="from-emerald-400 to-teal-500"
                changePercent={
                  bundle
                    ? computeChange(bundle.kpi.usage.totalCost, bundle.kpi.previousPeriod.totalCost)
                    : undefined
                }
              />
              <MetricCard
                title={t('ui.member.dashboard.metricRequests')}
                value={bundle ? formatNumber(bundle.kpi.usage.totalRequests) : '—'}
                icon={<Sparkles className="h-4 w-4" />}
                accentClassName="from-sky-400 to-cyan-500"
                changePercent={
                  bundle
                    ? computeChange(bundle.kpi.usage.totalRequests, bundle.kpi.previousPeriod.totalRequests)
                    : undefined
                }
              />
              <MetricCard
                title={t('ui.member.dashboard.metricTokens')}
                value={bundle ? formatNumber(bundle.kpi.usage.totalTokens) : '—'}
                icon={<BarChart3 className="h-4 w-4" />}
                accentClassName="from-orange-400 to-amber-500"
                changePercent={
                  bundle
                    ? computeChange(bundle.kpi.usage.totalTokens, bundle.kpi.previousPeriod.totalTokens)
                    : undefined
                }
              />
              <MetricCard
                title={t('ui.member.dashboard.metricLatency')}
                value={bundle ? `${formatNumber(bundle.kpi.usage.avgLatency)} ms` : '—'}
                icon={<Clock3 className="h-4 w-4" />}
                accentClassName="from-violet-400 to-fuchsia-500"
                changePercent={
                  bundle
                    ? computeChange(bundle.kpi.usage.avgLatency, bundle.kpi.previousPeriod.avgLatency)
                    : undefined
                }
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
  changePercent,
}: {
  title: string
  value: string
  suffix?: string
  icon: ReactNode
  accentClassName: string
  changePercent?: number
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
        {changePercent !== undefined ? renderChangeBadge(changePercent) : null}
      </CardContent>
    </Card>
  )
}

function BalanceCard({ balance }: { balance: Balance | null }) {
  const { t } = useTranslation()
  const isLow = balance
    ? Number.parseFloat(balance.balance) < Number.parseFloat(balance.lowBalanceThreshold)
    : false

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">{t('ui.member.dashboard.balanceTitle')}</CardTitle>
          <CardDescription>{t('ui.member.dashboard.balanceDescription')}</CardDescription>
        </div>
        <Wallet className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="flex items-center gap-3">
        <div className="text-2xl font-semibold">
          {balance ? formatCredit(balance.balance) : '—'}
        </div>
        {balance && isLow ? <Badge variant="destructive">{t('ui.member.dashboard.lowBalance')}</Badge> : null}
      </CardContent>
    </Card>
  )
}

function QuickActionsCard({ orgId }: { orgId?: string | null }) {
  const { t } = useTranslation()
  const keysQuery = orgId ? `?orgId=${encodeURIComponent(orgId)}` : ''

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">{t('ui.member.dashboard.quickActionsTitle')}</CardTitle>
          <CardDescription>{t('ui.member.dashboard.quickActionsDescription')}</CardDescription>
        </div>
        <RefreshCcw className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <a
          href={`/member/api-keys/create${keysQuery}`}
          className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {t('ui.member.dashboard.createApiKey')}
        </a>
        <a
          href={`/member/usage${keysQuery}`}
          className="inline-flex h-9 items-center rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          {t('ui.member.dashboard.viewUsage')}
        </a>
      </CardContent>
    </Card>
  )
}

function LoadingState() {
  const { t } = useTranslation()
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
        <ChartSkeleton title={t('ui.member.dashboard.chartCost')} />
        <ChartSkeleton title={t('ui.member.dashboard.chartTokens')} />
        <ChartSkeleton title={t('ui.member.dashboard.chartModelCost')} />
        <ChartSkeleton title={t('ui.member.dashboard.chartModelComp')} className="xl:col-span-2" />
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
  const { t } = useTranslation()
  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="text-base">{t('ui.member.dashboard.emptyTitle')}</CardTitle>
        <CardDescription>
          {t('ui.member.dashboard.emptyDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {t('ui.member.dashboard.emptyDescription')}
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

function computeChange(current: number, previous: number): number | undefined {
  if (previous === 0) return undefined
  return ((current - previous) / previous) * 100
}

function renderChangeBadge(changePercent: number): ReactNode {
  if (changePercent === 0) {
    return (
      <Badge variant="secondary" className="mt-1 text-xs">
        0%
      </Badge>
    )
  }
  const formatted = changePercent > 0 ? `+${changePercent.toFixed(1)}%` : `${changePercent.toFixed(1)}%`
  return (
    <Badge
      variant={changePercent > 0 ? 'outline' : 'destructive'}
      className={
        changePercent > 0 ? 'mt-1 text-xs bg-emerald-100 text-emerald-800 border-emerald-200' : 'mt-1 text-xs'
      }
    >
      {formatted}
    </Badge>
  )
}
