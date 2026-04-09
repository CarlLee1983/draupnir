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

export interface ApiKeyRow {
  id: string
  label: string
  keyPreview: string
  status: 'active' | 'revoked' | 'suspended_no_credit'
  createdAt: string
  lastUsedAt: string | null
}

function statusBadge(status: ApiKeyRow['status']) {
  switch (status) {
    case 'active':
      return <Badge className="bg-green-500 hover:bg-green-600">啟用</Badge>
    case 'revoked':
      return <Badge variant="destructive">已撤銷</Badge>
    case 'suspended_no_credit':
      return <Badge variant="outline">額度不足</Badge>
  }
}

export function createApiKeyColumns(orgId: string | null): ColumnDef<ApiKeyRow>[] {
  function handleRevoke(keyId: string) {
    if (!confirm('確定要撤銷此 API Key？撤銷後無法復原。')) return
    const q = orgId ? `?orgId=${encodeURIComponent(orgId)}` : ''
    router.post(`/member/api-keys/${keyId}/revoke${q}`, {})
  }

  return [
    {
      accessorKey: 'label',
      header: '名稱',
    },
    {
      accessorKey: 'keyPreview',
      header: 'Key',
      cell: ({ row }) => <code className="text-xs">{maskApiKey(row.original.keyPreview)}</code>,
    },
    {
      accessorKey: 'status',
      header: '狀態',
      cell: ({ row }) => statusBadge(row.original.status),
    },
    {
      accessorKey: 'createdAt',
      header: '建立時間',
      cell: ({ row }) => formatDateTime(row.original.createdAt),
    },
    {
      accessorKey: 'lastUsedAt',
      header: '最後使用',
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
                撤銷
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}
