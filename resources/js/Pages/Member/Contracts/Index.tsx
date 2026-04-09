import { Head } from '@inertiajs/react'
import { MemberLayout } from '@/layouts/MemberLayout'
import { DataTable } from '@/components/tables/DataTable'
import { contractColumns, type ContractRow } from './columns'

interface Props {
  orgId: string | null
  contracts: ContractRow[]
  error: string | null
}

export default function ContractsIndex({ contracts, error }: Props) {
  return (
    <MemberLayout>
      <Head title="合約" />

      <div className="space-y-6">
        <h1 className="text-2xl font-bold">合約</h1>

        {error && <div className="rounded-md border border-destructive p-4 text-destructive">{error}</div>}

        <DataTable columns={contractColumns} data={contracts} searchPlaceholder="搜尋合約..." searchColumn="name" />
      </div>
    </MemberLayout>
  )
}
