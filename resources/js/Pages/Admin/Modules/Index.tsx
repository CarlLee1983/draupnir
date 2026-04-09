import { Head, Link } from '@inertiajs/react'
import { AdminLayout } from '@/layouts/AdminLayout'
import { DataTable } from '@/components/tables/DataTable'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { moduleColumns, type ModuleRow } from './columns'

interface Props {
  modules: ModuleRow[]
  error: string | null
}

export default function ModulesIndex({ modules, error }: Props) {
  return (
    <AdminLayout>
      <Head title="模組管理" />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">模組管理</h1>
          <Button asChild>
            <Link href="/admin/modules/create">
              <Plus className="mr-2 h-4 w-4" />
              註冊模組
            </Link>
          </Button>
        </div>

        {error && (
          <div className="rounded-md border border-destructive p-4 text-destructive">{error}</div>
        )}

        <DataTable
          columns={moduleColumns}
          data={modules}
          searchPlaceholder="搜尋模組..."
          searchColumn="name"
        />
      </div>
    </AdminLayout>
  )
}
