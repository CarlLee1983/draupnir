import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/format'

export interface ContractRow {
  id: string
  name: string
  status: 'draft' | 'active' | 'expired' | 'terminated'
  startDate: string
  endDate: string
  creditQuota: string
}

function statusBadge(status: ContractRow['status']) {
  const map: Record<
    ContractRow['status'],
    { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
  > = {
    draft: { label: '草稿', variant: 'outline' },
    active: { label: '生效中', variant: 'default' },
    expired: { label: '已過期', variant: 'secondary' },
    terminated: { label: '已終止', variant: 'destructive' },
  }
  const { label, variant } = map[status]
  return <Badge variant={variant}>{label}</Badge>
}

export const contractColumns: ColumnDef<ContractRow>[] = [
  {
    accessorKey: 'name',
    header: '合約名稱',
  },
  {
    accessorKey: 'status',
    header: '狀態',
    cell: ({ row }) => statusBadge(row.original.status),
  },
  {
    accessorKey: 'startDate',
    header: '生效日',
    cell: ({ row }) => formatDate(row.original.startDate),
  },
  {
    accessorKey: 'endDate',
    header: '到期日',
    cell: ({ row }) => formatDate(row.original.endDate),
  },
  {
    accessorKey: 'creditQuota',
    header: 'Credit 配額',
  },
]
