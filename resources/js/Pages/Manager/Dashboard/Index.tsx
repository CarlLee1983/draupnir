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
interface Balance {
  balance: string
  lowBalanceThreshold: string
  status: string
}

interface Props {
  orgId: string | null
  balance: Balance | null
  keys: KeyRow[]
  error: { key: string } | null
}

export default function ManagerDashboardIndex({ orgId, balance, keys, error }: Props) {
  const allocated = keys.reduce((s, k) => s + (k.quotaAllocated || 0), 0)

  return (
    <ManagerLayout>
      <Head title="Manager Dashboard" />
      <div className="grid gap-4 p-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>組織餘額</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{balance?.balance ?? '-'}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>已配發配額</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{allocated}</CardContent>
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
