import { Head, Link, useForm } from '@inertiajs/react'
import { MemberLayout } from '@/layouts/MemberLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Key, Copy, Check, AlertTriangle } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from '@/lib/i18n'
import type { I18nMessage } from '@/lib/i18n'

interface Props {
  orgId: string | null
  createdKey: string | null
  formError: I18nMessage | null
}

export default function CreateApiKey({ orgId, createdKey, formError }: Props) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  const { data, setData, post, processing, errors } = useForm({
    label: '',
    rateLimitRpm: 60,
    rateLimitTpm: 100000,
    orgId: orgId ?? '',
    budgetMaxLimit: '',
    budgetResetPeriod: '30d' as '7d' | '30d',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    post('/member/api-keys')
  }

  const copyToClipboard = () => {
    if (!createdKey) return
    navigator.clipboard.writeText(createdKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (createdKey) {
    return (
      <MemberLayout>
        <Head title={t('ui.member.apiKeys.create.successTitle')} />
        <div className="flex h-[80vh] items-center justify-center">
          <Card className="w-full max-w-md border-green-200 bg-green-50/30">
            <CardHeader>
              <CardTitle className="flex items-center text-green-700">
                <Check className="mr-2 h-5 w-5" />
                {t('ui.member.apiKeys.create.successTitle')}
              </CardTitle>
              <CardDescription className="text-green-600/80">
                {t('ui.member.apiKeys.create.copyWarning')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="relative">
                <Input readOnly value={createdKey} className="pr-10 font-mono text-sm" />
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute right-0 top-0 h-full"
                  onClick={copyToClipboard}
                >
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>

              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <div className="flex items-center font-semibold">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Important
                </div>
                <p className="mt-1">
                  This key grants access to your organization's credits. Store it securely.
                </p>
              </div>

              <Button asChild className="w-full">
                <Link href={orgId ? `/member/dashboard?orgId=${orgId}` : '/member/dashboard'}>
                  {t('ui.member.apiKeys.create.savedButton')}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </MemberLayout>
    )
  }

  return (
    <MemberLayout>
      <Head title={t('ui.member.apiKeys.create.title')} />

      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">{t('ui.member.apiKeys.create.title')}</h1>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Key className="mr-2 h-5 w-5" />
              API Key Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            {formError && (
              <div className="mb-4 rounded-md border border-destructive p-3 text-sm text-destructive">
                {t(formError.key, formError.params)}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="label">{t('ui.member.apiKeys.create.nameLabel')}</Label>
                <Input
                  id="label"
                  placeholder={t('ui.member.apiKeys.create.namePlaceholder')}
                  value={data.label}
                  onChange={(e) => setData('label', e.target.value)}
                />
                {errors.label && <p className="text-xs text-destructive">{errors.label}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rateLimitRpm">{t('ui.member.apiKeys.create.rpmLabel')}</Label>
                  <Input
                    id="rateLimitRpm"
                    type="number"
                    value={data.rateLimitRpm}
                    onChange={(e) => setData('rateLimitRpm', parseInt(e.target.value, 10))}
                  />
                  {errors.rateLimitRpm && <p className="text-xs text-destructive">{errors.rateLimitRpm}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rateLimitTpm">{t('ui.member.apiKeys.create.tpmLabel')}</Label>
                  <Input
                    id="rateLimitTpm"
                    type="number"
                    value={data.rateLimitTpm}
                    onChange={(e) => setData('rateLimitTpm', parseInt(e.target.value, 10))}
                  />
                  {errors.rateLimitTpm && <p className="text-xs text-destructive">{errors.rateLimitTpm}</p>}
                </div>
              </div>

              <div className="space-y-2 rounded-lg border border-border/80 bg-muted/30 p-4">
                <p className="text-sm font-medium">{t('ui.member.apiKeys.create.budgetSectionTitle')}</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="budgetMaxLimit">{t('ui.member.apiKeys.create.budgetCapLabel')}</Label>
                    <Input
                      id="budgetMaxLimit"
                      type="number"
                      min={0}
                      step="0.01"
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
              </div>

              <div className="pt-4 flex gap-3">
                <Button type="submit" className="flex-1" disabled={processing}>
                  {processing ? t('ui.member.apiKeys.create.submitLoading') : t('ui.member.apiKeys.create.submitButton')}
                </Button>
                <Button variant="outline" asChild>
                  <Link href={orgId ? `/member/api-keys?orgId=${orgId}` : '/member/api-keys'}>
                    {t('ui.common.cancel')}
                  </Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </MemberLayout>
  )
}
