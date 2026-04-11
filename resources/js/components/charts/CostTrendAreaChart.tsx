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

export function CostTrendAreaChart({ data, title = '成本趨勢' }: Props) {
  if (data.length === 0) {
    return <EmptyChart title={title} message="No cost trend data for this window." />
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>每日 cached cost 變化</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="costTrendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(221 83% 53%)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="hsl(221 83% 53%)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/70" />
            <XAxis dataKey="date" tickLine={false} axisLine={false} className="text-xs" />
            <YAxis tickFormatter={(value) => formatCredit(Number(value))} tickLine={false} axisLine={false} className="text-xs" />
            <Tooltip content={<TrendTooltip />} />
            <Area
              type="monotone"
              dataKey="totalCost"
              name="成本"
              stroke="hsl(221 83% 53%)"
              fill="url(#costTrendFill)"
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

function TrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: readonly { value?: number }[]
  label?: string
}) {
  if (!active || !payload?.length) return null

  const point = payload[0]?.value ?? 0

  return (
    <div className="rounded-lg border bg-background/95 px-3 py-2 text-sm shadow-lg backdrop-blur">
      <div className="font-medium">{label ? formatDate(label) : '—'}</div>
      <div className="text-muted-foreground">成本 {formatCredit(point)}</div>
    </div>
  )
}

export type { CostTrendPoint as CostTrendDataPoint }
