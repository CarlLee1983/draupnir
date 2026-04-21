import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { formatDate } from '@/lib/format'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { EmptyChart } from './EmptyChart'

export interface UsageDataPoint {
  date: string
  requests: number
  tokens: number
}

interface UsageLineChartProps {
  data: UsageDataPoint[]
  title?: string
  emptyMessage?: string
  isAnimationActive?: boolean
}

export function UsageLineChart({
  data,
  title = '用量趨勢',
  emptyMessage = '此期間尚無用量資料。',
  isAnimationActive = true,
}: UsageLineChartProps) {
  if (data.length === 0) {
    return <EmptyChart title={title} message={emptyMessage} />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="date"
              className="text-xs"
              tickFormatter={(v) => formatDate(String(v))}
            />
            <YAxis className="text-xs" />
            <Tooltip labelFormatter={(v) => formatDate(String(v))} />
            <Legend />
            <Line
              type="monotone"
              dataKey="requests"
              name="請求數"
              stroke="hsl(222.2 47.4% 11.2%)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={isAnimationActive}
            />
            <Line
              type="monotone"
              dataKey="tokens"
              name="Token 用量"
              stroke="hsl(210 40% 60%)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={isAnimationActive}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
