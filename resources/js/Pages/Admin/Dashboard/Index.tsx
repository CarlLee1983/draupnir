import type { ReactNode } from 'react'
import { Head, Link } from '@inertiajs/react'
import { AdminLayout } from '@/layouts/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UsageLineChart, type UsageDataPoint } from '@/components/charts/UsageLineChart'
import { Users, Building2, FileText, Key } from 'lucide-react'
import { formatNumber } from '@/lib/format'

interface Totals {
  users: number
  organizations: number
  contracts: number
}

interface Props {
  totals: Totals
}

export default function AdminDashboard({ totals }: Props) {
  const sampleUsageData: UsageDataPoint[] = [
    { date: '03/01', requests: 420, tokens: 145000 },
    { date: '03/02', requests: 650, tokens: 152000 },
    { date: '03/03', requests: 598, tokens: 138000 },
    { date: '03/04', requests: 800, tokens: 171000 },
    { date: '03/05', requests: 775, tokens: 163000 },
  ]

  return (
    <AdminLayout>
      <Head title="系統總覽" />

      <div className="space-y-6">
        <h1 className="text-2xl font-bold">系統總覽</h1>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="使用者總數"
            value={formatNumber(totals.users)}
            icon={<Users className="h-4 w-4 text-muted-foreground" />}
            href="/admin/users"
          />
          <StatCard
            title="組織總數"
            value={formatNumber(totals.organizations)}
            icon={<Building2 className="h-4 w-4 text-muted-foreground" />}
            href="/admin/organizations"
          />
          <StatCard
            title="合約總數"
            value={formatNumber(totals.contracts)}
            icon={<FileText className="h-4 w-4 text-muted-foreground" />}
            href="/admin/contracts"
          />
          <StatCard
            title="API Keys"
            value="—"
            icon={<Key className="h-4 w-4 text-muted-foreground" />}
            href="/admin/api-keys"
          />
        </div>

        <UsageLineChart data={sampleUsageData} title="全系統用量趨勢" />
      </div>
    </AdminLayout>
  )
}

function StatCard({
  title,
  value,
  icon,
  href,
}: {
  title: string
  value: string
  icon: ReactNode
  href: string
}) {
  return (
    <Link href={href}>
      <Card className="transition-colors hover:bg-accent">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {icon}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
        </CardContent>
      </Card>
    </Link>
  )
}
