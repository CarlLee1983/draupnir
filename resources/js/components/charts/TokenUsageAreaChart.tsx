import React from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate, formatNumber } from '@/lib/format'
import { EmptyChart } from './EmptyChart'

export interface TokenUsagePoint {
  date: string
  totalCost: number
  totalRequests: number
  totalInputTokens: number
  totalOutputTokens: number
}

interface Props {
  data: readonly TokenUsagePoint[]
  title?: string
}

export const TokenUsageAreaChart = React.memo(({ data, title = 'Token 用量' }: Props) => {
  if (data.length === 0) {
    return <EmptyChart title={title} message="No token usage data for this window." />
  }

  return (
    <Card className="overflow-hidden border-border rounded-lg shadow-indigo-500/5 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>Input / output token 趨勢</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="tokenInputFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--cyan)" stopOpacity={0.1} />
                <stop offset="95%" stopColor="var(--cyan)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="tokenOutputFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--blue)" stopOpacity={0.1} />
                <stop offset="95%" stopColor="var(--blue)" stopOpacity={0} />
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
              tickFormatter={(value) => formatNumber(Number(value))}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'currentColor', fontSize: 10 }}
              className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
            />
            <Tooltip content={<TokenTooltip />} />
            <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }} />
            <Area
              type="monotone"
              dataKey="totalInputTokens"
              name="Input Tokens"
              stackId="tokens"
              stroke="var(--cyan)"
              fill="url(#tokenInputFill)"
              strokeWidth={2}
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="totalOutputTokens"
              name="Output Tokens"
              stackId="tokens"
              stroke="var(--blue)"
              fill="url(#tokenOutputFill)"
              strokeWidth={2}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
})

TokenUsageAreaChart.displayName = 'TokenUsageAreaChart'

const TokenTooltip = React.memo(({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: readonly { name?: string; value?: number }[]
  label?: string
}) => {
  if (!active || !payload?.length) return null

  const input = payload.find((entry) => entry.name === 'Input Tokens')?.value ?? 0
  const output = payload.find((entry) => entry.name === 'Output Tokens')?.value ?? 0

  return (
    <div className="rounded-none border border-border bg-background/80 px-3 py-2 text-sm shadow-xl backdrop-blur-md">
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
        {label ? formatDate(label) : '—'}
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground">Input</span>
        <span className="font-medium text-white">{formatNumber(input)}</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground">Output</span>
        <span className="font-medium text-white">{formatNumber(output)}</span>
      </div>
    </div>
  )
})

TokenTooltip.displayName = 'TokenTooltip'


export type { TokenUsagePoint as TokenUsageDataPoint }
