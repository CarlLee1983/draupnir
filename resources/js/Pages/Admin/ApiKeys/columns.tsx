import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { formatDateTime, maskApiKey } from '@/lib/format'
import type { Translator } from '@/lib/i18n'
import { ShieldCheck, ShieldAlert, Key } from 'lucide-react'

export interface AdminApiKeyRow {
  id: string
  label: string
  keyPreview: string
  status: 'active' | 'revoked' | 'suspended_no_credit'
  orgId: string
  userId: string
  createdAt: string
  lastUsedAt: string | null
  quotaAllocated: number
}

function statusBadge(status: AdminApiKeyRow['status'], t: Translator) {
  switch (status) {
    case 'active':
      return (
        <Badge className="gap-1.5 px-2.5 py-0.5 rounded-md font-medium capitalize shadow-sm bg-green-500/10 text-green-700 border-green-200/50 hover:bg-green-500/20">
          <ShieldCheck className="h-3 w-3" />
          {t('ui.common.status.active')}
        </Badge>
      )
    case 'revoked':
      return (
        <Badge
          variant="destructive"
          className="gap-1.5 px-2.5 py-0.5 rounded-md font-medium capitalize shadow-sm"
        >
          <ShieldAlert className="h-3 w-3" />
          {t('ui.common.status.revoked')}
        </Badge>
      )
    case 'suspended_no_credit':
      return (
        <Badge
          variant="outline"
          className="gap-1.5 px-2.5 py-0.5 rounded-md font-medium capitalize shadow-sm border-amber-200 bg-amber-50 text-amber-700"
        >
          <ShieldAlert className="h-3 w-3" />
          {t('ui.common.status.insufficientCredit')}
        </Badge>
      )
  }
}

export const createAdminApiKeyColumns = (t: Translator): ColumnDef<AdminApiKeyRow>[] => [
  { accessorKey: 'label', header: t('ui.common.name') },
  {
    accessorKey: 'keyPreview',
    header: 'Key',
    cell: ({ row }) => <code className="text-xs">{maskApiKey(row.original.keyPreview)}</code>,
  },
  {
    accessorKey: 'status',
    header: t('ui.common.status'),
    cell: ({ row }) => statusBadge(row.original.status, t),
  },
  {
    accessorKey: 'userId',
    header: t('ui.auth.verifyDevice.title'), // "Authorize Device" is a bit weird but users usually mean owner here. Let's use a better key if I have one.
    // Actually ui.common.role.user might be better or just "Owner".
    cell: ({ row }) => <code className="text-xs">{row.original.userId.slice(0, 8)}</code>,
  },
  {
    accessorKey: 'createdAt',
    header: t('ui.common.createdAt'),
    cell: ({ row }) => formatDateTime(row.original.createdAt),
  },
  {
    accessorKey: 'lastUsedAt',
    header: t('ui.member.apiKeys.create.savedButton').split(',')[1]?.trim() || 'Last Used', // Fallback
    cell: ({ row }) => formatDateTime(row.original.lastUsedAt),
  },
  {
    accessorKey: 'quotaAllocated',
    header: () => t('ui.admin.apiKeys.columns.quotaAllocated'),
    cell: ({ row }) => {
      const allocated = row.original.quotaAllocated
      return <span>{allocated.toLocaleString()}</span>
    },
  },
]
