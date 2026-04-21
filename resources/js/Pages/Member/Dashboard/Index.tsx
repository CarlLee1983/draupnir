import { useEffect, useState } from 'react'
import { Head } from '@inertiajs/react'
import { CreateOrganizationModal } from './components/CreateOrganizationModal'
import { InvitationCard, type PendingInvitation } from './components/InvitationCard'
import { DashboardHeader, type WindowOption } from './components/DashboardHeader'
import { MetricSection } from './components/MetricSection'
import { BalanceCard } from './components/BalanceCard'
import { QuickActionsCard } from './components/QuickActionsCard'
import { MemberLayout } from '@/layouts/MemberLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CostTrendAreaChart, type CostTrendPoint } from '@/components/charts/CostTrendAreaChart'
import { ModelCostBarChart, type ModelCostPoint } from '@/components/charts/ModelCostBarChart'
import { TokenUsageAreaChart, type TokenUsagePoint } from '@/components/charts/TokenUsageAreaChart'
import {
  ModelComparisonTable,
  type ModelComparisonRow,
} from '@/components/charts/ModelComparisonTable'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, AlertTriangle } from 'lucide-react'
import type { I18nMessage } from '@/lib/i18n'
import { useTranslation } from '@/lib/i18n'
import { fetchJson } from '@/lib/api'

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
  hasOrganization: boolean
  pendingInvitations: PendingInvitation[]
  error: I18nMessage | null
}

const DAY_MS = 24 * 60 * 60 * 1000

export default function MemberDashboard({ orgId, balance, hasOrganization, pendingInvitations, error }: Props) {
  const { t } = useTranslation()
  const [selectedWindow, setSelectedWindow] = useState<WindowOption>(30)
  const [bundle, setBundle] = useState<DashboardBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [createOrgOpen, setCreateOrgOpen] = useState(false)
  const [invitations, setInvitations] = useState<PendingInvitation[]>(pendingInvitations)

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

      <div className="space-y-8 pb-12">
        {!hasOrganization ? (
          <>
            <CreateOrganizationModal open={createOrgOpen} onOpenChange={setCreateOrgOpen} />

            {invitations.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm text-white/60">你有待處理的組織邀請：</p>
                {invitations.map((inv) => (
                  <InvitationCard
                    key={inv.id}
                    invitation={inv}
                    onDeclined={(id) => setInvitations((prev) => prev.filter((i) => i.id !== id))}
                  />
                ))}
              </div>
            )}

            {invitations.length === 0 && (
              <Card className="border-border rounded-lg bg-white/[0.02] shadow-indigo-500/5 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base text-white">尚無組織</CardTitle>
                  <CardDescription className="text-white/40">
                    建立組織以開始使用 API Key、帳單與儀表板功能
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    type="button"
                    onClick={() => setCreateOrgOpen(true)}
                    className="bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                  >
                    建立我的組織
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        ) : null}

        <DashboardHeader 
          selectedWindow={selectedWindow} 
          onWindowChange={setSelectedWindow} 
          lastSyncedAt={bundle?.kpi.lastSyncedAt ?? null} 
          loading={loading} 
        />

        {error && (
          <Alert variant={error.key.endsWith('.selectOrg') ? 'warning' : 'destructive'}>
            {error.key.endsWith('.selectOrg') ? (
              <AlertTriangle className="size-4" />
            ) : (
              <AlertCircle className="size-4" />
            )}
            <AlertTitle>Organization</AlertTitle>
            <AlertDescription>{t(error.key, error.params)}</AlertDescription>
          </Alert>
        )}
        {fetchError && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Analytics</AlertTitle>
            <AlertDescription>{fetchError}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 lg:grid-cols-[1fr_auto] print:hidden">
          <BalanceCard balance={balance} />
          <QuickActionsCard orgId={orgId} />
        </div>

        {loading ? (
          <LoadingState />
        ) : (
          <>
            {!showEmptyState && <MetricSection kpi={bundle?.kpi ?? null} />}

            <section className="space-y-4">
              {showEmptyState ? (
                <EmptyStateCard />
              ) : hasUsageRows ? (
                <div className="grid gap-6 xl:grid-cols-2">
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

function LoadingState() {
  const { t } = useTranslation()
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={`metric-skeleton-${index}`} className="relative bg-white/[0.03] border border-border rounded-lg p-6 backdrop-blur-md shadow-indigo-500/5 shadow-sm">
            <div className="flex flex-row items-center justify-between space-y-0 pb-3">
              <Skeleton className="h-3 w-20 bg-white/5" />
              <Skeleton className="h-4 w-4 rounded bg-white/5" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-8 w-32 bg-white/5" />
              <Skeleton className="h-3 w-12 bg-white/5" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
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
    <Card className={cn("bg-white/[0.02] border-border rounded-lg shadow-indigo-500/5 shadow-sm", className)}>
      <CardHeader>
        <CardTitle className="text-base text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-[300px] w-full rounded-xl bg-white/5" />
      </CardContent>
    </Card>
  )
}

function EmptyStateCard() {
  const { t } = useTranslation()
  return (
    <Card className="border-dashed bg-white/[0.02] border-border rounded-lg shadow-none">
      <CardHeader>
        <CardTitle className="text-base text-white">{t('ui.member.dashboard.emptyTitle')}</CardTitle>
        <CardDescription className="text-white/40">
          {t('ui.member.dashboard.emptyDescription')}
        </CardDescription>
      </CardHeader>
    </Card>
  )
}

function resolveDateRange(days: WindowOption): { startTime: string; endTime: string } {
  const end = new Date()
  const start = new Date(end.getTime() - (days - 1) * DAY_MS)

  return {
    startTime: start.toISOString(),
    endTime: end.toISOString(),
  }
}
