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
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'

export interface UsageDataPoint {
  date: string
  requests: number
  tokens: number
}

interface UsageLineChartProps {
  data: UsageDataPoint[]
  title?: string
  isAnimationActive?: boolean
}

export function UsageLineChart({ data, title = '用量趨勢', isAnimationActive = true }: UsageLineChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="date" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip />
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
