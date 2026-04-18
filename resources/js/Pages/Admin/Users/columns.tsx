import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Link } from '@inertiajs/react'
import { formatDateTime } from '@/lib/format'
import type { Translator } from '@/lib/i18n'
import { ShieldCheck, ShieldAlert } from 'lucide-react'

export interface UserRow {
  id: string
  email: string
  name: string
  role: 'admin' | 'manager' | 'member'
  status: string
  createdAt: string
}

function roleBadge(role: UserRow['role'], t: Translator) {
  const map = {
    admin: { label: t('ui.common.role.admin'), variant: 'default' as const },
    manager: { label: t('ui.common.role.manager'), variant: 'secondary' as const },
    member: { label: t('ui.common.role.member'), variant: 'outline' as const },
  }
  return (
    <Badge
      variant={map[role]?.variant ?? 'outline'}
      className="px-3 py-0.5 rounded-md font-medium capitalize shadow-sm"
    >
      {map[role]?.label ?? role}
    </Badge>
  )
}

function statusBadge(status: string, t: Translator) {
  if (status === 'active') {
    return (
      <Badge className="gap-1.5 px-2.5 py-0.5 rounded-md font-medium capitalize shadow-sm bg-green-500/10 text-green-700 border-green-200/50 hover:bg-green-500/20">
        <ShieldCheck className="h-3 w-3" />
        {t('ui.common.status.active')}
      </Badge>
    )
  }
  return (
    <Badge
      variant="destructive"
      className="gap-1.5 px-2.5 py-0.5 rounded-md font-medium capitalize shadow-sm"
    >
      <ShieldAlert className="h-3 w-3" />
      {t('ui.common.status.inactive')}
    </Badge>
  )
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
    cell: ({ row }) => roleBadge(row.original.role, t),
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
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/admin/users/${row.original.id}`}>{t('ui.common.view')}</Link>
      </Button>
    ),
  },
]
