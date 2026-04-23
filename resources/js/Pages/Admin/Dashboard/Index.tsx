import type { ReactNode } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import { AdminLayout } from '@/layouts/AdminLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UsageLineChart, type UsageDataPoint } from '@/components/charts/UsageLineChart'
import { Users, Building2, FileText, Key } from 'lucide-react'
import { formatNumber } from '@/lib/format'
import { useTranslation } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const USAGE_WINDOW_OPTIONS = [7, 15, 30] as const
type UsageWindow = (typeof USAGE_WINDOW_OPTIONS)[number]

interface Totals {
  users: number
  organizations: number
  contracts: number
}

interface Props {
  totals: Totals
  usageTrend: UsageDataPoint[]
  usageWindowDays: UsageWindow
  isUsageTrendDemo: boolean
}

export default function AdminDashboard({ totals, usageTrend, usageWindowDays, isUsageTrendDemo }: Props) {
  const { t } = useTranslation()

  const onWindowChange = (value: UsageWindow) => {
    if (value === usageWindowDays) return
    router.get(
      '/admin/dashboard',
      { days: value },
      { replace: true, preserveScroll: true },
    )
  }

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
          isDemo={isUsageTrendDemo}
          title={t('ui.admin.dashboard.usageTrendTitle')}
          description={t('ui.admin.dashboard.usageTrendDescription')}
          emptyMessage={t('ui.admin.dashboard.usageTrendEmpty', { days: usageWindowDays })}
          headerRight={
            <div className="inline-flex rounded-lg border border-border bg-muted/30 p-1">
              {USAGE_WINDOW_OPTIONS.map((option) => {
                const active = usageWindowDays === option
                return (
                  <Button
                    key={option}
                    type="button"
                    variant={active ? 'secondary' : 'ghost'}
                    size="sm"
                    className={cn(
                      'min-w-14 rounded-md px-3',
                      active ? 'shadow-sm' : 'text-muted-foreground',
                    )}
                    onClick={() => onWindowChange(option)}
                  >
                    {t('ui.admin.dashboard.usageWindowDays', { days: option })}
                  </Button>
                )
              })}
            </div>
          }
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
      <Card className="transition-all hover:bg-accent hover:shadow-md border-border/50">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-mono uppercase tracking-widest text-muted-foreground">{title}</CardTitle>
          {icon}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-mono tracking-tight">{value}</div>
        </CardContent>
      </Card>
    </Link>
  )
}
