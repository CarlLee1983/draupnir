import React from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCredit, formatNumber } from '@/lib/format'
import { EmptyChart } from './EmptyChart'
import { useTranslation } from '@/lib/i18n'

export interface ModelCostPoint {
  model: string
  provider: string | null
  totalCost: number
  totalRequests: number
  avgLatencyMs: number
}

interface Props {
  data: readonly ModelCostPoint[]
  title?: string
}

export const ModelCostBarChart = React.memo(({ data, title }: Props) => {
  const { t } = useTranslation()
  const resolvedTitle = title ?? t('ui.member.dashboard.chartModelCost')
  if (data.length === 0) {
    return <EmptyChart title={resolvedTitle} message={t('ui.charts.modelCost.empty')} />
  }

  return (
    <Card className="overflow-hidden border-border rounded-lg shadow-indigo-500/5 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">{resolvedTitle}</CardTitle>
        <CardDescription>{t('ui.charts.modelCost.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={1} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.8} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="model"
              tickLine={false}
              axisLine={false}
              interval={0}
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
            <Tooltip content={<ModelCostTooltip />} cursor={{ fill: '#ffffff', opacity: 0.05 }} />
            <Bar dataKey="totalCost" name={t('ui.charts.modelCost.seriesName')} fill="url(#barGradient)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
})

ModelCostBarChart.displayName = 'ModelCostBarChart'

const ModelCostTooltip = React.memo(
  ({
    active,
    payload,
    label,
  }: {
    active?: boolean
    payload?: readonly { value?: number; payload?: { totalRequests?: number } }[]
    label?: string
  }) => {
    const { t } = useTranslation()
    if (!active || !payload?.length) return null

    return (
      <div className="rounded-none border border-border bg-background/80 px-3 py-2 text-sm shadow-xl backdrop-blur-md">
        <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">{t('ui.charts.modelCost.tooltipCost')}</span>
          <span className="font-medium text-white">{formatCredit(payload[0]?.value ?? 0)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">{t('ui.charts.modelCost.tooltipRequests')}</span>
          <span className="font-medium text-white">{formatNumber(payload[0]?.payload?.totalRequests ?? 0)}</span>
        </div>
      </div>
    )
  },
)

ModelCostTooltip.displayName = 'ModelCostTooltip'

export type { ModelCostPoint as ModelCostDataPoint }
