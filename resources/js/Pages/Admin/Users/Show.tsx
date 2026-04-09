import type { ReactNode } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import { AdminLayout } from '@/layouts/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft } from 'lucide-react'
import { formatDateTime } from '@/lib/format'

interface UserProfile {
  id: string
  email: string
  name: string
  role: string
  status: 'active' | 'suspended'
  createdAt: string
  updatedAt: string
}

interface Props {
  user: UserProfile | null
  error: string | null
}

export default function UserShow({ user, error }: Props) {
  const { toast } = useToast()

  const handleToggleStatus = () => {
    if (!user) return
    const newStatus = user.status === 'active' ? 'suspended' : 'active'
    if (!confirm(`確定要將此使用者設為「${newStatus === 'active' ? '啟用' : '停用'}」？`)) return

    router.post(
      `/admin/users/${user.id}/status`,
      { status: newStatus },
      {
        preserveScroll: true,
        onSuccess: () => toast({ title: '成功', description: '狀態已更新' }),
        onError: () => toast({ title: '失敗', description: '無法更新狀態', variant: 'destructive' }),
      },
    )
  }

  return (
    <AdminLayout>
      <Head title="使用者詳細" />

      <div className="max-w-3xl space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/users">
              <ArrowLeft className="mr-1 h-4 w-4" />
              返回列表
            </Link>
          </Button>
        </div>

        {error && (
          <div className="rounded-md border border-destructive p-4 text-destructive">{error}</div>
        )}

        {user && (
          <>
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">{user.name || user.email}</h1>
              <Button
                variant={user.status === 'active' ? 'destructive' : 'default'}
                onClick={handleToggleStatus}
              >
                {user.status === 'active' ? '停用' : '啟用'}
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>基本資料</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Field label="ID" value={<code className="text-xs">{user.id}</code>} />
                <Field label="Email" value={user.email} />
                <Field label="名稱" value={user.name || '—'} />
                <Field label="角色" value={<Badge>{user.role}</Badge>} />
                <Field
                  label="狀態"
                  value={
                    user.status === 'active' ? (
                      <Badge className="bg-green-500">啟用</Badge>
                    ) : (
                      <Badge variant="destructive">停用</Badge>
                    )
                  }
                />
                <Field label="建立時間" value={formatDateTime(user.createdAt)} />
                <Field label="最後更新" value={formatDateTime(user.updatedAt)} />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  )
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  )
}
