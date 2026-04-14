import { Head, router, useForm } from '@inertiajs/react'
import { useEffect } from 'react'
import type { I18nMessage } from '@/lib/i18n'
import { useTranslation } from '@/lib/i18n'
import { MemberLayout } from '@/layouts/MemberLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  orgId: string | null
  createdKey: string | null
  formError: I18nMessage | null
}

export default function ApiKeyCreate({ orgId, createdKey, formError }: Props) {
  const { t } = useTranslation()
  const form = useForm({
    orgId: orgId ?? '',
    label: '',
    rateLimitRpm: 60,
    rateLimitTpm: 10_000,
  })

  useEffect(() => {
    form.setData('orgId', orgId ?? '')
  }, [orgId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    form.post('/member/api-keys')
  }

  const handleDone = () => {
    router.visit(`/member/api-keys${orgId ? `?orgId=${encodeURIComponent(orgId)}` : ''}`)
  }

  return (
    <MemberLayout>
      <Head title={t('ui.member.apiKeys.create.title')} />

      <div className="max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold">{t('ui.member.apiKeys.create.title')}</h1>

        {createdKey ? (
          <Card className="border-green-500">
            <CardHeader>
              <CardTitle>{t('ui.member.apiKeys.create.successTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t('ui.member.apiKeys.create.copyWarning')}
              </p>
              <code className="block break-all rounded-md bg-muted p-3 text-sm">{createdKey}</code>
              <Button onClick={handleDone}>{t('ui.member.apiKeys.create.savedButton')}</Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              {formError && <div className="mb-4 rounded-md border border-destructive p-3 text-sm text-destructive">{t(formError.key, formError.params)}</div>}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="label">{t('ui.member.apiKeys.create.nameLabel')}</Label>
                  <Input
                    id="label"
                    value={form.data.label}
                    onChange={(e) => form.setData('label', e.target.value)}
                    placeholder={t('ui.member.apiKeys.create.namePlaceholder')}
                    required
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rpm">{t('ui.member.apiKeys.create.rpmLabel')}</Label>
                  <Input
                    id="rpm"
                    type="number"
                    value={form.data.rateLimitRpm}
                    onChange={(e) => form.setData('rateLimitRpm', parseInt(e.target.value, 10) || 0)}
                    min={1}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tpm">{t('ui.member.apiKeys.create.tpmLabel')}</Label>
                  <Input
                    id="tpm"
                    type="number"
                    value={form.data.rateLimitTpm}
                    onChange={(e) => form.setData('rateLimitTpm', parseInt(e.target.value, 10) || 0)}
                    min={1}
                    required
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={form.processing || !orgId}>
                    {form.processing ? t('ui.member.apiKeys.create.submitLoading') : '建立'}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleDone}>
                    取消
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </MemberLayout>
  )
}
