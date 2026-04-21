import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCredit, formatNumber } from '@/lib/format'
import { useTranslation } from '@/lib/i18n'

export interface ModelRow {
  model: string
  provider: string | null
  totalCost: number
  totalRequests: number
  avgLatencyMs: number
}

interface Props {
  rows: readonly ModelRow[]
  className?: string
}

const DONUT_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a855f7', '#ec4899', '#14b8a6', '#f97316']

export function ModelDistributionDonut({ rows, className }: Props) {
  const { t } = useTranslation()

  if (rows.length === 0) {
    return (
      <div className={className}>
        <div className="flex min-h-[240px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          {t('ui.charts.modelDistribution.empty')}
        </div>
      </div>
    )
  }

  const top8 = rows.slice(0, 8)
  const rest = rows.slice(8)
  const restCost = rest.reduce((sum, row) => sum + row.totalCost, 0)
  const otherLabel = t('ui.charts.modelDistribution.other')
  const chartData = [
    ...top8.map((row) => ({ name: row.model, value: row.totalCost })),
    ...(rest.length > 0 && restCost > 0 ? [{ name: otherLabel, value: restCost }] : []),
  ]
  const totalCost = rows.reduce((sum, row) => sum + row.totalCost, 0)

  return (
    <div className={className}>
      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <Card className="md:w-1/2">
          <CardHeader>
            <CardTitle className="text-base">{t('ui.charts.modelDistribution.costDistributionTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={entry.name} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<DonutTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-lg font-semibold">{formatCredit(totalCost)}</div>
                  <div className="text-xs text-muted-foreground">{t('ui.charts.modelDistribution.totalCost')}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:w-1/2">
          <CardHeader>
            <CardTitle className="text-base">{t('ui.charts.modelDistribution.modelBreakdownTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('ui.charts.modelDistribution.colModel')}</TableHead>
                  <TableHead>{t('ui.charts.modelDistribution.colCost')}</TableHead>
                  <TableHead>{t('ui.charts.modelDistribution.colRequests')}</TableHead>
                  <TableHead>{t('ui.charts.modelDistribution.colShare')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {top8.map((row) => (
                  <TableRow key={row.model}>
                    <TableCell className="font-medium">{row.model}</TableCell>
                    <TableCell>{formatCredit(row.totalCost)}</TableCell>
                    <TableCell>{formatNumber(row.totalRequests)}</TableCell>
                    <TableCell>{totalCost > 0 ? `${((row.totalCost / totalCost) * 100).toFixed(1)}%` : '0.0%'}</TableCell>
                  </TableRow>
                ))}
                {rest.length > 0 && restCost > 0 ? (
                  <TableRow key="other">
                    <TableCell className="font-medium">{otherLabel}</TableCell>
                    <TableCell>{formatCredit(restCost)}</TableCell>
                    <TableCell>{formatNumber(rest.reduce((sum, row) => sum + row.totalRequests, 0))}</TableCell>
                    <TableCell>{totalCost > 0 ? `${((restCost / totalCost) * 100).toFixed(1)}%` : '0.0%'}</TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function DonutTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: readonly { name?: string; value?: number }[]
}) {
  const { t } = useTranslation()
  if (!active || !payload?.length) return null

  const entry = payload[0]

  return (
    <div className="rounded-lg border bg-background/95 px-3 py-2 text-sm shadow-lg backdrop-blur">
      <div className="font-medium">{entry?.name}</div>
      <div className="text-muted-foreground">
        {t('ui.charts.modelDistribution.tooltipCost', { value: formatCredit(entry?.value ?? 0) })}
      </div>
    </div>
  )
}
