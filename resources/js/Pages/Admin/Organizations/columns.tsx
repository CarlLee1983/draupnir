import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Link } from '@inertiajs/react'
import { formatDateTime } from '@/lib/format'

export interface OrgRow {
  id: string
  name: string
  slug: string
  status: 'active' | 'suspended'
  memberCount: number
  createdAt: string
}

export const orgColumns: ColumnDef<OrgRow>[] = [
  {
    accessorKey: 'name',
    header: '組織名稱',
  },
  {
    accessorKey: 'slug',
    header: 'Slug',
    cell: ({ row }) => <code className="text-xs">{row.original.slug}</code>,
  },
  {
    accessorKey: 'status',
    header: '狀態',
    cell: ({ row }) =>
      row.original.status === 'active' ? (
        <Badge className="bg-green-500">啟用</Badge>
      ) : (
        <Badge variant="destructive">暫停</Badge>
      ),
  },
  {
    accessorKey: 'memberCount',
    header: '成員數',
  },
  {
    accessorKey: 'createdAt',
    header: '建立時間',
    cell: ({ row }) => formatDateTime(row.original.createdAt),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/admin/organizations/${row.original.id}`}>檢視</Link>
      </Button>
    ),
  },
]
