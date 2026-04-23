import type { ReactNode } from 'react'
import React from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts'
import { formatDate, formatDateInTimeZone, formatNumber } from '@/lib/format'
import { useTranslation } from '@/lib/i18n'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { EmptyChart } from './EmptyChart'
import { AlertCircle } from 'lucide-react'

export interface UsageDataPoint {
  date: string
  requests: number
  tokens: number
}

interface UsageLineChartProps {
  data: UsageDataPoint[]
  /** 未傳入時使用 `ui.member.usage.trendTitle`；傳入空字串則不顯示標題文字。 */
  title?: string
  /** 描述文字 */
  description?: string
  /** 未傳入時使用 `ui.member.usage.empty`。 */
  emptyMessage?: string
  /** 標題列右側（例：天數切換） */
  headerRight?: ReactNode
  timeZone?: string
  isAnimationActive?: boolean
  isDemo?: boolean
}

export function UsageLineChart({
  data,
  title,
  description,
  emptyMessage,
  headerRight,
  timeZone,
  isAnimationActive = true,
  isDemo = false,
}: UsageLineChartProps) {
  const { t } = useTranslation()
  const resolvedTitle = title === undefined ? t('ui.member.usage.trendTitle') : title
  const resolvedEmpty = emptyMessage === undefined ? t('ui.member.usage.empty') : emptyMessage

  const formatLabel = (value: string): string =>
    timeZone ? formatDateInTimeZone(value, timeZone) : formatDate(value)

  if (data.length === 0 && !isDemo) {
    return (
      <EmptyChart
        title={resolvedTitle}
        message={resolvedEmpty}
        headerRight={headerRight}
      />
    )
  }

  return (
    <Card className="overflow-hidden border-border rounded-lg shadow-indigo-500/5 shadow-sm">
      {isDemo && (
        <div className="bg-amber-50/50 border-b border-amber-100/50 px-4 py-2 flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-[11px] font-medium text-amber-800">
            {t('ui.charts.demoBanner')}
          </span>
        </div>
      )}
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-bold tracking-tight">{resolvedTitle}</CardTitle>
            {isDemo && (
              <span className="px-1.5 py-0.5 rounded border border-border bg-muted text-[10px] font-mono font-medium text-muted-foreground uppercase tracking-wider leading-none">
                {t('ui.charts.demoBadge')}
              </span>
            )}
          </div>
          {description && <CardDescription className="text-xs mt-1">{description}</CardDescription>}
        </div>
        {headerRight}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="usageTokensFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="usageRequestsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--blue))" stopOpacity={0.1} />
                <stop offset="95%" stopColor="hsl(var(--blue))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'currentColor', fontSize: 10 }}
              tickFormatter={(v) => formatLabel(String(v))}
              className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
              dy={10}
            />
            <YAxis
              yAxisId="left"
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'currentColor', fontSize: 10 }}
              tickFormatter={(v) => formatNumber(v)}
              className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'currentColor', fontSize: 10 }}
              tickFormatter={(v) => formatNumber(v)}
              className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
            />
            <Tooltip content={<UsageTooltip timeZone={timeZone} />} />
            <Legend 
              verticalAlign="top" 
              align="right"
              iconType="circle"
              wrapperStyle={{ 
                paddingBottom: '20px', 
                fontSize: '10px', 
                textTransform: 'uppercase', 
                letterSpacing: '0.05em',
                fontFamily: 'var(--font-geist-mono)'
              }} 
            />
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="tokens"
              name={t('ui.charts.usageLine.legendTokens')}
              stroke="hsl(var(--primary))"
              fill="url(#usageTokensFill)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              isAnimationActive={isAnimationActive}
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="requests"
              name={t('ui.charts.usageLine.legendRequests')}
              stroke="hsl(var(--blue))"
              fill="url(#usageRequestsFill)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              isAnimationActive={isAnimationActive}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

const UsageTooltip = React.memo(
  ({
    active,
    payload,
    label,
    timeZone,
  }: {
    active?: boolean
    payload?: any[]
    label?: string
    timeZone?: string
  }) => {
    const { t } = useTranslation()
    if (!active || !payload?.length) return null

    const tokens = payload.find((entry) => entry.dataKey === 'tokens')?.value ?? 0
    const requests = payload.find((entry) => entry.dataKey === 'requests')?.value ?? 0

    const formatLabel = (value: string): string =>
      timeZone ? formatDateInTimeZone(value, timeZone) : formatDate(value)

    return (
      <div className="rounded-lg border border-border bg-background/90 px-3 py-2 text-sm shadow-xl backdrop-blur-md">
        <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-2 border-b border-border pb-1">
          {label ? formatLabel(label) : '—'}
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-8">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span className="text-[11px] text-muted-foreground uppercase tracking-tight">{t('ui.charts.usageLine.legendTokens')}</span>
            </div>
            <span className="font-mono font-medium text-foreground">{formatNumber(tokens)}</span>
          </div>
          <div className="flex items-center justify-between gap-8">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              <span className="text-[11px] text-muted-foreground uppercase tracking-tight">{t('ui.charts.usageLine.legendRequests')}</span>
            </div>
            <span className="font-mono font-medium text-foreground">{formatNumber(requests)}</span>
          </div>
        </div>
      </div>
    )
  },
)

UsageTooltip.displayName = 'UsageTooltip'
