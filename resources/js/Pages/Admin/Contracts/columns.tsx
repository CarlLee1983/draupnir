import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Link } from '@inertiajs/react'
import { formatDate } from '@/lib/format'
import type { Translator } from '@/lib/i18n'
import { StatusBadge } from '@/components/badges'

export interface AdminContractRow {
  id: string
  name: string
  status: 'draft' | 'active' | 'expired' | 'terminated'
  targetType: 'organization' | 'user'
  targetId: string
  startDate: string
  endDate: string
}

export const createAdminContractColumns = (t: Translator): ColumnDef<AdminContractRow>[] => [
  { accessorKey: 'name', header: `${t('ui.admin.contracts.contract')} / ${t('ui.admin.contracts.target')}` },
  {
    accessorKey: 'status',
    header: t('ui.common.status'),
    cell: ({ row }) => <StatusBadge status={row.original.status} t={t} />,
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
