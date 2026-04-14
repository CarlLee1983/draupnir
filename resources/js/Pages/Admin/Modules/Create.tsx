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

export default function ModuleCreate({ formError }: Props) {
  const { t } = useTranslation()
  const form = useForm({
    name: '',
    description: '',
    type: 'free' as 'free' | 'paid',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    form.post('/admin/modules')
  }

  return (
    <AdminLayout>
      <Head title={t('ui.admin.modules.create.title')} />

      <div className="max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold">{t('ui.admin.modules.create.title')}</h1>

        <Card>
          <CardHeader>
            <CardTitle>{t('ui.admin.modules.create.cardTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            {formError && (
              <div className="mb-4 rounded-md border border-destructive p-3 text-sm text-destructive">
                {t(formError.key, formError.params)}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('ui.admin.modules.create.nameLabel')}</Label>
                <Input
                  id="name"
                  value={form.data.name}
                  onChange={(e) => form.setData('name', e.target.value)}
                  placeholder={t('ui.admin.modules.create.namePlaceholder')}
                  pattern="[a-z0-9_]+"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t('ui.admin.modules.create.descriptionLabel')}</Label>
                <Input
                  id="description"
                  value={form.data.description}
                  onChange={(e) => form.setData('description', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">{t('ui.admin.modules.create.typeLabel')}</Label>
                <select
                  id="type"
                  value={form.data.type}
                  onChange={(e) => form.setData('type', e.target.value as 'free' | 'paid')}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="free">{t('ui.admin.modules.create.typeFree')}</option>
                  <option value="paid">{t('ui.admin.modules.create.typePaid')}</option>
                </select>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={form.processing}>
                  {form.processing ? t('ui.admin.modules.create.submitLoading') : t('ui.admin.modules.create.title')}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.visit('/admin/modules')}>
                  {t('ui.admin.modules.create.cancelButton')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
