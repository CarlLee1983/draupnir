import { Head } from '@inertiajs/react'
import { Building2, Calendar } from 'lucide-react'
import { UsageLineChart } from '@/components/charts/UsageLineChart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCredit, formatDateTime, formatNumber } from '@/lib/format'

interface ReportSnapshot {
  orgId: string
  generatedAt: string
  reportType: 'weekly' | 'monthly'
  timezone: string
  summary: {
    totalRequests: number
    totalTokens: number
    totalCost: number
  }
  dailyTrend: {
    date: string
    requests: number
    tokens: number
  }[]
}

interface Props {
  report: ReportSnapshot
  isAnimationActive: boolean
  isPrinterFriendly: boolean
}

export default function ReportTemplate({ report, isAnimationActive }: Props) {
  const usageData = report.dailyTrend
  const title = report.reportType === 'monthly' ? 'Monthly Usage Trend' : 'Weekly Usage Trend'

  return (
    <div className="bg-white min-h-screen p-8 text-slate-900 print:p-0">
      <Head title={`Draupnir Report - ${report.orgId}`} />

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start border-b pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Draupnir</h1>
            <p className="text-slate-500 font-medium">Automated Cost & Usage Report</p>
            <p className="text-xs text-slate-400 mt-1">
              {report.reportType.toUpperCase()} · {report.timezone}
            </p>
          </div>
          <div className="text-right space-y-1">
            <div className="flex items-center justify-end text-sm text-slate-600">
              <Building2 className="mr-2 h-4 w-4" />
              <span className="font-semibold">{report.orgId}</span>
            </div>
            <div className="flex items-center justify-end text-xs text-slate-400">
              <Calendar className="mr-2 h-3 w-3" />
              {formatDateTime(report.generatedAt)}
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="shadow-none border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(report.summary.totalRequests)}</div>
              <p className="text-xs text-green-600 font-medium mt-1">Live snapshot</p>
            </CardContent>
          </Card>
          <Card className="shadow-none border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Tokens
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(report.summary.totalTokens)}</div>
              <p className="text-xs text-slate-500 mt-1">
                Avg.{' '}
                {report.summary.totalRequests > 0
                  ? Math.round(report.summary.totalTokens / report.summary.totalRequests)
                  : 0}{' '}
                tokens/req
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-none border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Estimated Cost
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCredit(report.summary.totalCost)}</div>
              <p className="text-xs text-red-600 font-medium mt-1">Live snapshot</p>
            </CardContent>
          </Card>
        </div>

        {/* Usage Chart */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800">{title}</h2>
          <div className="border rounded-xl p-4 bg-slate-50/50">
            <UsageLineChart
              data={usageData as any}
              title=""
              timeZone={report.timezone}
              isAnimationActive={isAnimationActive}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="pt-12 border-t mt-12 text-center text-xs text-slate-400">
          <p>© {new Date().getFullYear()} Draupnir AI Service Management. All rights reserved.</p>
          <p className="mt-1 italic">Generated automatically by Draupnir Reporting Engine</p>
        </div>
      </div>
    </div>
  )
}
