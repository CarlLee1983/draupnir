import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Link } from '@inertiajs/react'
import { formatDate } from '@/lib/format'

export interface AdminContractRow {
  id: string
  name: string
  status: 'draft' | 'active' | 'expired' | 'terminated'
  targetType: 'organization' | 'user'
  targetId: string
  startDate: string
  endDate: string
}

function statusBadge(status: AdminContractRow['status']) {
  const map = {
    draft: { label: '草稿', variant: 'outline' as const },
    active: { label: '生效中', variant: 'default' as const },
    expired: { label: '已過期', variant: 'secondary' as const },
    terminated: { label: '已終止', variant: 'destructive' as const },
  }
  const { label, variant } = map[status]
  return <Badge variant={variant}>{label}</Badge>
}

export const adminContractColumns: ColumnDef<AdminContractRow>[] = [
  { accessorKey: 'name', header: '合約 / 對象' },
  {
    accessorKey: 'status',
    header: '狀態',
    cell: ({ row }) => statusBadge(row.original.status),
  },
  {
    accessorKey: 'targetType',
    header: '對象',
    cell: ({ row }) => (row.original.targetType === 'organization' ? '組織' : '使用者'),
  },
  {
    accessorKey: 'startDate',
    header: '生效日',
    cell: ({ row }) => formatDate(row.original.startDate),
  },
  {
    accessorKey: 'endDate',
    header: '到期日',
    cell: ({ row }) => formatDate(row.original.endDate),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/admin/contracts/${row.original.id}`}>檢視</Link>
      </Button>
    ),
  },
]
