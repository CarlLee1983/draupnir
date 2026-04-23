import type { ColumnDef } from '@tanstack/react-table'
import type { Translator } from '@/lib/i18n'
import { StatusBadge } from '@/components/badges'

export interface ModuleRow {
  id: string
  key: string
  name: string
  type: 'FREE' | 'PAID'
  description: string
}

export const createModuleColumns = (t: Translator): ColumnDef<ModuleRow>[] => [
  {
    accessorKey: 'key',
    header: t('ui.admin.modules.columns.moduleKey'),
    cell: ({ row }) => <code className="text-xs">{row.original.key}</code>,
  },
  { accessorKey: 'name', header: t('ui.common.name') },
  {
    accessorKey: 'type',
    header: t('ui.common.type'),
    cell: ({ row }) => <StatusBadge status={row.original.type} t={t} />,
  },
  {
    accessorKey: 'description',
    header: t('ui.common.description'),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.description}</span>
    ),
  },
]
