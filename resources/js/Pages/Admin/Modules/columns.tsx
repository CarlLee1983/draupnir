import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import type { Translator } from '@/lib/i18n'

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
    header: t('ui.admin.modules.create.nameLabel').split('（')[0], // Use a cleaner header
    cell: ({ row }) => <code className="text-xs">{row.original.key}</code>,
  },
  { accessorKey: 'name', header: t('ui.common.name') },
  {
    accessorKey: 'type',
    header: t('ui.common.type'),
    cell: ({ row }) =>
      row.original.type === 'FREE' ? (
        <Badge className="bg-blue-500">{t('ui.admin.modules.create.typeFree')}</Badge>
      ) : (
        <Badge className="bg-amber-500">{t('ui.admin.modules.create.typePaid')}</Badge>
      ),
  },
  {
    accessorKey: 'description',
    header: t('ui.common.description'),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.description}</span>
    ),
  },
]
