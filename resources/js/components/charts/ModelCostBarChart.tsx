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

export function ModelCostBarChart({ data, title = '模型成本' }: Props) {
  if (data.length === 0) {
    return <EmptyChart title={title} message="No model cost data for this window." />
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>Top 10 models by cached cost</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/70" />
            <XAxis dataKey="model" tickLine={false} axisLine={false} className="text-xs" interval={0} />
            <YAxis tickFormatter={(value) => formatCredit(Number(value))} tickLine={false} axisLine={false} className="text-xs" />
            <Tooltip content={<ModelCostTooltip />} />
            <Bar dataKey="totalCost" name="成本" fill="hsl(222.2 47.4% 11.2%)" radius={[6, 6, 0, 0]} />
          </BarChart>
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

function ModelCostTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: readonly { value?: number; payload?: { totalRequests?: number } }[]
  label?: string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-lg border bg-background/95 px-3 py-2 text-sm shadow-lg backdrop-blur">
      <div className="font-medium">{label}</div>
      <div className="text-muted-foreground">Cost {formatCredit(payload[0]?.value ?? 0)}</div>
      <div className="text-muted-foreground">Requests {formatNumber(payload[0]?.payload?.totalRequests ?? 0)}</div>
    </div>
  )
}

export type { ModelCostPoint as ModelCostDataPoint }
