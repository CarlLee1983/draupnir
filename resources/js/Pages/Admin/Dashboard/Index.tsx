import type { ReactNode } from 'react'
import { Head, Link } from '@inertiajs/react'
import { AdminLayout } from '@/layouts/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UsageLineChart, type UsageDataPoint } from '@/components/charts/UsageLineChart'
import { Users, Building2, FileText, Key, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/lib/format'
import { useTranslation } from '@/lib/i18n'

interface Totals {
  users: number
  organizations: number
  contracts: number
}

interface Props {
  totals: Totals
}

export default function AdminDashboard({ totals }: Props) {
  const { t } = useTranslation()
  const sampleUsageData: UsageDataPoint[] = [
    { date: '03/01', requests: 420, tokens: 145000 },
    { date: '03/02', requests: 650, tokens: 152000 },
    { date: '03/03', requests: 598, tokens: 138000 },
    { date: '03/04', requests: 800, tokens: 171000 },
    { date: '03/05', requests: 775, tokens: 163000 },
  ]

  return (
    <AdminLayout>
      <Head title={t('ui.admin.dashboard.title')} />

      <div className="relative space-y-8 pb-12">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 -z-10 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 -z-10 h-96 w-96 rounded-full bg-accent/5 blur-3xl" />

        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-heading font-bold tracking-tight text-foreground">
            {t('ui.admin.dashboard.title')}
          </h1>
          <p className="text-muted-foreground text-sm font-medium">
            歡迎回來，這是您目前的平台運行概況。
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title={t('ui.admin.dashboard.metricUsers')}
            value={formatNumber(totals.users)}
            icon={<Users className="h-5 w-5" />}
            href="/admin/users"
            trend="+12% since last month"
            variant="primary"
          />
          <StatCard
            title={t('ui.admin.dashboard.metricOrgs')}
            value={formatNumber(totals.organizations)}
            icon={<Building2 className="h-5 w-5" />}
            href="/admin/organizations"
            trend="+3 new this week"
            variant="accent"
          />
          <StatCard
            title={t('ui.admin.dashboard.metricContracts')}
            value={formatNumber(totals.contracts)}
            icon={<FileText className="h-5 w-5" />}
            href="/admin/contracts"
            trend="2 expiring soon"
            variant="default"
          />
          <StatCard
            title={t('ui.admin.dashboard.metricApiKeys')}
            value="24"
            icon={<Key className="h-5 w-5" />}
            href="/admin/api-keys"
            trend="All active"
            variant="default"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <UsageLineChart data={sampleUsageData} title={t('ui.admin.dashboard.usageTrendTitle')} />
          </div>
          <Card className="glass-card flex flex-col justify-center p-8 text-center border-dashed border-2 border-primary/20 bg-primary/5">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <Activity className="h-6 w-6 animate-pulse" />
            </div>
            <h3 className="text-lg font-heading font-bold mb-2">系統健康度</h3>
            <p className="text-sm text-muted-foreground mb-6">所有服務均正常運行中，API 回應延遲低於 120ms。</p>
            <div className="flex justify-center gap-2">
              <div className="h-1 w-8 rounded-full bg-primary" />
              <div className="h-1 w-8 rounded-full bg-primary" />
              <div className="h-1 w-8 rounded-full bg-primary/30" />
            </div>
          </Card>
        </div>
      </div>
    </AdminLayout>
  )
}

function StatCard({
  title,
  value,
  icon,
  href,
  trend,
  variant = 'default',
}: {
  title: string
  value: string
  icon: ReactNode
  href: string
  trend?: string
  variant?: 'default' | 'primary' | 'accent'
}) {
  const variantStyles = {
    default: 'text-muted-foreground',
    primary: 'text-primary',
    accent: 'text-accent-electric',
  }

  return (
    <Link href={href} className="group">
      <Card className="glass-card relative overflow-hidden p-6 hover:shadow-lg hover:shadow-primary/5 transition-all">
        <div className={cn(
          "absolute top-0 right-0 h-24 w-24 -mr-8 -mt-8 rounded-full blur-2xl opacity-10 group-hover:opacity-20 transition-opacity",
          variant === 'primary' ? "bg-primary" : variant === 'accent' ? "bg-accent-electric" : "bg-muted"
        )} />
        
        <div className="flex flex-row items-center justify-between pb-3">
          <span className="text-sm font-semibold text-muted-foreground tracking-wide uppercase">
            {title}
          </span>
          <div className={cn("p-2 rounded-lg bg-muted/50 transition-colors group-hover:bg-background", variantStyles[variant])}>
            {icon}
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-3xl font-heading font-bold tracking-tight text-foreground">{value}</div>
          {trend && (
            <p className="text-[10px] font-medium text-muted-foreground/60 group-hover:text-muted-foreground transition-colors">
              {trend}
            </p>
          )}
        </div>
      </Card>
    </Link>
  )
}
