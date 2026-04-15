import { Head, Link, useForm } from '@inertiajs/react'
import { MemberLayout } from '@/layouts/MemberLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTranslation } from '@/lib/i18n'
import type { I18nMessage } from '@/lib/i18n'

interface Props {
  orgId: string | null
  keyId: string | null
  keyLabel: string | null
  formError: I18nMessage | null
}

export default function ApiKeyBudget({ orgId, keyId, keyLabel, formError }: Props) {
  const { t } = useTranslation()
  const listQuery = orgId ? `?orgId=${encodeURIComponent(orgId)}` : ''

  const { data, setData, post, processing } = useForm({
    orgId: orgId ?? '',
    budgetMaxLimit: '',
    budgetResetPeriod: '30d' as '7d' | '30d',
  })

  if (!keyId || !orgId || !keyLabel) {
    return (
      <MemberLayout>
        <Head title={t('ui.member.apiKeys.budget.title')} />
        <div className="mx-auto max-w-lg space-y-4">
          <h1 className="text-2xl font-bold">{t('ui.member.apiKeys.budget.title')}</h1>
          {formError && (
            <p className="text-sm text-destructive">{t(formError.key, formError.params)}</p>
          )}
          <Button variant="outline" asChild>
            <Link href={`/member/api-keys${listQuery}`}>{t('ui.common.cancel')}</Link>
          </Button>
        </div>
      </MemberLayout>
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    post(`/member/api-keys/${keyId}/budget`)
  }

  return (
    <MemberLayout>
      <Head title={t('ui.member.apiKeys.budget.title')} />

      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold">{t('ui.member.apiKeys.budget.title')}</h1>
        <p className="text-muted-foreground text-sm">
          {t('ui.member.apiKeys.budget.keyLabel')}: <span className="font-medium text-foreground">{keyLabel}</span>
        </p>

        <Card>
          <CardHeader>
            <CardTitle>{t('ui.member.apiKeys.budget.cardTitle')}</CardTitle>
            <CardDescription>{t('ui.member.apiKeys.budget.cardDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            {formError && (
              <div className="mb-4 rounded-md border border-destructive p-3 text-sm text-destructive">
                {t(formError.key, formError.params)}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="budgetMaxLimit">{t('ui.member.apiKeys.create.budgetCapLabel')}</Label>
                  <Input
                    id="budgetMaxLimit"
                    type="number"
                    min={0}
                    step="0.01"
                    required
                    placeholder={t('ui.member.apiKeys.create.budgetCapPlaceholder')}
                    value={data.budgetMaxLimit}
                    onChange={(e) => setData('budgetMaxLimit', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budgetResetPeriod">{t('ui.member.apiKeys.create.budgetPeriodLabel')}</Label>
                  <select
                    id="budgetResetPeriod"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={data.budgetResetPeriod}
                    onChange={(e) =>
                      setData('budgetResetPeriod', e.target.value as '7d' | '30d')
                    }
                  >
                    <option value="7d">{t('ui.member.apiKeys.create.budgetPeriod7d')}</option>
                    <option value="30d">{t('ui.member.apiKeys.create.budgetPeriod30d')}</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" className="flex-1" disabled={processing}>
                  {processing ? t('ui.member.apiKeys.budget.saving') : t('ui.member.apiKeys.budget.save')}
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/member/api-keys${listQuery}`}>{t('ui.common.cancel')}</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </MemberLayout>
  )
}
