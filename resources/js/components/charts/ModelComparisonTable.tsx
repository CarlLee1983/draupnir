import React, { useState } from 'react'
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
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'

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

export const ModelComparisonTable = React.memo(({ data, title, className }: Props) => {
  const { t } = useTranslation()
  const resolvedTitle = title ?? t('ui.member.dashboard.chartModelComp')
  const [sortKey, setSortKey] = useState<SortKey>('cost')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const sortedRows = [...data].sort((left, right) => {
    const comparison = compareRows(left, right, sortKey)
    return sortDirection === 'asc' ? comparison : -comparison
  })

  return (
    <Card className={cn('overflow-hidden border-border rounded-lg shadow-indigo-500/5 shadow-sm', className)}>
      <CardHeader>
        <CardTitle className="text-base">{resolvedTitle}</CardTitle>
        <CardDescription>{t('ui.charts.modelComparison.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {sortedRows.length === 0 ? (
          <div className="flex min-h-[240px] items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
            {t('ui.charts.modelComparison.empty')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableCaption className="font-mono text-[10px] uppercase tracking-wider">
                {t('ui.charts.modelComparison.caption')}
              </TableCaption>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="font-mono text-[10px] uppercase tracking-wider">
                    {t('ui.charts.modelComparison.colModel')}
                  </TableHead>
                  <TableHead className="font-mono text-[10px] uppercase tracking-wider">
                    {t('ui.charts.modelComparison.colProvider')}
                  </TableHead>
                  <SortableHead
                    label={t('ui.charts.modelComparison.colCost')}
                    active={sortKey === 'cost'}
                    direction={sortDirection}
                    onClick={() => toggleSort('cost', sortKey, sortDirection, setSortKey, setSortDirection)}
                  />
                  <SortableHead
                    label={t('ui.charts.modelComparison.colRequests')}
                    active={sortKey === 'requests'}
                    direction={sortDirection}
                    onClick={() => toggleSort('requests', sortKey, sortDirection, setSortKey, setSortDirection)}
                  />
                  <SortableHead
                    label={t('ui.charts.modelComparison.colLatency')}
                    active={sortKey === 'latency'}
                    direction={sortDirection}
                    onClick={() => toggleSort('latency', sortKey, sortDirection, setSortKey, setSortDirection)}
                  />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRows.map((row) => (
                  <TableRow
                    key={`${row.model}:${row.provider ?? 'none'}`}
                    className="border-border hover:bg-white/[0.02] transition-colors"
                  >
                    <TableCell className="font-medium text-white">{row.model}</TableCell>
                    <TableCell className="text-muted-foreground">{row.provider ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{formatCredit(row.totalCost)}</TableCell>
                    <TableCell className="font-mono text-xs">{formatNumber(row.totalRequests)}</TableCell>
                    <TableCell className="font-mono text-xs">{`${formatNumber(row.avgLatencyMs)} ms`}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
})

ModelComparisonTable.displayName = 'ModelComparisonTable'

const SortableHead = React.memo(
  ({
    label,
    active,
    direction,
    onClick,
  }: {
    label: string
    active: boolean
    direction: SortDirection
    onClick: () => void
  }) => {
    return (
      <TableHead>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            'h-8 -translate-x-2 px-2 text-left font-mono text-[10px] uppercase tracking-wider hover:bg-white/5',
            active ? 'text-indigo-400' : 'text-muted-foreground hover:text-white',
          )}
          onClick={onClick}
        >
          <span>{label}</span>
          {active ? (
            direction === 'asc' ? (
              <ArrowUp className="ml-1 h-3 w-3" />
            ) : (
              <ArrowDown className="ml-1 h-3 w-3" />
            )
          ) : (
            <ArrowUpDown className="ml-1 h-3 w-3 opacity-30" />
          )}
        </Button>
      </TableHead>
    )
  },
)

SortableHead.displayName = 'SortableHead'

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
