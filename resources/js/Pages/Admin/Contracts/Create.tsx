import { Head, router, useForm } from '@inertiajs/react'
import { AdminLayout } from '@/layouts/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { I18nMessage } from '@/lib/i18n'
import { useTranslation } from '@/lib/i18n'

interface Props {
  formError: I18nMessage | null
}

export default function ContractCreate({ formError }: Props) {
  const { t } = useTranslation()
  const form = useForm({
    targetType: 'organization' as 'organization' | 'user',
    targetId: '',
    terms: {
      creditQuota: 1000,
      allowedModules: ['dashboard', 'credit', 'api_keys'] as string[],
      rateLimit: { rpm: 60, tpm: 10000 },
      validityPeriod: { startDate: '', endDate: '' },
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const modulesStr = (document.getElementById('allowedModules') as HTMLInputElement)?.value ?? ''
    const allowedModules = modulesStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    form.setData('terms', {
      ...form.data.terms,
      allowedModules: allowedModules.length ? allowedModules : form.data.terms.allowedModules,
    })
    form.post('/admin/contracts')
  }

  return (
    <AdminLayout>
      <Head title={t('ui.admin.contracts.create.title')} />

      <div className="max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold">{t('ui.admin.contracts.create.title')}</h1>

        <Card>
          <CardHeader>
            <CardTitle>{t('ui.admin.contracts.create.cardTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            {formError && (
              <div className="mb-4 rounded-md border border-destructive p-3 text-sm text-destructive">
                {t(formError.key, formError.params)}
              </div>
            )}
            {form.errors && Object.keys(form.errors).length > 0 && (
              <div className="mb-4 text-sm text-destructive">{t('ui.admin.contracts.create.validationError')}</div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="targetType">{t('ui.admin.contracts.create.targetTypeLabel')}</Label>
                <select
                  id="targetType"
                  value={form.data.targetType}
                  onChange={(e) =>
                    form.setData('targetType', e.target.value as 'organization' | 'user')
                  }
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="organization">{t('ui.admin.contracts.create.targetOrg')}</option>
                  <option value="user">{t('ui.admin.contracts.create.targetUser')}</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetId">{t('ui.admin.contracts.create.targetIdLabel')}</Label>
                <Input
                  id="targetId"
                  value={form.data.targetId}
                  onChange={(e) => form.setData('targetId', e.target.value)}
                  required
                  placeholder={t('ui.admin.contracts.create.targetIdPlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="creditQuota">{t('ui.admin.contracts.create.creditQuotaLabel')}</Label>
                <Input
                  id="creditQuota"
                  type="number"
                  value={form.data.terms.creditQuota}
                  onChange={(e) =>
                    form.setData('terms', {
                      ...form.data.terms,
                      creditQuota: parseFloat(e.target.value) || 0,
                    })
                  }
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rpm">{t('ui.admin.contracts.create.rpmLabel')}</Label>
                  <Input
                    id="rpm"
                    type="number"
                    value={form.data.terms.rateLimit.rpm}
                    onChange={(e) =>
                      form.setData('terms', {
                        ...form.data.terms,
                        rateLimit: {
                          ...form.data.terms.rateLimit,
                          rpm: parseInt(e.target.value, 10) || 0,
                        },
                      })
                    }
                    min="0"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tpm">{t('ui.admin.contracts.create.tpmLabel')}</Label>
                  <Input
                    id="tpm"
                    type="number"
                    value={form.data.terms.rateLimit.tpm}
                    onChange={(e) =>
                      form.setData('terms', {
                        ...form.data.terms,
                        rateLimit: {
                          ...form.data.terms.rateLimit,
                          tpm: parseInt(e.target.value, 10) || 0,
                        },
                      })
                    }
                    min="0"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">{t('ui.admin.contracts.create.startDateLabel')}</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={form.data.terms.validityPeriod.startDate}
                    onChange={(e) =>
                      form.setData('terms', {
                        ...form.data.terms,
                        validityPeriod: {
                          ...form.data.terms.validityPeriod,
                          startDate: e.target.value,
                        },
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">{t('ui.admin.contracts.create.endDateLabel')}</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={form.data.terms.validityPeriod.endDate}
                    onChange={(e) =>
                      form.setData('terms', {
                        ...form.data.terms,
                        validityPeriod: {
                          ...form.data.terms.validityPeriod,
                          endDate: e.target.value,
                        },
                      })
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="allowedModules">{t('ui.admin.contracts.create.modulesLabel')}</Label>
                <Input
                  id="allowedModules"
                  defaultValue="dashboard,credit,api_keys"
                  placeholder={t('ui.admin.contracts.create.modulesPlaceholder')}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={form.processing}>
                  {form.processing ? t('ui.admin.contracts.create.submitLoading') : t('ui.admin.contracts.create.title')}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.visit('/admin/contracts')}>
                  {t('ui.admin.contracts.create.cancelButton')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
