import { Head } from '@inertiajs/react'
import { MemberLayout } from '@/layouts/MemberLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UsageLineChart, type UsageDataPoint } from '@/components/charts/UsageLineChart'

interface UsageStats {
  totalRequests: number
  totalCost: number
  totalTokens: number
  avgLatency: number
}

interface Props {
  orgId: string | null
  usageLogs: Record<string, unknown>[]
  usageStats: UsageStats | null
  error: string | null
}

function logsToChartData(logs: Record<string, unknown>[]): UsageDataPoint[] {
  const byDay = new Map<string, { requests: number; tokens: number }>()
  for (const log of logs) {
    const ts = log.timestamp as string | undefined
    if (!ts) continue
    const day = new Date(ts).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' })
    const cur = byDay.get(day) ?? { requests: 0, tokens: 0 }
    cur.requests += 1
    const input = Number(log.input_tokens ?? 0)
    const output = Number(log.output_tokens ?? 0)
    const total = Number(log.total_tokens ?? input + output)
    cur.tokens += total
    byDay.set(day, cur)
  }
  return Array.from(byDay.entries()).map(([date, v]) => ({ date, requests: v.requests, tokens: v.tokens }))
}

export default function Usage({ usageLogs, usageStats, error }: Props) {
  const chartData = logsToChartData(usageLogs)
  const totalRequests = usageStats?.totalRequests ?? chartData.reduce((sum, p) => sum + p.requests, 0)
  const totalTokens = usageStats?.totalTokens ?? chartData.reduce((sum, p) => sum + p.tokens, 0)

  return (
    <MemberLayout>
      <Head title="用量" />

      <div className="space-y-6">
        <h1 className="text-2xl font-bold">用量分析</h1>

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6 text-destructive">{error}</CardContent>
          </Card>
        )}

        {chartData.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">尚無用量資料</CardContent>
          </Card>
        ) : (
          <UsageLineChart data={chartData} title="用量趨勢" />
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">總請求數</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalRequests.toLocaleString('zh-TW')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">總 Token 消耗</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTokens.toLocaleString('zh-TW')}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MemberLayout>
  )
}
