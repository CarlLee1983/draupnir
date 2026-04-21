import React from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCredit, formatDate } from '@/lib/format'
import { EmptyChart } from './EmptyChart'
import { useTranslation } from '@/lib/i18n'

export interface CostTrendPoint {
  date: string
  totalCost: number
  totalRequests: number
  totalInputTokens: number
  totalOutputTokens: number
}

interface Props {
  data: readonly CostTrendPoint[]
  title?: string
}

export const CostTrendAreaChart = React.memo(({ data, title }: Props) => {
  const { t } = useTranslation()
  const resolvedTitle = title ?? t('ui.member.dashboard.chartCost')
  if (data.length === 0) {
    return <EmptyChart title={resolvedTitle} message={t('ui.charts.costTrend.empty')} />
  }

  return (
    <Card className="overflow-hidden border-border rounded-lg shadow-indigo-500/5 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">{resolvedTitle}</CardTitle>
        <CardDescription>{t('ui.charts.costTrend.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="costTrendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.1} />
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'currentColor', fontSize: 10 }}
              className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
            />
            <YAxis
              tickFormatter={(value) => formatCredit(Number(value))}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'currentColor', fontSize: 10 }}
              className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
            />
            <Tooltip content={<TrendTooltip />} />
            <Area
              type="monotone"
              dataKey="totalCost"
              name={t('ui.charts.costTrend.seriesName')}
              stroke="var(--primary)"
              fill="url(#costTrendFill)"
              strokeWidth={2}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
})

CostTrendAreaChart.displayName = 'CostTrendAreaChart'

const TrendTooltip = React.memo(
  ({
    active,
    payload,
    label,
  }: {
    active?: boolean
    payload?: readonly { value?: number }[]
    label?: string
  }) => {
    const { t } = useTranslation()
    if (!active || !payload?.length) return null

    const point = payload[0]?.value ?? 0

    return (
      <div className="rounded-none border border-border bg-background/80 px-3 py-2 text-sm shadow-xl backdrop-blur-md">
        <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
          {label ? formatDate(label) : '—'}
        </div>
        <div className="font-medium text-white">
          {t('ui.charts.costTrend.tooltipCost', { value: formatCredit(point) })}
        </div>
      </div>
    )
  },
)

TrendTooltip.displayName = 'TrendTooltip'

export type { CostTrendPoint as CostTrendDataPoint }
