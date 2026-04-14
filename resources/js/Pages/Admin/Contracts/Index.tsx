import { Head, Link } from '@inertiajs/react'
import { AdminLayout } from '@/layouts/AdminLayout'
import { DataTable } from '@/components/tables/DataTable'
import { createAdminContractColumns, type AdminContractRow } from './columns'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import type { I18nMessage } from '@/lib/i18n'
import { useTranslation } from '@/lib/i18n'

interface Props {
  contracts: AdminContractRow[]
  error: I18nMessage | null
}

export default function ContractsIndex({ contracts, error }: Props) {
  const { t } = useTranslation()
  const columns = createAdminContractColumns(t)

  return (
    <AdminLayout>
      <Head title={t('ui.admin.contracts.title')} />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('ui.admin.contracts.title')}</h1>
          <Button asChild>
            <Link href="/admin/contracts/create">
              <Plus className="mr-2 h-4 w-4" />
              {t('ui.admin.contracts.createButton')}
            </Link>
          </Button>
        </div>

        {error && (
          <div className="rounded-md border border-destructive p-4 text-destructive">{t(error.key, error.params)}</div>
        )}

        <DataTable
          columns={columns}
          data={contracts}
          searchPlaceholder={t('ui.admin.contracts.searchPlaceholder')}
          searchColumn="name"
        />
      </div>
    </AdminLayout>
  )
}
