import { Head, Link, router } from '@inertiajs/react'
import { ManagerLayout } from '@/layouts/ManagerLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface KeyRow {
  id: string
  label: string
  quotaAllocated: number
  status: string
  assignedMemberId: string | null
}
interface Assignee {
  userId: string
}
interface Props {
  keys: KeyRow[]
  assignees: Assignee[]
  error: { key: string } | null
}

export default function ManagerApiKeysIndex({ keys, assignees, error }: Props) {
  const revoke = (id: string) => {
    if (!confirm('撤銷後此 key 將失效，確定執行？')) return
    router.post(`/manager/api-keys/${id}/revoke`)
  }
  const onAssignChange = (keyId: string, value: string) => {
    const assigneeUserId = value === '' ? null : value
    router.post(`/manager/api-keys/${keyId}/assign`, { assigneeUserId })
  }

  return (
    <ManagerLayout>
      <Head title="API Keys" />
      <div className="p-4 grid gap-4">
        <div className="flex justify-end">
          <Link href="/manager/api-keys/create">
            <Button>建立 Key</Button>
          </Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>API Keys</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">名稱</th>
                  <th className="text-right">配額</th>
                  <th className="text-left">狀態</th>
                  <th className="text-left">指派對象</th>
                  <th className="text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id} className="border-b">
                    <td>{k.label}</td>
                    <td className="text-right">{k.quotaAllocated}</td>
                    <td>{k.status}</td>
                    <td>
                      <select
                        className="border rounded px-2 py-1 bg-background"
                        value={k.assignedMemberId ?? ''}
                        onChange={(e) => onAssignChange(k.id, e.target.value)}
                        disabled={k.status === 'revoked'}
                      >
                        <option value="">未指派</option>
                        {assignees.map((a) => (
                          <option key={a.userId} value={a.userId}>
                            {a.userId}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => revoke(k.id)}
                        disabled={k.status === 'revoked'}
                      >
                        撤銷
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
        {error && <p className="text-sm text-red-500">載入失敗</p>}
      </div>
    </ManagerLayout>
  )
}
