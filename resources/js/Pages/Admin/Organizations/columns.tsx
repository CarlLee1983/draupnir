import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Link } from '@inertiajs/react'
import { formatDateTime } from '@/lib/format'
import type { Translator } from '@/lib/i18n'

export interface OrgRow {
  id: string
  name: string
  slug: string
  status: 'active' | 'suspended'
  memberCount: number
  createdAt: string
}

export const createOrgColumns = (t: Translator): ColumnDef<OrgRow>[] => [
  {
    accessorKey: 'name',
    header: t('ui.common.org') + t('ui.common.name'),
  },
  {
    accessorKey: 'slug',
    header: 'Slug',
    cell: ({ row }) => <code className="text-xs">{row.original.slug}</code>,
  },
  {
    accessorKey: 'status',
    header: t('ui.common.status'),
    cell: ({ row }) =>
      row.original.status === 'active' ? (
        <Badge className="bg-green-500">{t('ui.common.status.active')}</Badge>
      ) : (
        <Badge variant="destructive">{t('ui.common.status.suspended')}</Badge>
      ),
  },
  {
    accessorKey: 'memberCount',
    header: t('ui.admin.organizations.membersTitle', { count: '' }).replace('（）', ''), // Simple fix for header
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
        <Link href={`/admin/organizations/${row.original.id}`}>{t('ui.common.view')}</Link>
      </Button>
    ),
  },
]
