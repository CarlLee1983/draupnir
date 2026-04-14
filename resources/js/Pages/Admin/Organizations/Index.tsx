import { Head } from '@inertiajs/react'
import { AdminLayout } from '@/layouts/AdminLayout'
import { DataTable } from '@/components/tables/DataTable'
import { orgColumns, type OrgRow } from './columns'
import type { I18nMessage } from '@/lib/i18n'
import { useTranslation } from '@/lib/i18n'

interface Props {
  organizations: OrgRow[]
  meta: { total: number; page: number; limit: number; totalPages: number }
  error: I18nMessage | null
}

export default function OrganizationsIndex({ organizations, error }: Props) {
  const { t } = useTranslation()
  return (
    <AdminLayout>
      <Head title={t('ui.admin.organizations.title')} />

      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t('ui.admin.organizations.title')}</h1>

        {error && (
          <div className="rounded-md border border-destructive p-4 text-destructive">{t(error.key, error.params)}</div>
        )}

        <DataTable
          columns={orgColumns}
          data={organizations}
          searchPlaceholder={t('ui.admin.organizations.searchPlaceholder')}
          searchColumn="name"
        />
      </div>
    </AdminLayout>
  )
}
