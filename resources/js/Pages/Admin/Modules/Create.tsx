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
      <Head title="註冊模組" />

      <div className="max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold">註冊模組</h1>

        <Card>
          <CardHeader>
            <CardTitle>模組資訊</CardTitle>
          </CardHeader>
          <CardContent>
            {formError && (
              <div className="mb-4 rounded-md border border-destructive p-3 text-sm text-destructive">
                {t(formError.key, formError.params)}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">識別名稱（英小寫、數字、底線；將存為模組 name）</Label>
                <Input
                  id="name"
                  value={form.data.name}
                  onChange={(e) => form.setData('name', e.target.value)}
                  placeholder="例如：advanced_analytics"
                  pattern="[a-z0-9_]+"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">描述</Label>
                <Input
                  id="description"
                  value={form.data.description}
                  onChange={(e) => form.setData('description', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">類型</Label>
                <select
                  id="type"
                  value={form.data.type}
                  onChange={(e) => form.setData('type', e.target.value as 'free' | 'paid')}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="free">免費</option>
                  <option value="paid">付費</option>
                </select>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={form.processing}>
                  {form.processing ? '註冊中...' : '註冊'}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.visit('/admin/modules')}>
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
