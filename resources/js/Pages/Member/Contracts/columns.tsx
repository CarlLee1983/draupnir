import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/format'
import type { Translator } from '@/lib/i18n'

export interface ContractRow {
  id: string
  name: string
  status: 'draft' | 'active' | 'expired' | 'terminated'
  startDate: string
  endDate: string
  creditQuota: string
}

function statusBadge(status: ContractRow['status'], t: Translator) {
  const map: Record<
    ContractRow['status'],
    { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
  > = {
    draft: { label: t('ui.common.status.draft'), variant: 'outline' },
    active: { label: t('ui.common.status.active'), variant: 'default' },
    expired: { label: t('ui.common.status.expired'), variant: 'secondary' },
    terminated: { label: t('ui.common.status.terminated'), variant: 'destructive' },
  }
  const { label, variant } = map[status]
  return <Badge variant={variant}>{label}</Badge>
}

export const createContractColumns = (t: Translator): ColumnDef<ContractRow>[] => [
  {
    accessorKey: 'name',
    header: t('ui.member.contracts.title').split(' ')[0] + t('ui.common.name'),
  },
  {
    accessorKey: 'status',
    header: t('ui.common.status'),
    cell: ({ row }) => statusBadge(row.original.status, t),
  },
  {
    accessorKey: 'startDate',
    header: t('ui.admin.contracts.create.startDateLabel'),
    cell: ({ row }) => formatDate(row.original.startDate),
  },
  {
    accessorKey: 'endDate',
    header: t('ui.admin.contracts.create.endDateLabel'),
    cell: ({ row }) => formatDate(row.original.endDate),
  },
  {
    accessorKey: 'creditQuota',
    header: t('ui.admin.contracts.create.creditQuotaLabel'),
  },
]
