import { Head } from '@inertiajs/react'
import { MemberLayout } from '@/layouts/MemberLayout'
import { DataTable } from '@/components/tables/DataTable'
import { createContractColumns, type ContractRow } from './columns'
import type { I18nMessage } from '@/lib/i18n'
import { useTranslation } from '@/lib/i18n'

interface Props {
  orgId: string | null
  contracts: ContractRow[]
  error: I18nMessage | null
}

export default function ContractsIndex({ contracts, error }: Props) {
  const { t } = useTranslation()
  const columns = createContractColumns(t)

  return (
    <MemberLayout>
      <Head title={t('ui.member.contracts.title')} />

      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t('ui.member.contracts.title')}</h1>

        {error && (
          <div className="rounded-md border border-destructive p-4 text-destructive">
            {t(error.key, error.params)}
          </div>
        )}

        <DataTable
          columns={columns}
          data={contracts}
          searchPlaceholder={t('ui.member.contracts.searchPlaceholder')}
          searchColumn="name"
        />
      </div>
    </MemberLayout>
  )
}
