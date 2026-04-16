import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { formatDateTime, maskApiKey } from '@/lib/format'
import type { Translator } from '@/lib/i18n'

export interface ApiKeyRow {
  id: string
  label: string
  keyPreview: string
  status: 'active' | 'revoked' | 'suspended_no_credit'
  createdAt: string
  lastUsedAt: string | null
}

function statusBadge(status: ApiKeyRow['status'], t: Translator) {
  switch (status) {
    case 'active':
      return <Badge className="bg-green-500 hover:bg-green-600">{t('ui.common.status.active')}</Badge>
    case 'revoked':
      return <Badge variant="destructive">{t('ui.common.status.revoked')}</Badge>
    case 'suspended_no_credit':
      return <Badge variant="outline">{t('ui.common.status.insufficientCredit')}</Badge>
  }
}

export function createApiKeyColumns(t: Translator): ColumnDef<ApiKeyRow>[] {
  return [
    {
      accessorKey: 'label',
      header: t('ui.common.name'),
    },
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
      accessorKey: 'createdAt',
      header: t('ui.common.createdAt'),
      cell: ({ row }) => formatDateTime(row.original.createdAt),
    },
    {
      accessorKey: 'lastUsedAt',
      header: t('ui.common.lastUsed'),
      cell: ({ row }) => formatDateTime(row.original.lastUsedAt),
    },
  ]
}
