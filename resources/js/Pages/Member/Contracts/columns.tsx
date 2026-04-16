import type { ColumnDef } from '@tanstack/react-table'
import type { Translator } from '@/lib/i18n'

/** Member contracts page exposes organization credit quota rows only (no contract period or status in UI). */
export interface ContractRow {
  id: string
  creditQuota: string
}

export const createContractColumns = (t: Translator): ColumnDef<ContractRow>[] => [
  {
    accessorKey: 'creditQuota',
    header: t('ui.admin.contracts.create.creditQuotaLabel'),
  },
]
