import { Head } from '@inertiajs/react'
import { AdminLayout } from '@/layouts/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { DataTable } from '@/components/tables/DataTable'
import { createAdminApiKeyColumns, type AdminApiKeyRow } from './columns'
import { router } from '@inertiajs/react'
import type { I18nMessage } from '@/lib/i18n'
import { useTranslation } from '@/lib/i18n'
import { Key } from 'lucide-react'

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

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('ui.admin.apiKeys.title')}</h1>
            <p className="text-muted-foreground mt-1">{t('ui.admin.apiKeys.pageDescription')}</p>
          </div>
        </div>

        <Card className="shadow-sm border-muted/60">
          <CardHeader>
            <CardTitle className="text-base">{t('ui.admin.apiKeys.selectOrgTitle')}</CardTitle>
            <CardDescription>{t('ui.admin.apiKeys.selectOrgDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="max-w-md space-y-2">
            <Label htmlFor="orgSelect">{t('ui.admin.apiKeys.orgLabel')}</Label>
            <select
              id="orgSelect"
              value={selectedOrgId ?? ''}
              onChange={handleOrgChange}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
          <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-destructive text-sm font-medium">
            {t(error.key, error.params)}
          </div>
        )}

        <Card className="shadow-sm border-muted/60 overflow-hidden">
          <CardHeader className="pb-3 border-b border-muted/40">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              <CardTitle>{t('ui.admin.apiKeys.listTitle')}</CardTitle>
            </div>
            <CardDescription>{t('ui.admin.apiKeys.listDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {selectedOrgId ? (
              <DataTable
                columns={columns}
                data={keys}
                searchPlaceholder={t('ui.admin.apiKeys.searchPlaceholder')}
                searchColumn="label"
              />
            ) : (
              <div className="py-12 text-center text-muted-foreground flex flex-col items-center gap-2">
                <Key className="h-10 w-10 opacity-20" />
                <p>{t('ui.admin.apiKeys.emptyState')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
