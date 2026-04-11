import { useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from '@/components/ui/table'
import { formatCredit, formatNumber } from '@/lib/format'

export interface ModelComparisonRow {
  model: string
  provider: string | null
  totalCost: number
  totalRequests: number
  avgLatencyMs: number
}

type SortKey = 'cost' | 'requests' | 'latency'
type SortDirection = 'asc' | 'desc'

interface Props {
  data: readonly ModelComparisonRow[]
  title?: string
  className?: string
}

export function ModelComparisonTable({ data, title = '模型比較', className }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('cost')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const sortedRows = [...data].sort((left, right) => {
    const comparison = compareRows(left, right, sortKey)
    return sortDirection === 'asc' ? comparison : -comparison
  })

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>Client-side sortable model comparison</CardDescription>
      </CardHeader>
      <CardContent>
        {sortedRows.length === 0 ? (
          <div className="flex min-h-[240px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            No model comparison data for this window.
          </div>
        ) : (
          <Table>
            <TableCaption>Top 10 models ordered by cached usage cost.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead>Provider</TableHead>
                <SortableHead
                  label="Cost"
                  active={sortKey === 'cost'}
                  direction={sortDirection}
                  onClick={() => toggleSort('cost', sortKey, sortDirection, setSortKey, setSortDirection)}
                />
                <SortableHead
                  label="Requests"
                  active={sortKey === 'requests'}
                  direction={sortDirection}
                  onClick={() => toggleSort('requests', sortKey, sortDirection, setSortKey, setSortDirection)}
                />
                <SortableHead
                  label="Avg Latency"
                  active={sortKey === 'latency'}
                  direction={sortDirection}
                  onClick={() => toggleSort('latency', sortKey, sortDirection, setSortKey, setSortDirection)}
                />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRows.map((row) => (
                <TableRow key={`${row.model}:${row.provider ?? 'none'}`}>
                  <TableCell className="font-medium">{row.model}</TableCell>
                  <TableCell>{row.provider ?? '—'}</TableCell>
                  <TableCell>{formatCredit(row.totalCost)}</TableCell>
                  <TableCell>{formatNumber(row.totalRequests)}</TableCell>
                  <TableCell>{`${formatNumber(row.avgLatencyMs)} ms`}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function SortableHead({
  label,
  active,
  direction,
  onClick,
}: {
  label: string
  active: boolean
  direction: SortDirection
  onClick: () => void
}) {
  return (
    <TableHead>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 -translate-x-2 px-2 text-left font-medium text-muted-foreground hover:text-foreground"
        onClick={onClick}
      >
        <span>{label}</span>
        {active ? (
          direction === 'asc' ? (
            <ArrowUp className="h-3.5 w-3.5" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5" />
        )}
      </Button>
    </TableHead>
  )
}

function compareRows(left: ModelComparisonRow, right: ModelComparisonRow, key: SortKey): number {
  if (key === 'cost') return left.totalCost - right.totalCost
  if (key === 'requests') return left.totalRequests - right.totalRequests
  return left.avgLatencyMs - right.avgLatencyMs
}

function toggleSort(
  nextKey: SortKey,
  currentKey: SortKey,
  currentDirection: SortDirection,
  setSortKey: (value: SortKey) => void,
  setSortDirection: (value: SortDirection) => void,
): void {
  if (nextKey === currentKey) {
    setSortDirection(currentDirection === 'desc' ? 'asc' : 'desc')
    return
  }

  setSortKey(nextKey)
  setSortDirection('desc')
}
