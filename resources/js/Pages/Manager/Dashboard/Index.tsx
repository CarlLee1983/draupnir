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
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

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

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'active':
      return <Badge className="bg-green-500 hover:bg-green-600">作用中</Badge>
    case 'pending':
      return <Badge variant="secondary">待啟用</Badge>
    case 'revoked':
      return <Badge variant="destructive">已撤銷</Badge>
    case 'suspended_no_credit':
      return <Badge variant="destructive">餘額不足停用</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export default function ManagerDashboardIndex({
  orgId,
  contractQuota,
  totalAllocated,
  keys,
  error,
}: Props) {
  return (
    <ManagerLayout>
      <Head title="Manager Dashboard" />
      <div className="grid gap-4 p-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">組織餘額</CardTitle>
            <CardDescription className="text-xs">作用中合約配額上限</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(contractQuota)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">已配發配額</CardTitle>
            <CardDescription className="text-xs">作用中 API keys 配發加總</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalAllocated)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">API Keys 數量</CardTitle>
            <CardDescription className="text-xs">目前建立的 Key 總數</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{keys.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="p-4 pt-0">
        <Card>
          <CardHeader>
            <CardTitle>各 Key 用量</CardTitle>
            <CardDescription>Top 10 使用中的 key</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead className="text-center">狀態</TableHead>
                  <TableHead className="text-right">配額</TableHead>
                  <TableHead className="text-right">用量</TableHead>
                  <TableHead className="text-right">使用率</TableHead>
                  <TableHead className="text-center">指派狀態</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      目前沒有 API Key
                    </TableCell>
                  </TableRow>
                ) : (
                  keys.slice(0, 10).map((k) => {
                    const usage = k.usageCurrent ?? 0
                    const percentage = k.quotaAllocated > 0 ? (usage / k.quotaAllocated) * 100 : 0
                    const status = getUsageStatus(usage, k.quotaAllocated)

                    return (
                      <TableRow key={k.id}>
                        <TableCell className="font-medium">{k.label}</TableCell>
                        <TableCell className="text-center">{getStatusBadge(k.status)}</TableCell>
                        <TableCell className="text-right">{formatNumber(k.quotaAllocated)}</TableCell>
                        <TableCell className="text-right">{formatNumber(k.usageCurrent)}</TableCell>
                        <TableCell className="text-right">
                          <span
                            className={cn(
                              'font-mono font-medium',
                              status === 'destructive' && 'text-red-500',
                              status === 'warning' && 'text-yellow-500'
                            )}
                          >
                            {percentage.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {k.assignedMemberId ? (
                            <Badge variant="secondary">已指派</Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              未指派
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        {error && <p className="text-sm text-red-500 mt-2">載入失敗</p>}
        {!orgId && <p className="text-sm text-muted-foreground mt-2">尚未加入任何組織</p>}
      </div>
    </ManagerLayout>
  )
}
