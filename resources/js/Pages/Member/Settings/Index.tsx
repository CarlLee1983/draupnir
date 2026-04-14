import { Head, useForm } from '@inertiajs/react'
import { MemberLayout } from '@/layouts/MemberLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import type { I18nMessage } from '@/lib/i18n'
import { useTranslation } from '@/lib/i18n'

interface UserProfile {
  id: string
  email: string
  name: string
  role: string
}

interface Props {
  user: UserProfile
  formError: I18nMessage | null
}

export default function MemberSettings({ user, formError }: Props) {
  const { toast } = useToast()
  const { t } = useTranslation()
  const { data, setData, put, processing, errors } = useForm({
    name: user.name || '',
    email: user.email,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (formError) {
      toast({ title: t('ui.common.failed'), description: t(formError.key, formError.params), variant: 'destructive' })
      return
    }

    put('/member/settings', {
      onSuccess: () => {
        toast({ title: t('ui.common.success'), description: t('ui.member.settings.updateSuccess') })
      },
    })
  }

  return (
    <MemberLayout>
      <Head title={t('ui.member.settings.title')} />

      <div className="max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold">{t('ui.member.settings.heading')}</h1>

        <Card>
          <CardHeader>
            <CardTitle>{t('ui.member.settings.profileCard')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('ui.member.settings.emailLabel')}</Label>
                <Input id="email" value={data.email} disabled className="bg-muted" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">{t('ui.member.settings.nameLabel')}</Label>
                <Input
                  id="name"
                  value={data.name}
                  onChange={(e) => setData('name', e.target.value)}
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label>{t('ui.member.settings.roleLabel')}</Label>
                <Input value={user.role} disabled className="bg-muted" />
              </div>

              <Button type="submit" disabled={processing}>
                {processing ? t('ui.member.settings.submitLoading') : t('ui.member.settings.submitButton')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </MemberLayout>
  )
}
