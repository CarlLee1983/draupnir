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

export function TokenUsageAreaChart({ data, title = 'Token 用量' }: Props) {
  if (data.length === 0) {
    return <EmptyChart title={title} message="No token usage data for this window." />
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>Input / output token 趨勢</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="tokenInputFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(217 91% 60%)" stopOpacity={0.28} />
                <stop offset="95%" stopColor="hsl(217 91% 60%)" stopOpacity={0.04} />
              </linearGradient>
              <linearGradient id="tokenOutputFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(24 95% 53%)" stopOpacity={0.28} />
                <stop offset="95%" stopColor="hsl(24 95% 53%)" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/70" />
            <XAxis dataKey="date" tickLine={false} axisLine={false} className="text-xs" />
            <YAxis tickFormatter={(value) => formatNumber(Number(value))} tickLine={false} axisLine={false} className="text-xs" />
            <Tooltip content={<TokenTooltip />} />
            <Legend />
            <Area
              type="monotone"
              dataKey="totalInputTokens"
              name="Input Tokens"
              stackId="tokens"
              stroke="hsl(217 91% 60%)"
              fill="url(#tokenInputFill)"
              strokeWidth={2}
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="totalOutputTokens"
              name="Output Tokens"
              stackId="tokens"
              stroke="hsl(24 95% 53%)"
              fill="url(#tokenOutputFill)"
              strokeWidth={2}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

function EmptyChart({ title, message }: { title: string; message: string }) {
  return (
    <Card className="overflow-hidden border-dashed">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>Chart placeholder</CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-[300px] items-center justify-center text-sm text-muted-foreground">
        {message}
      </CardContent>
    </Card>
  )
}

function TokenTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: readonly { name?: string; value?: number }[]
  label?: string
}) {
  if (!active || !payload?.length) return null

  const input = payload.find((entry) => entry.name === 'Input Tokens')?.value ?? 0
  const output = payload.find((entry) => entry.name === 'Output Tokens')?.value ?? 0

  return (
    <div className="rounded-lg border bg-background/95 px-3 py-2 text-sm shadow-lg backdrop-blur">
      <div className="font-medium">{label ? formatDate(label) : '—'}</div>
      <div className="text-sky-600">Input {formatNumber(input)}</div>
      <div className="text-orange-600">Output {formatNumber(output)}</div>
    </div>
  )
}

export type { TokenUsagePoint as TokenUsageDataPoint }
