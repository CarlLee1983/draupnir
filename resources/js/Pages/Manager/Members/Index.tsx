import { useState } from 'react'
import { Head, router, usePage } from '@inertiajs/react'
import { useUser } from '@/hooks/use-auth'
import { ManagerLayout } from '@/layouts/ManagerLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTranslation } from '@/lib/i18n'

interface MemberRow {
  userId: string
  email: string
  role: string
  joinedAt: string
  assignedKeys: string[]
}

interface PendingInvitationRow {
  id: string
  email: string
  role: string
  expiresAt: string
  createdAt: string
}

interface Props {
  members: MemberRow[]
  pendingInvitations: PendingInvitationRow[]
  error: { key: string } | null
  invitationsError: { key: string } | null
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString()
}

export default function ManagerMembersIndex({
  members,
  pendingInvitations,
  error,
  invitationsError,
}: Props) {
  const { t } = useTranslation()
  const { flash } = usePage().props
  const currentUser = useUser()
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
    if (userId === currentUser.id) return
    if (!confirm('確定移除該成員？其被指派的 key 會解除指派（key 保留）')) return
    router.post(`/manager/members/${userId}/remove`)
  }

  return (
    <ManagerLayout>
      <Head title="成員管理" />
      <div className="p-4 grid gap-4">
        {flash?.error && (
          <p className="text-sm text-red-600 rounded-md border border-red-200 bg-red-50 px-3 py-2">
            {t(flash.error.key, flash.error.params)}
          </p>
        )}
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
            <CardTitle>邀請中</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {invitationsError && (
              <p className="text-sm text-amber-600">邀請清單無法載入，請重新整理頁面。</p>
            )}
            {!invitationsError && pendingInvitations.length === 0 && (
              <p className="text-sm text-muted-foreground">目前沒有待處理的邀請。</p>
            )}
            {!invitationsError && pendingInvitations.length > 0 && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Email</th>
                    <th className="text-left">角色</th>
                    <th className="text-left">到期</th>
                    <th className="text-left">建立時間</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingInvitations.map((inv) => (
                    <tr key={inv.id} className="border-b">
                      <td className="py-2">{inv.email}</td>
                      <td>{inv.role}</td>
                      <td>{formatDateTime(inv.expiresAt)}</td>
                      <td>{formatDateTime(inv.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
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
                  <th className="text-left py-2">Email</th>
                  <th className="text-left">角色</th>
                  <th className="text-left">加入日期</th>
                  <th className="text-left">被指派 Keys</th>
                  <th className="text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.userId} className="border-b">
                    <td className="text-sm">{m.email || m.userId}</td>
                    <td>{m.role}</td>
                    <td>{m.joinedAt}</td>
                    <td>{m.assignedKeys.length === 0 ? '-' : m.assignedKeys.join(', ')}</td>
                    <td className="text-right">
                      {m.userId === currentUser.id ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => remove(m.userId)}>
                          移除
                        </Button>
                      )}
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
