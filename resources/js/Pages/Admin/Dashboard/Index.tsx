import type { ReactNode } from 'react'
import { Head, Link } from '@inertiajs/react'
import { AdminLayout } from '@/layouts/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UsageLineChart, type UsageDataPoint } from '@/components/charts/UsageLineChart'
import { Users, Building2, FileText, Key } from 'lucide-react'
import { formatNumber } from '@/lib/format'
import { useTranslation } from '@/lib/i18n'

interface Totals {
  users: number
  organizations: number
  contracts: number
}

interface Props {
  totals: Totals
  usageTrend: UsageDataPoint[]
}

export default function AdminDashboard({ totals, usageTrend }: Props) {
  const { t } = useTranslation()

  return (
    <AdminLayout>
      <Head title={t('ui.admin.dashboard.title')} />

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('ui.admin.dashboard.title')}</h1>
            <p className="text-muted-foreground mt-1">{t('ui.admin.dashboard.subtitle')}</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title={t('ui.admin.dashboard.metricUsers')}
            value={formatNumber(totals.users)}
            icon={<Users className="h-4 w-4 text-muted-foreground" />}
            href="/admin/users"
          />
          <StatCard
            title={t('ui.admin.dashboard.metricOrgs')}
            value={formatNumber(totals.organizations)}
            icon={<Building2 className="h-4 w-4 text-muted-foreground" />}
            href="/admin/organizations"
          />
          <StatCard
            title={t('ui.admin.dashboard.metricContracts')}
            value={formatNumber(totals.contracts)}
            icon={<FileText className="h-4 w-4 text-muted-foreground" />}
            href="/admin/contracts"
          />
          <StatCard
            title={t('ui.admin.dashboard.metricApiKeys')}
            value="—"
            icon={<Key className="h-4 w-4 text-muted-foreground" />}
            href="/admin/api-keys"
          />
        </div>

        <UsageLineChart
          data={usageTrend}
          title={t('ui.admin.dashboard.usageTrendTitle')}
          emptyMessage={t('ui.admin.dashboard.usageTrendEmpty')}
        />
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
