import { useState } from 'react'
import { Head, router, useForm } from '@inertiajs/react'
import { MemberLayout } from '@/layouts/MemberLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import type { I18nMessage, MessageKey } from '@/lib/i18n'
import { useTranslation } from '@/lib/i18n'

interface UserProfile {
  id: string
  email: string
  name: string
  role: string
}

interface Profile {
  displayName?: string
}

interface AuthSessionRow {
  id: string
  type: 'access'
  createdAt: string
  expiresAt: string
  isCurrent: boolean
}

interface Props {
  user: UserProfile
  profile: Profile | null
  error: { key: string } | null
  sessions: AuthSessionRow[]
  sessionsRevokeError?: string | null
}

function formatSessionTime(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleString(locale === 'en' ? 'en-US' : 'zh-TW', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

export default function MemberSettings({ user, profile, error, sessions, sessionsRevokeError }: Props) {
  const { toast } = useToast()
  const { t, locale } = useTranslation()
  const { data, setData, put, processing, errors } = useForm({
    displayName: profile?.displayName || '',
    email: user.email,
  })
  const [revokingAll, setRevokingAll] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (error) {
      toast({ title: t('ui.common.failed'), description: t(error.key as MessageKey), variant: 'destructive' })
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
                <Label htmlFor="displayName">{t('ui.member.settings.nameLabel')}</Label>
                <Input
                  id="displayName"
                  value={data.displayName}
                  onChange={(e) => setData('displayName', e.target.value)}
                />
                {errors.displayName && <p className="text-xs text-destructive">{errors.displayName}</p>}
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

        <Card>
          <CardHeader>
            <CardTitle>{t('ui.member.settings.sessionsCard')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{t('ui.member.settings.sessionsDescription')}</p>
            {sessionsRevokeError && (
              <p className="text-sm text-destructive">{sessionsRevokeError}</p>
            )}
            {sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('ui.member.settings.sessionsEmpty')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[280px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="py-2 pr-2">{t('ui.member.settings.sessionsColCreated')}</th>
                      <th className="py-2 pr-2">{t('ui.member.settings.sessionsColExpires')}</th>
                      <th className="py-2">{t('ui.member.settings.sessionsColStatus')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s) => (
                      <tr key={s.id} className="border-b border-border last:border-0">
                        <td className="py-2 pr-2">{formatSessionTime(s.createdAt, locale)}</td>
                        <td className="py-2 pr-2">{formatSessionTime(s.expiresAt, locale)}</td>
                        <td className="py-2">
                          {s.isCurrent ? (
                            <span className="text-xs font-medium text-primary">
                              {t('ui.member.settings.sessionCurrentBadge')}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              disabled={revokingAll}
              onClick={() => {
                if (!window.confirm(t('ui.member.settings.revokeAllSessionsConfirm'))) return
                setRevokingAll(true)
                router.post('/member/settings/sessions/revoke-all', {}, { onFinish: () => setRevokingAll(false) })
              }}
            >
              {revokingAll ? t('ui.member.settings.submitLoading') : t('ui.member.settings.revokeAllSessions')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </MemberLayout>
  )
}
