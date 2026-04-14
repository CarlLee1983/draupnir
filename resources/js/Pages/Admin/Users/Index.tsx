import { Head } from '@inertiajs/react'
import { AdminLayout } from '@/layouts/AdminLayout'
import { DataTable } from '@/components/tables/DataTable'
import { createUserColumns, type UserRow } from './columns'
import type { I18nMessage } from '@/lib/i18n'
import { useTranslation } from '@/lib/i18n'

interface Props {
  users: UserRow[]
  meta: { total: number; page: number; limit: number; totalPages: number }
  filters: { keyword: string; role: string; status: string }
  error: I18nMessage | null
}

export default function UsersIndex({ users, error }: Props) {
  const { t } = useTranslation()
  const columns = createUserColumns(t)

  return (
    <AdminLayout>
      <Head title={t('ui.admin.users.title')} />

      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t('ui.admin.users.title')}</h1>

        {error && (
          <div className="rounded-md border border-destructive p-4 text-destructive">{t(error.key, error.params)}</div>
        )}

        <DataTable
          columns={columns}
          data={users}
          searchPlaceholder={t('ui.admin.users.searchPlaceholder')}
          searchColumn="email"
        />
      </div>
    </AdminLayout>
  )
}
