import { Head } from '@inertiajs/react'
import { MemberLayout } from '@/layouts/MemberLayout'
import { DataTable } from '@/components/tables/DataTable'
import { contractColumns, type ContractRow } from './columns'
import type { I18nMessage } from '@/lib/i18n'
import { useTranslation } from '@/lib/i18n'

interface Props {
  orgId: string | null
  contracts: ContractRow[]
  error: I18nMessage | null
}

export default function ContractsIndex({ contracts, error }: Props) {
  const { t } = useTranslation()
  return (
    <MemberLayout>
      <Head title="合約" />

      <div className="space-y-6">
        <h1 className="text-2xl font-bold">合約</h1>

        {error && <div className="rounded-md border border-destructive p-4 text-destructive">{t(error.key, error.params)}</div>}

        <DataTable columns={contractColumns} data={contracts} searchPlaceholder="搜尋合約..." searchColumn="name" />
      </div>
    </MemberLayout>
  )
}
