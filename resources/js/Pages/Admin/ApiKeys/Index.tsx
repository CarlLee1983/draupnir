import { Head, router } from '@inertiajs/react'
import { AdminLayout } from '@/layouts/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/tables/DataTable'
import { Label } from '@/components/ui/label'
import { adminApiKeyColumns, type AdminApiKeyRow } from './columns'
import type { I18nMessage } from '@/lib/i18n'
import { useTranslation } from '@/lib/i18n'

interface OrgOption {
  id: string
  name: string
}

interface Props {
  organizations: OrgOption[]
  selectedOrgId: string | null
  keys: AdminApiKeyRow[]
  error: I18nMessage | null
}

export default function ApiKeysIndex({ organizations, selectedOrgId, keys, error }: Props) {
  const { t } = useTranslation()
  const handleOrgChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const orgId = e.target.value
    router.visit(`/admin/api-keys${orgId ? `?orgId=${orgId}` : ''}`)
  }

  return (
    <AdminLayout>
      <Head title="API Keys 總覽" />

      <div className="space-y-6">
        <h1 className="text-2xl font-bold">API Keys 總覽</h1>

        <Card>
          <CardHeader>
            <CardTitle>選擇組織</CardTitle>
          </CardHeader>
          <CardContent className="max-w-md space-y-2">
            <Label htmlFor="orgSelect">組織</Label>
            <select
              id="orgSelect"
              value={selectedOrgId ?? ''}
              onChange={handleOrgChange}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
            >
              <option value="">— 請選擇 —</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-md border border-destructive p-4 text-destructive">{t(error.key, error.params)}</div>
        )}

        {selectedOrgId ? (
          <DataTable
            columns={adminApiKeyColumns}
            data={keys}
            searchPlaceholder="搜尋 Key 名稱..."
            searchColumn="label"
          />
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              請先選擇組織以查看 API Keys
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  )
}
