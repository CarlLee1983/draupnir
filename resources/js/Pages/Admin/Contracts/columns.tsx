import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Link } from '@inertiajs/react'
import { formatDate } from '@/lib/format'
import type { Translator } from '@/lib/i18n'
import { CheckCircle2, Clock, XCircle, FileText } from 'lucide-react'

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
  switch (status) {
    case 'active':
      return (
        <Badge className="gap-1.5 px-2.5 py-0.5 rounded-md font-medium capitalize shadow-sm bg-green-500/10 text-green-700 border-green-200/50 hover:bg-green-500/20">
          <CheckCircle2 className="h-3 w-3" />
          {t('ui.common.status.active')}
        </Badge>
      )
    case 'draft':
      return (
        <Badge
          variant="outline"
          className="gap-1.5 px-2.5 py-0.5 rounded-md font-medium capitalize shadow-sm bg-muted/50"
        >
          <FileText className="h-3 w-3 text-muted-foreground" />
          {t('ui.common.status.draft')}
        </Badge>
      )
    case 'expired':
      return (
        <Badge
          variant="secondary"
          className="gap-1.5 px-2.5 py-0.5 rounded-md font-medium capitalize shadow-sm"
        >
          <Clock className="h-3 w-3" />
          {t('ui.common.status.expired')}
        </Badge>
      )
    case 'terminated':
      return (
        <Badge
          variant="destructive"
          className="gap-1.5 px-2.5 py-0.5 rounded-md font-medium capitalize shadow-sm"
        >
          <XCircle className="h-3 w-3" />
          {t('ui.common.status.terminated')}
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="px-2.5 py-0.5 rounded-md shadow-sm">
          {status}
        </Badge>
      )
  }
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
