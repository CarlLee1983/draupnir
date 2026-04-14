import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Link } from '@inertiajs/react'
import { formatDate } from '@/lib/format'
import type { Translator } from '@/lib/i18n'

export interface AdminContractRow {
  id: string
  name: string
  status: 'draft' | 'active' | 'expired' | 'terminated'
  targetType: 'organization' | 'user'
  targetId: string
  startDate: string
  endDate: string
}

function statusBadge(status: AdminContractRow['status'], t: Translator) {
  const map = {
    draft: { label: t('ui.common.status.draft'), variant: 'outline' as const },
    active: { label: t('ui.common.status.active'), variant: 'default' as const },
    expired: { label: t('ui.common.status.expired'), variant: 'secondary' as const },
    terminated: { label: t('ui.common.status.terminated'), variant: 'destructive' as const },
  }
  const { label, variant } = map[status]
  return <Badge variant={variant}>{label}</Badge>
}

export const createAdminContractColumns = (t: Translator): ColumnDef<AdminContractRow>[] => [
  { accessorKey: 'name', header: `${t('ui.admin.contracts.contract')} / ${t('ui.admin.contracts.target')}` },
  {
    accessorKey: 'status',
    header: t('ui.common.status'),
    cell: ({ row }) => statusBadge(row.original.status, t),
  },
  {
    accessorKey: 'targetType',
    header: t('ui.admin.contracts.create.targetTypeLabel'),
    cell: ({ row }) => (row.original.targetType === 'organization' ? t('ui.admin.contracts.create.targetOrg') : t('ui.admin.contracts.create.targetUser')),
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
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/admin/contracts/${row.original.id}`}>{t('ui.common.view')}</Link>
      </Button>
    ),
  },
]
