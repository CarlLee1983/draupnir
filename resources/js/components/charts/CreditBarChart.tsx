import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslation } from '@/lib/i18n'

export interface CreditDataPoint {
  period: string
  topup: number
  consumed: number
}

interface CreditBarChartProps {
  data: CreditDataPoint[]
  title?: string
}

export function CreditBarChart({ data, title }: CreditBarChartProps) {
  const { t } = useTranslation()
  const resolvedTitle = title ?? t('ui.charts.credit.defaultTitle')
  return (
    <Card>
      <CardHeader>
        <CardTitle>{resolvedTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="period" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip />
            <Bar dataKey="topup" name={t('ui.charts.credit.topup')} fill="hsl(142 71% 45%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="consumed" name={t('ui.charts.credit.consumed')} fill="hsl(0 84% 60%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
