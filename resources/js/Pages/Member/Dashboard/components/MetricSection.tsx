import React from 'react'
import { CreditCard, Sparkles, BarChart3, Clock3 } from 'lucide-react'
import { MetricGrid } from './MetricGrid'
import { MetricCard } from './MetricCard'
import { formatCredit, formatNumber } from '@/lib/format'
import { useTranslation } from '@/lib/i18n'

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

interface Props {
  kpi: KpiPayload | null
}

function computeChange(current: number, previous: number): number | undefined {
  if (previous === 0) return undefined
  return ((current - previous) / previous) * 100
}

export const MetricSection = React.memo(({ kpi }: Props) => {
  const { t } = useTranslation()

  return (
    <MetricGrid>
      <MetricCard
        title={t('ui.member.dashboard.metricCost')}
        value={kpi ? formatCredit(kpi.usage.totalCost) : '—'}
        suffix="USD"
        icon={<CreditCard className="h-4 w-4" />}
        accentClassName="from-indigo-400 to-violet-500"
        changePercent={
          kpi
            ? computeChange(kpi.usage.totalCost, kpi.previousPeriod.totalCost)
            : undefined
        }
      />
      <MetricCard
        title={t('ui.member.dashboard.metricRequests')}
        value={kpi ? formatNumber(kpi.usage.totalRequests) : '—'}
        icon={<Sparkles className="h-4 w-4" />}
        accentClassName="from-sky-400 to-cyan-500"
        changePercent={
          kpi
            ? computeChange(kpi.usage.totalRequests, kpi.previousPeriod.totalRequests)
            : undefined
        }
      />
      <MetricCard
        title={t('ui.member.dashboard.metricTokens')}
        value={kpi ? formatNumber(kpi.usage.totalTokens) : '—'}
        icon={<BarChart3 className="h-4 w-4" />}
        accentClassName="from-cyan-400 to-sky-500"
        changePercent={
          kpi
            ? computeChange(kpi.usage.totalTokens, kpi.previousPeriod.totalTokens)
            : undefined
        }
      />
      <MetricCard
        title={t('ui.member.dashboard.metricLatency')}
        value={kpi ? `${formatNumber(kpi.usage.avgLatency)} ms` : '—'}
        icon={<Clock3 className="h-4 w-4" />}
        accentClassName="from-violet-400 to-fuchsia-500"
        changePercent={
          kpi
            ? computeChange(kpi.usage.avgLatency, kpi.previousPeriod.avgLatency)
            : undefined
        }
      />
    </MetricGrid>
  )
})

MetricSection.displayName = 'MetricSection'
