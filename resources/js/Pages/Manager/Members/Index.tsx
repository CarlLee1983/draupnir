import { useState } from 'react'
import { Head, router } from '@inertiajs/react'
import { ManagerLayout } from '@/layouts/ManagerLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface MemberRow {
  userId: string
  role: string
  joinedAt: string
  assignedKeys: string[]
}
interface Props {
  members: MemberRow[]
  error: { key: string } | null
}

export default function ManagerMembersIndex({ members, error }: Props) {
  const [email, setEmail] = useState('')

  const invite = (e: React.FormEvent) => {
    e.preventDefault()
    router.post(
      '/manager/members/invite',
      { email, role: 'member' },
      { onSuccess: () => setEmail('') },
    )
  }
  const remove = (userId: string) => {
    if (!confirm('確定移除該成員？其被指派的 key 會解除指派（key 保留）')) return
    router.post(`/manager/members/${userId}/remove`)
  }

  return (
    <ManagerLayout>
      <Head title="成員管理" />
      <div className="p-4 grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>邀請成員</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={invite} className="flex gap-2 max-w-md">
              <Input
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button type="submit">產生邀請</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>現有成員</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">使用者 ID</th>
                  <th className="text-left">角色</th>
                  <th className="text-left">加入日期</th>
                  <th className="text-left">被指派 Keys</th>
                  <th className="text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.userId} className="border-b">
                    <td className="font-mono text-xs">{m.userId}</td>
                    <td>{m.role}</td>
                    <td>{m.joinedAt}</td>
                    <td>{m.assignedKeys.length === 0 ? '-' : m.assignedKeys.join(', ')}</td>
                    <td className="text-right">
                      <Button variant="outline" size="sm" onClick={() => remove(m.userId)}>
                        移除
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
