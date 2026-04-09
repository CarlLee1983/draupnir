import { Head } from '@inertiajs/react'
import { MemberLayout } from '@/layouts/MemberLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Key, CreditCard, Activity, TrendingUp } from 'lucide-react'
import { formatCredit, formatNumber } from '@/lib/format'

interface DashboardSummary {
  totalKeys: number
  activeKeys: number
  totalUsage: number
}

interface Balance {
  balance: string
  lowBalanceThreshold: string
  status: string
}

interface Props {
  orgId?: string | null
  summary: DashboardSummary | null
  balance: Balance | null
  error: string | null
}

export default function MemberDashboard({ orgId, summary, balance, error }: Props) {
  const keysQuery = orgId ? `?orgId=${encodeURIComponent(orgId)}` : ''

  return (
    <MemberLayout>
      <Head title="總覽" />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">總覽</h1>
        </div>

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6 text-destructive">{error}</CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="API Keys 總數"
            value={summary ? formatNumber(summary.totalKeys) : '—'}
            icon={<Key className="h-4 w-4 text-muted-foreground" />}
          />
          <StatCard
            title="活躍 Keys"
            value={summary ? formatNumber(summary.activeKeys) : '—'}
            icon={<Activity className="h-4 w-4 text-green-500" />}
          />
          <StatCard
            title="本期用量（請求）"
            value={summary ? formatNumber(summary.totalUsage) : '—'}
            icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
          />
          <StatCard
            title="Credit 餘額"
            value={balance ? formatCredit(balance.balance) : '—'}
            icon={<CreditCard className="h-4 w-4 text-muted-foreground" />}
            suffix={
              balance && parseFloat(balance.balance) < parseFloat(balance.lowBalanceThreshold) ? (
                <Badge variant="destructive" className="ml-2">
                  低額度
                </Badge>
              ) : null
            }
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>快速操作</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <a
              href={`/member/api-keys/create${keysQuery}`}
              className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              建立 API Key
            </a>
            <a
              href={`/member/usage${keysQuery}`}
              className="inline-flex h-9 items-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
            >
              查看用量
            </a>
          </CardContent>
        </Card>
      </div>
    </MemberLayout>
  )
}

function StatCard({
  title,
  value,
  icon,
  suffix,
}: {
  title: string
  value: string
  icon: React.ReactNode
  suffix?: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline text-2xl font-bold">
          {value}
          {suffix}
        </div>
      </CardContent>
    </Card>
  )
}
