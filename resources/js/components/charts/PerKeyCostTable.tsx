import { Fragment, useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { formatCredit, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ModelRow } from './ModelDistributionDonut'

export interface PerKeyCostRow {
  apiKeyId: string
  keyName: string
  totalCost: number
  totalRequests: number
  totalTokens: number
  costPerRequest: number
  tokensPerRequest: number
  percentOfTotal: number
}

export interface PerKeyCostGrandTotal {
  totalCost: number
  totalRequests: number
  totalTokens: number
}

interface Props {
  rows: readonly PerKeyCostRow[]
  grandTotal: PerKeyCostGrandTotal
  orgId: string
  selectedWindow: 7 | 30 | 90
  className?: string
}

type SortKey =
  | 'keyName'
  | 'cost'
  | 'requests'
  | 'tokens'
  | 'costPerRequest'
  | 'tokensPerRequest'
  | 'percent'
type SortDirection = 'asc' | 'desc'

const DAY_MS = 24 * 60 * 60 * 1000

export function PerKeyCostTable({ rows, grandTotal, orgId, selectedWindow, className }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('cost')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set())
  const [expandedData, setExpandedData] = useState<Record<string, readonly ModelRow[]>>({})
  const [expandedLoading, setExpandedLoading] = useState<ReadonlySet<string>>(new Set())
  const mountedRef = useRef(true)
  const scopeRef = useRef('')

  const scope = `${orgId}:${selectedWindow}`

  useEffect(() => {
    mountedRef.current = true
    scopeRef.current = scope
    setExpanded(new Set())
    setExpandedData({})
    setExpandedLoading(new Set())

    return () => {
      mountedRef.current = false
    }
  }, [scope])

  const sortedRows = [...rows].sort((left, right) => {
    const comparison = compareRows(left, right, sortKey)
    return sortDirection === 'asc' ? comparison : -comparison
  })

  const fetchModelBreakdown = async (keyId: string): Promise<void> => {
    const controller = new AbortController()
    setExpandedLoading((prev) => {
      const next = new Set(prev)
      next.add(keyId)
      return next
    })

    const { startTime, endTime } = resolveDateRange(selectedWindow)
    const query = new URLSearchParams({
      start_time: startTime,
      end_time: endTime,
      api_key_ids: keyId,
    })

    try {
      const response = await fetch(
        `/api/organizations/${encodeURIComponent(orgId)}/dashboard/model-comparison?${query.toString()}`,
        { signal: controller.signal },
      )
      const payload = (await response.json()) as {
        success?: boolean
        message?: string
        data?: { rows?: readonly ModelRow[] }
      }

      if (!payload.success) {
        throw new Error(payload.message ?? 'Failed to load model breakdown')
      }

      if (!mountedRef.current || scopeRef.current !== scope) {
        return
      }

      setExpandedData((prev) => ({
        ...prev,
        [keyId]: payload.data?.rows ?? [],
      }))
    } catch (error_) {
      if (controller.signal.aborted || !mountedRef.current || scopeRef.current !== scope) return
      setExpandedData((prev) => ({
        ...prev,
        [keyId]: [],
      }))
      console.error(error_)
    } finally {
      if (mountedRef.current && scopeRef.current === scope) {
        setExpandedLoading((prev) => {
          const next = new Set(prev)
          next.delete(keyId)
          return next
        })
      }
    }
  }

  const toggleRow = (keyId: string): void => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(keyId)) {
        next.delete(keyId)
      } else {
        next.add(keyId)
      }
      return next
    })

    if (!expandedData[keyId] && !expandedLoading.has(keyId)) {
      void fetchModelBreakdown(keyId)
    }
  }

  if (rows.length === 0) {
    return (
      <div
        className={cn(
          'flex min-h-[240px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground',
          className,
        )}
      >
        No cost data available for this period.
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHead
              label="Key Name"
              active={sortKey === 'keyName'}
              direction={sortDirection}
              onClick={() => toggleSort('keyName', sortKey, sortDirection, setSortKey, setSortDirection)}
            />
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
              label="Tokens"
              active={sortKey === 'tokens'}
              direction={sortDirection}
              onClick={() => toggleSort('tokens', sortKey, sortDirection, setSortKey, setSortDirection)}
            />
            <SortableHead
              label="$ / Request"
              active={sortKey === 'costPerRequest'}
              direction={sortDirection}
              onClick={() =>
                toggleSort('costPerRequest', sortKey, sortDirection, setSortKey, setSortDirection)
              }
            />
            <SortableHead
              label="Tokens / Request"
              active={sortKey === 'tokensPerRequest'}
              direction={sortDirection}
              onClick={() =>
                toggleSort('tokensPerRequest', sortKey, sortDirection, setSortKey, setSortDirection)
              }
            />
            <SortableHead
              label="% of Total"
              active={sortKey === 'percent'}
              direction={sortDirection}
              onClick={() => toggleSort('percent', sortKey, sortDirection, setSortKey, setSortDirection)}
            />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedRows.map((row) => {
            const isExpanded = expanded.has(row.apiKeyId)
            const isLoading = expandedLoading.has(row.apiKeyId)
            const modelRows = expandedData[row.apiKeyId]

            return (
              <Fragment key={row.apiKeyId}>
                <TableRow
                  className="cursor-pointer"
                  onClick={() => toggleRow(row.apiKeyId)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <span>{row.keyName}</span>
                    </div>
                  </TableCell>
                  <TableCell>{formatCredit(row.totalCost)}</TableCell>
                  <TableCell>{formatNumber(row.totalRequests)}</TableCell>
                  <TableCell>{formatNumber(row.totalTokens)}</TableCell>
                  <TableCell>{formatCredit(row.costPerRequest)}</TableCell>
                  <TableCell>{formatNumber(row.tokensPerRequest)}</TableCell>
                  <TableCell>{`${row.percentOfTotal.toFixed(1)}%`}</TableCell>
                </TableRow>
                {isExpanded ? (
                  <TableRow key={`${row.apiKeyId}-expanded`} className="bg-muted/20">
                    <TableCell colSpan={7} className="px-6 py-4">
                      {isLoading ? (
                        <div className="flex items-center gap-3">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Loading model breakdown...</span>
                        </div>
                      ) : modelRows && modelRows.length > 0 ? (
                        <div className="overflow-hidden rounded-lg border bg-background">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Model</TableHead>
                                <TableHead>Cost</TableHead>
                                <TableHead>Requests</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {modelRows.map((modelRow) => (
                                <TableRow key={`${row.apiKeyId}:${modelRow.model}`}>
                                  <TableCell className="font-medium">{modelRow.model}</TableCell>
                                  <TableCell>{formatCredit(modelRow.totalCost)}</TableCell>
                                  <TableCell>{formatNumber(modelRow.totalRequests)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                          No model breakdown available for this key.
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ) : null}
              </Fragment>
            )
          })}
        </TableBody>
        <TableFooter>
          <TableRow className="border-t-2 font-semibold">
            <TableCell>Total</TableCell>
            <TableCell>{formatCredit(grandTotal.totalCost)}</TableCell>
            <TableCell>{formatNumber(grandTotal.totalRequests)}</TableCell>
            <TableCell>{formatNumber(grandTotal.totalTokens)}</TableCell>
            <TableCell>
              {formatCredit(
                grandTotal.totalRequests > 0 ? grandTotal.totalCost / grandTotal.totalRequests : 0,
              )}
            </TableCell>
            <TableCell>
              {formatNumber(
                grandTotal.totalRequests > 0 ? grandTotal.totalTokens / grandTotal.totalRequests : 0,
              )}
            </TableCell>
            <TableCell>100%</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
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

function compareRows(left: PerKeyCostRow, right: PerKeyCostRow, key: SortKey): number {
  switch (key) {
    case 'keyName':
      return left.keyName.localeCompare(right.keyName)
    case 'cost':
      return left.totalCost - right.totalCost
    case 'requests':
      return left.totalRequests - right.totalRequests
    case 'tokens':
      return left.totalTokens - right.totalTokens
    case 'costPerRequest':
      return getCostPerRequest(left) - getCostPerRequest(right)
    case 'tokensPerRequest':
      return getTokensPerRequest(left) - getTokensPerRequest(right)
    case 'percent':
      return left.percentOfTotal - right.percentOfTotal
  }

  return 0
}

function getCostPerRequest(row: PerKeyCostRow): number {
  return row.totalRequests > 0 ? row.totalCost / row.totalRequests : 0
}

function getTokensPerRequest(row: PerKeyCostRow): number {
  return row.totalRequests > 0 ? row.totalTokens / row.totalRequests : 0
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

function resolveDateRange(window: 7 | 30 | 90): { startTime: string; endTime: string } {
  const endTime = new Date().toISOString()
  const startTime = new Date(Date.now() - (window - 1) * DAY_MS).toISOString()
  return { startTime, endTime }
}
