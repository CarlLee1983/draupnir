import { Head } from '@inertiajs/react'
import { MemberLayout } from '@/layouts/MemberLayout'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { DataTable } from '@/components/tables/DataTable'
import { createContractColumns, type ContractRow } from './columns'
import { AlertCircle, AlertTriangle } from 'lucide-react'
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
          <Alert variant={error.key.endsWith('.selectOrg') ? 'warning' : 'destructive'}>
            {error.key.endsWith('.selectOrg') ? (
              <AlertTriangle className="size-4" />
            ) : (
              <AlertCircle className="size-4" />
            )}
            <AlertDescription>{t(error.key, error.params)}</AlertDescription>
          </Alert>
        )}

        <DataTable columns={columns} data={contracts} paginated={false} />
      </div>
    </MemberLayout>
  )
}
