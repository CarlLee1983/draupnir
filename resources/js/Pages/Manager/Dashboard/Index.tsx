import { Head } from '@inertiajs/react'
import { ManagerLayout } from '@/layouts/ManagerLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface KeyRow {
  id: string
  label: string
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
          <CardHeader>
            <CardTitle>組織餘額</CardTitle>
            <CardDescription>作用中合約配額上限</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {contractQuota == null ? '-' : contractQuota}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>已配發配額</CardTitle>
            <CardDescription>作用中 API keys 配發加總</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {totalAllocated == null ? '-' : totalAllocated}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>API Keys 數量</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{keys.length}</CardContent>
        </Card>
      </div>

      <div className="p-4">
        <Card>
          <CardHeader>
            <CardTitle>各 Key 用量</CardTitle>
            <CardDescription>Top 10 使用中的 key</CardDescription>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Label</th>
                  <th className="text-right py-2">配額</th>
                  <th className="text-right py-2">用量</th>
                  <th className="text-left py-2">指派</th>
                </tr>
              </thead>
              <tbody>
                {keys.slice(0, 10).map((k) => (
                  <tr key={k.id} className="border-b">
                    <td className="py-2">{k.label}</td>
                    <td className="text-right">{k.quotaAllocated}</td>
                    <td className="text-right">{k.usageCurrent ?? '-'}</td>
                    <td>{k.assignedMemberId ?? '未指派'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
        {error && <p className="text-sm text-red-500 mt-2">載入失敗</p>}
        {!orgId && <p className="text-sm text-muted-foreground mt-2">尚未加入任何組織</p>}
      </div>
    </ManagerLayout>
  )
}
