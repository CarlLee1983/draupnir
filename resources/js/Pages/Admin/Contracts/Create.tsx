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
      <Head title="建立合約" />

      <div className="max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold">建立合約</h1>

        <Card>
          <CardHeader>
            <CardTitle>合約標的與條款</CardTitle>
          </CardHeader>
          <CardContent>
            {formError && (
              <div className="mb-4 rounded-md border border-destructive p-3 text-sm text-destructive">
                {t(formError.key, formError.params)}
              </div>
            )}
            {form.errors && Object.keys(form.errors).length > 0 && (
              <div className="mb-4 text-sm text-destructive">請檢查表單欄位</div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="targetType">對象類型</Label>
                <select
                  id="targetType"
                  value={form.data.targetType}
                  onChange={(e) =>
                    form.setData('targetType', e.target.value as 'organization' | 'user')
                  }
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="organization">組織</option>
                  <option value="user">使用者</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetId">目標 ID（組織或使用者 UUID）</Label>
                <Input
                  id="targetId"
                  value={form.data.targetId}
                  onChange={(e) => form.setData('targetId', e.target.value)}
                  required
                  placeholder="例如組織 id"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="creditQuota">Credit 配額</Label>
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
                  <Label htmlFor="rpm">RPM</Label>
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
                  <Label htmlFor="tpm">TPM</Label>
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
                  <Label htmlFor="startDate">生效日</Label>
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
                  <Label htmlFor="endDate">到期日</Label>
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
                <Label htmlFor="allowedModules">允許模組（逗號分隔）</Label>
                <Input
                  id="allowedModules"
                  defaultValue="dashboard,credit,api_keys"
                  placeholder="dashboard,credit,api_keys"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={form.processing}>
                  {form.processing ? '建立中...' : '建立'}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.visit('/admin/contracts')}>
                  取消
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
