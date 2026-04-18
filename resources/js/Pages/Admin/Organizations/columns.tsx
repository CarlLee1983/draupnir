import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Link } from '@inertiajs/react'
import { formatDateTime } from '@/lib/format'
import type { Translator } from '@/lib/i18n'
import { ShieldCheck, ShieldAlert } from 'lucide-react'

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
    cell: ({ row }) => {
      if (row.original.status === 'active') {
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
          {t('ui.common.status.suspended')}
        </Badge>
      )
    },
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
