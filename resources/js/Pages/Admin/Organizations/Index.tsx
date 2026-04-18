import { Head } from '@inertiajs/react'
import { AdminLayout } from '@/layouts/AdminLayout'
import { DataTable } from '@/components/tables/DataTable'
import { createOrgColumns, type OrgRow } from './columns'
import type { I18nMessage } from '@/lib/i18n'
import { useTranslation } from '@/lib/i18n'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Building2 } from 'lucide-react'

interface Props {
  organizations: OrgRow[]
  error: I18nMessage | null
}

export default function OrganizationsIndex({ organizations, error }: Props) {
  const { t } = useTranslation()
  const columns = createOrgColumns(t)

  return (
    <AdminLayout>
      <Head title={t('ui.admin.organizations.title')} />

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('ui.admin.organizations.title')}</h1>
            <p className="text-muted-foreground mt-1">
              管理系統中的所有組織及其相關資訊。
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-destructive p-4 text-destructive">
            {t(error.key, error.params)}
          </div>
        )}

        <Card className="shadow-sm border-muted/60 overflow-hidden">
          <CardHeader className="pb-3 border-b border-muted/40">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle>組織清單</CardTitle>
            </div>
            <CardDescription>管理系統中的組織基本資料。</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <DataTable
              columns={columns}
              data={organizations}
              searchPlaceholder={t('ui.admin.organizations.searchPlaceholder')}
              searchColumn="name"
            />
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
