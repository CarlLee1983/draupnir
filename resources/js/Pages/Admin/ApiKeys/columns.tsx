import type { ColumnDef } from '@tanstack/react-table'
import { formatDateTime, maskApiKey } from '@/lib/format'
import type { Translator } from '@/lib/i18n'
import { StatusBadge } from '@/components/badges'

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

export const createAdminApiKeyColumns = (t: Translator): ColumnDef<AdminApiKeyRow>[] => [
  { accessorKey: 'label', header: t('ui.common.name') },
  {
    accessorKey: 'keyPreview',
    header: t('ui.admin.apiKeys.columns.key'),
    cell: ({ row }) => <code className="text-xs">{maskApiKey(row.original.keyPreview)}</code>,
  },
  {
    accessorKey: 'status',
    header: t('ui.common.status'),
    cell: ({ row }) => <StatusBadge status={row.original.status} t={t} />,
  },
  {
    accessorKey: 'userId',
    header: t('ui.admin.apiKeys.ownerLabel'),
    cell: ({ row }) => <code className="text-xs">{row.original.userId.slice(0, 8)}</code>,
  },
  {
    accessorKey: 'createdAt',
    header: t('ui.common.createdAt'),
    cell: ({ row }) => formatDateTime(row.original.createdAt),
  },
  {
    accessorKey: 'lastUsedAt',
    header: t('ui.common.lastUsed'),
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
