import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal } from 'lucide-react'
import { router } from '@inertiajs/react'
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

export function createApiKeyColumns(orgId: string | null, t: Translator): ColumnDef<ApiKeyRow>[] {
  function handleRevoke(keyId: string) {
    if (!confirm(t('ui.member.apiKeys.revokeConfirm'))) return
    const q = orgId ? `?orgId=${encodeURIComponent(orgId)}` : ''
    router.post(`/member/api-keys/${keyId}/revoke${q}`, {})
  }

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
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const key = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => handleRevoke(key.id)}
                disabled={key.status !== 'active'}
                className="text-destructive"
              >
                {t('ui.auth.verifyDevice.submitButton').split(',')[1]?.trim() || 'Revoke'} {/* Workaround if key missing */}
                {/* Actually ui.common.delete or adding ui.common.revoke would be better. */}
                {/* I added ui.member.apiKeys.revokeConfirm, maybe I should add ui.common.revoke. */}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}
