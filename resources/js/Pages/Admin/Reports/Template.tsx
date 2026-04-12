import { Head } from '@inertiajs/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UsageLineChart } from '@/components/charts/UsageLineChart'
import { Building2, Calendar, Clock, Globe } from 'lucide-react'
import { formatNumber } from '@/lib/format'

interface Props {
  orgId: string
  isAnimationActive: boolean
  isPrinterFriendly: boolean
  generatedAt: string
}

export default function ReportTemplate({ orgId, isAnimationActive, generatedAt }: Props) {
  const sampleUsageData = [
    { date: 'Mon', requests: 120, tokens: 45000 },
    { date: 'Tue', requests: 150, tokens: 52000 },
    { date: 'Wed', requests: 198, tokens: 38000 },
    { date: 'Thu', requests: 200, tokens: 71000 },
    { date: 'Fri', requests: 175, tokens: 63000 },
    { date: 'Sat', requests: 80, tokens: 21000 },
    { date: 'Sun', requests: 95, tokens: 25000 },
  ]

  return (
    <div className="bg-white min-h-screen p-8 text-slate-900 print:p-0">
      <Head title={`Draupnir Report - ${orgId}`} />

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start border-b pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Draupnir</h1>
            <p className="text-slate-500 font-medium">Automated Cost & Usage Report</p>
          </div>
          <div className="text-right space-y-1">
            <div className="flex items-center justify-end text-sm text-slate-600">
              <Building2 className="mr-2 h-4 w-4" />
              <span className="font-semibold">{orgId}</span>
            </div>
            <div className="flex items-center justify-end text-xs text-slate-400">
              <Calendar className="mr-2 h-3 w-3" />
              {new Date(generatedAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="shadow-none border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,018</div>
              <p className="text-xs text-green-600 font-medium mt-1">+12% from last period</p>
            </CardContent>
          </Card>
          <Card className="shadow-none border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Tokens</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">315,000</div>
              <p className="text-xs text-slate-500 mt-1">Avg. 309 tokens/req</p>
            </CardContent>
          </Card>
          <Card className="shadow-none border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Estimated Cost</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$42.50</div>
              <p className="text-xs text-red-600 font-medium mt-1">+5% from last period</p>
            </CardContent>
          </Card>
        </div>

        {/* Usage Chart */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800">Weekly Usage Trend</h2>
          <div className="border rounded-xl p-4 bg-slate-50/50">
            <UsageLineChart data={sampleUsageData} title="" isAnimationActive={isAnimationActive} />
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
