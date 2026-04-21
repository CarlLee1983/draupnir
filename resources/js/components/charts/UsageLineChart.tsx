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
import { useTranslation } from '@/lib/i18n'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { EmptyChart } from './EmptyChart'

export interface UsageDataPoint {
  date: string
  requests: number
  tokens: number
}

interface UsageLineChartProps {
  data: UsageDataPoint[]
  /** 未傳入時使用 `ui.member.usage.trendTitle`；傳入空字串則不顯示標題文字。 */
  title?: string
  /** 未傳入時使用 `ui.member.usage.empty`。 */
  emptyMessage?: string
  isAnimationActive?: boolean
}

export function UsageLineChart({
  data,
  title,
  emptyMessage,
  isAnimationActive = true,
}: UsageLineChartProps) {
  const { t } = useTranslation()
  const resolvedTitle =
    title === undefined ? t('ui.member.usage.trendTitle') : title
  const resolvedEmpty =
    emptyMessage === undefined ? t('ui.member.usage.empty') : emptyMessage

  if (data.length === 0) {
    return <EmptyChart title={resolvedTitle} message={resolvedEmpty} />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{resolvedTitle}</CardTitle>
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
              name={t('ui.charts.usageLine.legendRequests')}
              stroke="hsl(222.2 47.4% 11.2%)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={isAnimationActive}
            />
            <Line
              type="monotone"
              dataKey="tokens"
              name={t('ui.charts.usageLine.legendTokens')}
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
