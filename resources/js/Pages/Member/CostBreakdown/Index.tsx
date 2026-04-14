import { useEffect, useState } from 'react'
import { Head } from '@inertiajs/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { MemberLayout } from '@/layouts/MemberLayout'
import { cn } from '@/lib/utils'
import type { I18nMessage } from '@/lib/i18n'
import { useTranslation } from '@/lib/i18n'
import {
  PerKeyCostTable,
  type PerKeyCostGrandTotal,
  type PerKeyCostRow,
} from '@/components/charts/PerKeyCostTable'
import {
  ModelDistributionDonut,
  type ModelRow,
} from '@/components/charts/ModelDistributionDonut'

type WindowOption = 7 | 30 | 90

interface PerKeyCostData {
  rows: readonly PerKeyCostRow[]
  grandTotal: PerKeyCostGrandTotal
}

interface Props {
  orgId?: string | null
  error: I18nMessage | null
}

const WINDOW_OPTIONS: readonly { value: WindowOption; label: string }[] = [
  { value: 7, label: '7d' },
  { value: 30, label: '30d' },
  { value: 90, label: '90d' },
]

const DAY_MS = 24 * 60 * 60 * 1000

export default function CostBreakdown({ orgId, error }: Props) {
  const { t } = useTranslation()
  const [selectedWindow, setSelectedWindow] = useState<WindowOption>(30)
  const [perKeyData, setPerKeyData] = useState<PerKeyCostData | null>(null)
  const [modelRows, setModelRows] = useState<readonly ModelRow[]>([])
  const [perKeyLoading, setPerKeyLoading] = useState(true)
  const [modelLoading, setModelLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    if (!orgId) {
      setPerKeyData(null)
      setModelRows([])
      setPerKeyLoading(false)
      setModelLoading(false)
      setFetchError(null)
      return
    }

    const controller = new AbortController()
    setPerKeyLoading(true)
    setFetchError(null)
    const { startTime, endTime } = resolveDateRange(selectedWindow)
    const query = new URLSearchParams({
      start_time: startTime,
      end_time: endTime,
    })

    async function loadPerKeyCost(): Promise<void> {
      try {
        const response = await fetch(
          `/api/organizations/${encodeURIComponent(orgId)}/dashboard/per-key-cost?${query.toString()}`,
          { signal: controller.signal },
        )
        const payload = (await response.json()) as {
          success?: boolean
          message?: string
          data?: PerKeyCostData
        }
        if (!payload.success) {
          throw new Error(payload.message ?? 'Failed to load cost breakdown')
        }
        setPerKeyData(payload.data ?? null)
      } catch (error_) {
        if (controller.signal.aborted) return
        const message = error_ instanceof Error ? error_.message : 'Failed to load cost breakdown'
        setFetchError(message)
        setPerKeyData(null)
      } finally {
        if (!controller.signal.aborted) {
          setPerKeyLoading(false)
        }
      }
    }

    void loadPerKeyCost()

    return () => controller.abort()
  }, [orgId, selectedWindow])

  useEffect(() => {
    if (!orgId) {
      setModelRows([])
      setModelLoading(false)
      return
    }

    const controller = new AbortController()
    setModelLoading(true)
    const { startTime, endTime } = resolveDateRange(selectedWindow)
    const query = new URLSearchParams({
      start_time: startTime,
      end_time: endTime,
    })

    async function loadModelDistribution(): Promise<void> {
      try {
        const response = await fetch(
          `/api/organizations/${encodeURIComponent(orgId)}/dashboard/model-comparison?${query.toString()}`,
          { signal: controller.signal },
        )
        const payload = (await response.json()) as {
          success?: boolean
          message?: string
          data?: { rows?: readonly ModelRow[] }
        }
        if (!payload.success) {
          throw new Error(payload.message ?? 'Failed to load model distribution')
        }
        setModelRows(payload.data?.rows ?? [])
      } catch (error_) {
        if (controller.signal.aborted) return
        const message = error_ instanceof Error ? error_.message : 'Failed to load model distribution'
        setFetchError(message)
        setModelRows([])
      } finally {
        if (!controller.signal.aborted) {
          setModelLoading(false)
        }
      }
    }

    void loadModelDistribution()

    return () => controller.abort()
  }, [orgId, selectedWindow])

  const loading = perKeyLoading || modelLoading

  return (
    <MemberLayout>
      <Head title={t('ui.member.costBreakdown.title')} />
      <style>{`
        @media print {
          body {
            background: white !important;
          }

          .print-surface {
            background: white !important;
            box-shadow: none !important;
          }

          .print-surface * {
            box-shadow: none !important;
          }

          .print-page-break {
            break-inside: avoid;
          }
        }
      `}</style>

      <div className="print-surface flex min-h-screen flex-col gap-6 p-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between print:hidden">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Member Analytics
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">成本分析</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              以 7 / 30 / 90 天時間窗查看 per-key 成本、效率指標與模型分布。
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <WindowSelector value={selectedWindow} onChange={setSelectedWindow} />
            <Button variant="outline" size="sm" className="print:hidden" onClick={() => window.print()}>
              Download Report
            </Button>
          </div>
        </header>

        <div className="hidden print:block">
          <h1 className="text-3xl font-semibold tracking-tight">成本分析報告</h1>
          <p className="text-sm text-muted-foreground">
            Generated: {new Date().toLocaleDateString('zh-TW')}
          </p>
        </div>

        {error ? <InfoBanner title="Organization" message={t(error.key, error.params)} /> : null}
        {fetchError ? <InfoBanner title="Analytics" message={fetchError} /> : null}

        {!orgId ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            請選擇一個組織以查看成本分析。
          </div>
        ) : (
          <>
            <Card className="print-page-break">
              <CardHeader>
                <CardTitle className="text-base">Per-Key Cost Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-64 w-full" />
                ) : perKeyData ? (
                  <PerKeyCostTable
                    rows={perKeyData.rows}
                    grandTotal={perKeyData.grandTotal}
                    orgId={orgId}
                    selectedWindow={selectedWindow}
                  />
                ) : (
                  <div className="flex min-h-[240px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                    No cost data available for this period.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="print-page-break">
              <CardHeader>
                <CardTitle className="text-base">模型分佈</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-72 w-full" /> : <ModelDistributionDonut rows={modelRows} />}
              </CardContent>
            </Card>
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
            className={cn('min-w-16 rounded-lg px-4 transition-all', active ? 'shadow-sm' : 'text-muted-foreground')}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Button>
        )
      })}
    </div>
  )
}

function InfoBanner({ title, message }: { title: string; message: string }) {
  return (
    <Card className="border-destructive/40 bg-destructive/5">
      <CardHeader>
        <CardTitle className="text-base text-destructive">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-destructive">{message}</CardContent>
    </Card>
  )
}

function resolveDateRange(window: WindowOption): { startTime: string; endTime: string } {
  const endTime = new Date().toISOString()
  const startTime = new Date(Date.now() - (window - 1) * DAY_MS).toISOString()
  return { startTime, endTime }
}
