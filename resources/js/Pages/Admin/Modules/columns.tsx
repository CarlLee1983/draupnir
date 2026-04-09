import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'

export interface ModuleRow {
  id: string
  key: string
  name: string
  type: 'FREE' | 'PAID'
  description: string
}

export const moduleColumns: ColumnDef<ModuleRow>[] = [
  {
    accessorKey: 'key',
    header: '識別碼',
    cell: ({ row }) => <code className="text-xs">{row.original.key}</code>,
  },
  { accessorKey: 'name', header: '名稱' },
  {
    accessorKey: 'type',
    header: '類型',
    cell: ({ row }) =>
      row.original.type === 'FREE' ? (
        <Badge className="bg-blue-500">免費</Badge>
      ) : (
        <Badge className="bg-amber-500">付費</Badge>
      ),
  },
  {
    accessorKey: 'description',
    header: '描述',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.description}</span>
    ),
  },
]
