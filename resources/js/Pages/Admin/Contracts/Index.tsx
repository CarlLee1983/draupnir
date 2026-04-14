import { Head, Link } from '@inertiajs/react'
import { AdminLayout } from '@/layouts/AdminLayout'
import { DataTable } from '@/components/tables/DataTable'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { adminContractColumns, type AdminContractRow } from './columns'
import type { I18nMessage } from '@/lib/i18n'
import { useTranslation } from '@/lib/i18n'

interface Props {
  contracts: AdminContractRow[]
  meta: { total: number; page: number; limit: number; totalPages: number }
  error: I18nMessage | null
}

export default function ContractsIndex({ contracts, error }: Props) {
  const { t } = useTranslation()
  return (
    <AdminLayout>
      <Head title="合約管理" />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">合約管理</h1>
          <Button asChild>
            <Link href="/admin/contracts/create">
              <Plus className="mr-2 h-4 w-4" />
              建立合約
            </Link>
          </Button>
        </div>

        {error && (
          <div className="rounded-md border border-destructive p-4 text-destructive">{t(error.key, error.params)}</div>
        )}

        <DataTable
          columns={adminContractColumns}
          data={contracts}
          searchPlaceholder="搜尋合約..."
          searchColumn="name"
        />
      </div>
    </AdminLayout>
  )
}
