import { Head } from '@inertiajs/react'
import { AdminLayout } from '@/layouts/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { formatDateTime, formatNumber } from '@/lib/format'

interface SyncStatus {
  enabled: boolean
  lastSyncAt: string | null
  nextSyncAt: string | null
  lastCursor: string | null
  totalRecordsProcessed: number
  lastError: string | null
}

interface Props {
  status: SyncStatus
  message: string | null
}

export default function UsageSyncIndex({ status, message }: Props) {
  return (
    <AdminLayout>
      <Head title="用量同步狀態" />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">用量同步狀態</h1>
          {status.enabled ? (
            <Badge className="bg-green-500">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              運行中
            </Badge>
          ) : (
            <Badge variant="outline">
              <AlertCircle className="mr-1 h-3 w-3" />
              未啟用
            </Badge>
          )}
        </div>

        {message && (
          <Card className="border-yellow-500">
            <CardContent className="flex items-center gap-2 pt-6 text-sm text-yellow-700 dark:text-yellow-400">
              <AlertCircle className="h-4 w-4" />
              {message}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">上次同步時間</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-medium">{formatDateTime(status.lastSyncAt)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">下次同步時間</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-medium">{formatDateTime(status.nextSyncAt)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">累計處理筆數</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(status.totalRecordsProcessed)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Sync Cursor</CardTitle>
            </CardHeader>
            <CardContent>
              <code className="text-xs">{status.lastCursor ?? '—'}</code>
            </CardContent>
          </Card>
        </div>

        {status.lastError && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">上次錯誤</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="overflow-auto text-xs">{status.lastError}</pre>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  )
}
