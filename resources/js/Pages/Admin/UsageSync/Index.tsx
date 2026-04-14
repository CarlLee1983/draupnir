import { Head } from '@inertiajs/react'
import { AdminLayout } from '@/layouts/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDateTime, formatNumber } from '@/lib/format'
import { CheckCircle2, XCircle, Clock, Database, AlertTriangle } from 'lucide-react'
import type { I18nMessage } from '@/lib/i18n'
import { useTranslation } from '@/lib/i18n'

interface UsageSyncStatus {
  enabled: boolean
  lastSyncedAt: string | null
  nextSyncAt: string | null
  processedCount: number
  lastError: string | null
}

interface Props {
  status: UsageSyncStatus
  error: I18nMessage | null
}

export default function UsageSyncIndex({ status, error }: Props) {
  const { t } = useTranslation()
  return (
    <AdminLayout>
      <Head title={t('ui.admin.usageSync.title')} />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('ui.admin.usageSync.title')}</h1>
          {status.enabled ? (
            <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              {t('ui.admin.usageSync.running')}
            </Badge>
          ) : (
            <Badge variant="secondary">
              <XCircle className="mr-1 h-3 w-3" />
              {t('ui.common.status.inactive')}
            </Badge>
          )}
        </div>

        {error && (
          <div className="rounded-md border border-destructive p-4 text-destructive">
            {t(error.key, error.params)}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('ui.admin.usageSync.lastSync')}</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {status.lastSyncedAt ? formatDateTime(status.lastSyncedAt) : '—'}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('ui.admin.usageSync.nextSync')}</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {status.nextSyncAt ? formatDateTime(status.nextSyncAt) : '—'}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('ui.admin.usageSync.processedCount')}</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(status.processedCount)}</div>
            </CardContent>
          </Card>
        </div>

        {status.lastError && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center">
                <AlertTriangle className="mr-2 h-4 w-4" />
                {t('ui.admin.usageSync.lastError')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm text-destructive overflow-auto p-4 bg-background rounded-md border border-destructive/20">
                {status.lastError}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  )
}
