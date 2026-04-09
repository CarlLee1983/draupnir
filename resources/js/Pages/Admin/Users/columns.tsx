import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Link } from '@inertiajs/react'
import { formatDateTime } from '@/lib/format'

export interface UserRow {
  id: string
  email: string
  name: string
  role: 'admin' | 'manager' | 'member'
  status: string
  createdAt: string
}

function roleBadge(role: UserRow['role']) {
  const map = {
    admin: { label: '管理員', variant: 'default' as const },
    manager: { label: '經理', variant: 'secondary' as const },
    member: { label: '一般', variant: 'outline' as const },
  }
  return <Badge variant={map[role]?.variant ?? 'outline'}>{map[role]?.label ?? role}</Badge>
}

function statusBadge(status: string) {
  return status === 'active' ? (
    <Badge className="bg-green-500 hover:bg-green-600">啟用</Badge>
  ) : (
    <Badge variant="destructive">停用</Badge>
  )
}

export const userColumns: ColumnDef<UserRow>[] = [
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'name',
    header: '名稱',
  },
  {
    accessorKey: 'role',
    header: '角色',
    cell: ({ row }) => roleBadge(row.original.role),
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
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/admin/users/${row.original.id}`}>檢視</Link>
      </Button>
    ),
  },
]
