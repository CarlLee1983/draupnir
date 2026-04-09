import { Head, useForm, usePage } from '@inertiajs/react'
import { useEffect } from 'react'
import { MemberLayout } from '@/layouts/MemberLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

interface UserProfile {
  id: string
  displayName: string
  avatarUrl: string | null
  phone: string | null
  bio: string | null
  timezone: string
  locale: string
  notificationPreferences: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

interface Props {
  profile: UserProfile | null
  error: string | null
  formError: string | null
}

export default function Settings({ profile, error, formError }: Props) {
  const { toast } = useToast()
  const page = usePage<{ auth: { user: { id: string; email: string; role: string } | null } }>()
  const email = page.props.auth?.user?.email ?? ''

  const form = useForm({
    displayName: profile?.displayName ?? '',
  })

  useEffect(() => {
    form.setData('displayName', profile?.displayName ?? '')
  }, [profile?.displayName])

  useEffect(() => {
    if (formError) {
      toast({ title: '失敗', description: formError, variant: 'destructive' })
    }
  }, [formError, toast])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    form.put('/member/settings', {
      preserveScroll: true,
      onSuccess: () => {
        toast({ title: '成功', description: '個人資料已更新' })
      },
    })
  }

  return (
    <MemberLayout>
      <Head title="設定" />

      <div className="max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold">個人設定</h1>

        {error && <div className="rounded-md border border-destructive p-4 text-destructive">{error}</div>}

        <Card>
          <CardHeader>
            <CardTitle>個人資料</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={email} disabled className="bg-muted" readOnly />
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">顯示名稱</Label>
                <Input
                  id="displayName"
                  name="displayName"
                  value={form.data.displayName}
                  onChange={(e) => form.setData('displayName', e.target.value)}
                  required
                  maxLength={50}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">角色</Label>
                <Input
                  id="role"
                  value={page.props.auth?.user?.role ?? ''}
                  disabled
                  className="bg-muted"
                  readOnly
                />
              </div>

              <Button type="submit" disabled={form.processing}>
                {form.processing ? '儲存中...' : '儲存變更'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </MemberLayout>
  )
}
