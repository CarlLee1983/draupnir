import type { ReactNode } from 'react'
import { Head } from '@inertiajs/react'
import { AdminLayout } from '@/layouts/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UsageLineChart, type UsageDataPoint } from '@/components/charts/UsageLineChart'
import { Key, Users, CreditCard } from 'lucide-react'

interface DashboardSummary {
  totalKeys: number
  activeKeys: number
  totalUsage: number
  creditBalance: number
}

interface Props {
  summary: DashboardSummary | null
}

export default function AdminDashboard({ summary }: Props) {
  const stats = summary ?? {
    totalKeys: 0,
    activeKeys: 0,
    totalUsage: 0,
    creditBalance: 0,
  }

  const sampleUsageData: UsageDataPoint[] = [
    { date: '03/01', requests: 120, tokens: 45000 },
    { date: '03/02', requests: 150, tokens: 52000 },
    { date: '03/03', requests: 98, tokens: 38000 },
    { date: '03/04', requests: 200, tokens: 71000 },
    { date: '03/05', requests: 175, tokens: 63000 },
  ]

  return (
    <AdminLayout>
      <Head title="管理後台總覽" />

      <div className="space-y-6">
        <h1 className="text-2xl font-bold">系統總覽</h1>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="API Keys 總數"
            value={stats.totalKeys}
            icon={<Key className="h-4 w-4 text-muted-foreground" />}
          />
          <StatCard
            title="活躍 Keys"
            value={stats.activeKeys}
            icon={<Key className="h-4 w-4 text-green-500" />}
          />
          <StatCard
            title="總用量"
            value={stats.totalUsage.toLocaleString()}
            icon={<Users className="h-4 w-4 text-muted-foreground" />}
          />
          <StatCard
            title="Credit 餘額"
            value={stats.creditBalance.toLocaleString()}
            icon={<CreditCard className="h-4 w-4 text-muted-foreground" />}
          />
        </div>

        <UsageLineChart data={sampleUsageData} title="近期用量趨勢" />
      </div>
    </AdminLayout>
  )
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string
  value: string | number
  icon: ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}
