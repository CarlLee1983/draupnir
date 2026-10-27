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
    <Card className="glass-card overflow-hidden">
      <CardHeader className="border-b bg-muted/30 pb-4">
        <CardTitle className="text-lg font-heading tracking-tight flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted/30" />
            <XAxis 
              dataKey="date" 
              className="text-[10px] font-medium text-muted-foreground" 
              axisLine={false}
              tickLine={false}
              dy={10}
            />
            <YAxis 
              className="text-[10px] font-medium text-muted-foreground" 
              axisLine={false}
              tickLine={false}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.8)', 
                backdropFilter: 'blur(8px)',
                borderRadius: '12px',
                border: '1px solid rgba(0, 0, 0, 0.05)',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Legend 
              verticalAlign="top" 
              align="right" 
              iconType="circle"
              wrapperStyle={{ paddingBottom: '20px', fontSize: '12px', fontWeight: 500 }}
            />
            <Line
              type="monotone"
              dataKey="requests"
              name="請求數"
              stroke="#4F46E5"
              strokeWidth={3}
              dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
              activeDot={{ r: 6, strokeWidth: 0 }}
              isAnimationActive={isAnimationActive}
            />
            <Line
              type="monotone"
              dataKey="tokens"
              name="Token 用量"
              stroke="#06B6D4"
              strokeWidth={3}
              dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
              activeDot={{ r: 6, strokeWidth: 0 }}
              isAnimationActive={isAnimationActive}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
