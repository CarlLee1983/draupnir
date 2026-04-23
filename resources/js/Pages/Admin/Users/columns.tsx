import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Link } from '@inertiajs/react'
import { formatDateTime } from '@/lib/format'
import type { Translator } from '@/lib/i18n'
import { RoleBadge, StatusBadge } from '@/components/badges'

export interface UserRow {
  id: string
  email: string
  name: string
  role: 'admin' | 'manager' | 'member'
  status: string
  createdAt: string
}

export const createUserColumns = (t: Translator): ColumnDef<UserRow>[] => [
  {
    accessorKey: 'email',
    header: t('ui.common.email'),
  },
  {
    accessorKey: 'name',
    header: t('ui.common.name'),
  },
  {
    accessorKey: 'role',
    header: t('ui.common.role'),
    cell: ({ row }) => <RoleBadge role={row.original.role} t={t} />,
  },
  {
    accessorKey: 'status',
    header: t('ui.common.status'),
    cell: ({ row }) => <StatusBadge status={row.original.status} t={t} />,
  },
  {
    accessorKey: 'createdAt',
    header: t('ui.common.createdAt'),
    cell: ({ row }) => formatDateTime(row.original.createdAt),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/admin/users/${row.original.id}`}>{t('ui.common.view')}</Link>
      </Button>
    ),
  },
]
