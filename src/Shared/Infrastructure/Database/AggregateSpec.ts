/**
 * Aggregate Specification - Declarative aggregation query contract.
 *
 * Honors D-01 (single declarative method), D-03 (closed primitive set),
 * and D-04 (no raw-SQL escape hatch).
 */

export type AggregateExpression =
  | { readonly kind: 'sum'; readonly column: string | AggregateExpression }
  | { readonly kind: 'count'; readonly column: string | '*' }
  | { readonly kind: 'avg'; readonly column: string | AggregateExpression }
  | { readonly kind: 'min'; readonly column: string | AggregateExpression }
  | { readonly kind: 'max'; readonly column: string | AggregateExpression }
  | { readonly kind: 'dateTrunc'; readonly unit: 'day'; readonly column: string }
  | {
      readonly kind: 'coalesce'
      readonly operands: readonly [string | AggregateExpression, number | string]
    }
  | { readonly kind: 'add'; readonly left: string; readonly right: string }
  | { readonly kind: 'column'; readonly column: string }

export interface AggregateOrderBy {
  readonly column: string // either a plain column name or an alias from `select`
  readonly direction: 'ASC' | 'DESC'
}

export interface AggregateSpec {
  readonly select: Readonly<Record<string, AggregateExpression>>
  readonly groupBy?: readonly string[] // column names OR select aliases
  readonly orderBy?: readonly AggregateOrderBy[]
  readonly limit?: number
}

// Builder functions (ergonomic authoring surface):

export const sum = (column: string | AggregateExpression): AggregateExpression => ({
  kind: 'sum',
  column,
})
export const count = (column: string | '*' = '*'): AggregateExpression => ({
  kind: 'count',
  column,
})
export const avg = (column: string | AggregateExpression): AggregateExpression => ({
  kind: 'avg',
  column,
})
export const min = (column: string | AggregateExpression): AggregateExpression => ({
  kind: 'min',
  column,
})
export const max = (column: string | AggregateExpression): AggregateExpression => ({
  kind: 'max',
  column,
})
export const dateTrunc = (unit: 'day', column: string): AggregateExpression => ({
  kind: 'dateTrunc',
  unit,
  column,
})
export const coalesce = (
  expr: string | AggregateExpression,
  fallback: number | string,
): AggregateExpression => ({ kind: 'coalesce', operands: [expr, fallback] })
export const add = (left: string, right: string): AggregateExpression => ({
  kind: 'add',
  left,
  right,
})
export const col = (column: string): AggregateExpression => ({ kind: 'column', column })
