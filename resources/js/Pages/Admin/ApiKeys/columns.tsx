import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { formatDateTime, maskApiKey } from '@/lib/format'

export interface AdminApiKeyRow {
  id: string
  label: string
  keyPreview: string
  status: 'active' | 'revoked' | 'suspended_no_credit'
  orgId: string
  userId: string
  createdAt: string
  lastUsedAt: string | null
}

function statusBadge(status: AdminApiKeyRow['status']) {
  switch (status) {
    case 'active':
      return <Badge className="bg-green-500 hover:bg-green-600">啟用</Badge>
    case 'revoked':
      return <Badge variant="destructive">已撤銷</Badge>
    case 'suspended_no_credit':
      return <Badge variant="outline">額度不足</Badge>
  }
}

export const adminApiKeyColumns: ColumnDef<AdminApiKeyRow>[] = [
  { accessorKey: 'label', header: '名稱' },
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
    accessorKey: 'userId',
    header: '擁有者',
    cell: ({ row }) => <code className="text-xs">{row.original.userId.slice(0, 8)}</code>,
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
]
