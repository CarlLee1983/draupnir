import { Head } from '@inertiajs/react'
import { MemberLayout } from '@/layouts/MemberLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UsageLineChart, type UsageDataPoint } from '@/components/charts/UsageLineChart'
import { formatNumber } from '@/lib/format'
import { Activity, Zap } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

interface UsageTotals {
  requests: number
  tokens: number
}

interface Props {
  orgId: string | null
  totals: UsageTotals
  chartData: UsageDataPoint[]
}

export default function MemberUsage({ totals, chartData }: Props) {
  const { t } = useTranslation()
  return (
    <MemberLayout>
      <Head title={t('ui.member.usage.title')} />

      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t('ui.member.usage.heading')}</h1>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('ui.member.usage.totalRequests')}</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(totals.requests)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('ui.member.usage.totalTokens')}</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(totals.tokens)}</div>
            </CardContent>
          </Card>
        </div>

        <UsageLineChart data={chartData} title={t('ui.member.usage.trendTitle')} />
      </div>
    </MemberLayout>
  )
}
