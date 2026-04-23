import { Head } from '@inertiajs/react'
import { ManagerLayout } from '@/layouts/ManagerLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { StatusBadge } from '@/components/badges'

interface KeyRow {
  id: string
  label: string
  status: string
  quotaAllocated: number
  usageCurrent?: number
  assignedMemberId: string | null
}
interface Props {
  orgId: string | null
  /** Active contract `creditQuota` (org pool cap). */
  contractQuota: number | null
  /** Sum of `quota_allocated` on active keys (full org, not paginated list). */
  totalAllocated: number | null
  keys: KeyRow[]
  error: { key: string } | null
}

const formatNumber = (num: number | null | undefined) => {
  if (num == null) return '-'
  return new Intl.NumberFormat().format(num)
}

const getUsageStatus = (current: number, total: number) => {
  const percentage = (current / total) * 100
  if (percentage >= 95) return 'destructive'
  if (percentage >= 80) return 'warning'
  return 'default'
}

export default function ManagerDashboardIndex({
  orgId,
  contractQuota,
  totalAllocated,
  keys,
  error,
}: Props) {
  const { t } = useTranslation()

  return (
    <ManagerLayout>
      <Head title={t('ui.manager.dashboard.top10Keys')} />
      <div className="grid gap-4 p-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('ui.manager.dashboard.orgBalance')}</CardTitle>
            <CardDescription className="text-xs">{t('ui.manager.dashboard.orgBalanceDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(contractQuota)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('ui.manager.dashboard.totalAllocated')}</CardTitle>
            <CardDescription className="text-xs">{t('ui.manager.dashboard.totalAllocatedDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalAllocated)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('ui.manager.dashboard.apiKeyCount')}</CardTitle>
            <CardDescription className="text-xs">{t('ui.manager.dashboard.apiKeyCountDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{keys.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="p-4 pt-0">
        <Card>
          <CardHeader>
            <CardTitle>{t('ui.manager.dashboard.top10Keys')}</CardTitle>
            <CardDescription>{t('ui.manager.dashboard.top10KeysDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('ui.common.name')}</TableHead>
                  <TableHead className="text-center">{t('ui.common.status')}</TableHead>
                  <TableHead className="text-right">{t('ui.common.quota')}</TableHead>
                  <TableHead className="text-right">{t('ui.common.usage')}</TableHead>
                  <TableHead className="text-right">{t('ui.common.usageRate')}</TableHead>
                  <TableHead className="text-center">{t('ui.common.assignedStatus')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      {t('ui.common.noData')}
                    </TableCell>
                  </TableRow>
                ) : (
                  keys.slice(0, 10).map((k) => {
                    const usage = k.usageCurrent ?? 0
                    const percentage = k.quotaAllocated > 0 ? (usage / k.quotaAllocated) * 100 : 0
                    const usageStatus = getUsageStatus(usage, k.quotaAllocated)

                    return (
                      <TableRow key={k.id}>
                        <TableCell className="font-medium">{k.label}</TableCell>
                        <TableCell className="text-center">
                          <StatusBadge status={k.status} t={t} />
                        </TableCell>
                        <TableCell className="text-right">{formatNumber(k.quotaAllocated)}</TableCell>
                        <TableCell className="text-right">{formatNumber(k.usageCurrent)}</TableCell>
                        <TableCell className="text-right">
                          <span
                            className={cn(
                              'font-mono font-medium',
                              usageStatus === 'destructive' && 'text-red-500',
                              usageStatus === 'warning' && 'text-yellow-500'
                            )}
                          >
                            {percentage.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <StatusBadge 
                            status={k.assignedMemberId ? 'assigned' : 'unassigned'} 
                            t={t} 
                          />
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        {error && <p className="text-sm text-red-500 mt-2">{t('ui.common.failed')}</p>}
        {!orgId && <p className="text-sm text-muted-foreground mt-2">{t('member.dashboard.selectOrg')}</p>}
      </div>
    </ManagerLayout>
  )
}
