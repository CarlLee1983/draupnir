import { Head, useForm, usePage } from '@inertiajs/react'
import { useEffect } from 'react'
import type { I18nMessage } from '@/lib/i18n'
import { useTranslation } from '@/lib/i18n'
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
  error: I18nMessage | null
  formError: I18nMessage | null
}

export default function Settings({ profile, error, formError }: Props) {
  const { t } = useTranslation()
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
      toast({ title: '失敗', description: t(formError.key, formError.params), variant: 'destructive' })
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
      <Head title={t('ui.member.settings.title')} />

      <div className="max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold">{t('ui.member.settings.heading')}</h1>

        {error && <div className="rounded-md border border-destructive p-4 text-destructive">{t(error.key, error.params)}</div>}

        <Card>
          <CardHeader>
            <CardTitle>{t('ui.member.settings.profileCard')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('ui.member.settings.emailLabel')}</Label>
                <Input id="email" value={email} disabled className="bg-muted" readOnly />
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">{t('ui.member.settings.nameLabel')}</Label>
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
                <Label htmlFor="role">{t('ui.member.settings.roleLabel')}</Label>
                <Input
                  id="role"
                  value={page.props.auth?.user?.role ?? ''}
                  disabled
                  className="bg-muted"
                  readOnly
                />
              </div>

              <Button type="submit" disabled={form.processing}>
                {form.processing ? t('ui.member.settings.submitLoading') : t('ui.member.settings.submitButton')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </MemberLayout>
  )
}
