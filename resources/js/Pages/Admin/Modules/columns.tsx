import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import type { Translator } from '@/lib/i18n'
import { Zap, DollarSign } from 'lucide-react'

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
    cell: ({ row }) => {
      if (row.original.type === 'FREE') {
        return (
          <Badge className="gap-1.5 px-2.5 py-0.5 rounded-md font-medium capitalize shadow-sm bg-blue-500/10 text-blue-700 border-blue-200/50 hover:bg-blue-500/20">
            <Zap className="h-3 w-3" />
            {t('ui.admin.modules.create.typeFree')}
          </Badge>
        )
      }
      return (
        <Badge className="gap-1.5 px-2.5 py-0.5 rounded-md font-medium capitalize shadow-sm bg-amber-500/10 text-amber-700 border-amber-200/50 hover:bg-amber-500/20">
          <DollarSign className="h-3 w-3" />
          {t('ui.admin.modules.create.typePaid')}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'description',
    header: t('ui.common.description'),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.description}</span>
    ),
  },
]
