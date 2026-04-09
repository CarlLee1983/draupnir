import { Head } from '@inertiajs/react'
import { AdminLayout } from '@/layouts/AdminLayout'
import { DataTable } from '@/components/tables/DataTable'
import { orgColumns, type OrgRow } from './columns'

interface Props {
  organizations: OrgRow[]
  meta: { total: number; page: number; limit: number; totalPages: number }
  error: string | null
}

export default function OrganizationsIndex({ organizations, error }: Props) {
  return (
    <AdminLayout>
      <Head title="組織管理" />

      <div className="space-y-6">
        <h1 className="text-2xl font-bold">組織管理</h1>

        {error && (
          <div className="rounded-md border border-destructive p-4 text-destructive">{error}</div>
        )}

        <DataTable
          columns={orgColumns}
          data={organizations}
          searchPlaceholder="搜尋組織..."
          searchColumn="name"
        />
      </div>
    </AdminLayout>
  )
}
