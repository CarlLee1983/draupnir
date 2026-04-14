import { Head } from '@inertiajs/react'
import { AdminLayout } from '@/layouts/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { DataTable } from '@/components/tables/DataTable'
import { createAdminApiKeyColumns, type AdminApiKeyRow } from './columns'
import { router } from '@inertiajs/react'
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
  const columns = createAdminApiKeyColumns(t)

  const handleOrgChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const orgId = e.target.value
    router.get('/admin/api-keys', orgId ? { orgId } : {}, {
      preserveState: true,
      replace: true,
    })
  }

  return (
    <AdminLayout>
      <Head title={t('ui.admin.apiKeys.title')} />

      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t('ui.admin.apiKeys.title')}</h1>

        <Card>
          <CardHeader>
            <CardTitle>{t('ui.admin.apiKeys.selectOrgTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="max-w-md space-y-2">
            <Label htmlFor="orgSelect">{t('ui.admin.apiKeys.orgLabel')}</Label>
            <select
              id="orgSelect"
              value={selectedOrgId ?? ''}
              onChange={handleOrgChange}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
            >
              <option value="">{t('ui.admin.apiKeys.orgPlaceholder')}</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-md border border-destructive p-4 text-destructive">
            {t(error.key, error.params)}
          </div>
        )}

        {selectedOrgId ? (
          <DataTable
            columns={columns}
            data={keys}
            searchPlaceholder={t('ui.admin.apiKeys.searchPlaceholder')}
            searchColumn="label"
          />
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {t('ui.admin.apiKeys.emptyState')}
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  )
}
