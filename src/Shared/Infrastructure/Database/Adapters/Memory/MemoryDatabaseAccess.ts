/**
 * 內存版 IDatabaseAccess 實現
 *
 * 當上層未提供真實資料庫（orm='memory'）時，由 DatabaseAccessBuilder 注入此實現，
 * Repository 僅依賴 IDatabaseAccess，無需在底層做 if (db) 分支。
 *
 * @internal - 基礎設施預設實現，由上層決定是否使用
 */

import type { IDatabaseAccess, IQueryBuilder } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { AggregateExpression, AggregateSpec } from '../../AggregateSpec'

type WhereCondition = { column: string; operator: string; value: unknown }

class MemoryQueryBuilder implements IQueryBuilder {
  private limitNum: number | null = null
  private offsetNum: number | null = null
  private orderByColumn: string | null = null
  private orderByDirection: 'ASC' | 'DESC' = 'ASC'
  private whereConditions: WhereCondition[] = []

  constructor(
    private tableName: string,
    private store: Map<string, Record<string, unknown>[]>,
  ) {}

  where(column: string, operator: string, value: unknown): IQueryBuilder {
    this.whereConditions.push({ column, operator, value })
    return this
  }

  limit(n: number): IQueryBuilder {
    this.limitNum = n
    return this
  }

  offset(n: number): IQueryBuilder {
    this.offsetNum = n
    return this
  }

  orderBy(column: string, direction: 'ASC' | 'DESC'): IQueryBuilder {
    this.orderByColumn = column
    this.orderByDirection = direction
    return this
  }

  whereBetween(column: string, range: readonly [Date | string, Date | string]): IQueryBuilder {
    this.whereConditions.push({ column, operator: '>=', value: range[0] })
    this.whereConditions.push({ column, operator: '<=', value: range[1] })
    return this
  }

  forUpdate(): IQueryBuilder {
    // Memory adapter is single-threaded; no-op.
    return this
  }

  private getTableRows(): Record<string, unknown>[] {
    if (!this.store.has(this.tableName)) {
      this.store.set(this.tableName, [])
    }
    return this.store.get(this.tableName)!
  }

  private matchRow(row: Record<string, unknown>, cond: WhereCondition): boolean {
    const val = row[cond.column]
    if (val === undefined && !(cond.column in row)) return false

    const op = cond.operator.toLowerCase()
    const targetValue = cond.value instanceof Date ? cond.value.toISOString() : cond.value

    switch (op) {
      case '=':
        return val === targetValue
      case '!=':
      case '<>':
        return val !== targetValue
      case '>':
        return Number(val) > Number(targetValue) || (val as string) > (targetValue as string)
      case '>=':
        return Number(val) >= Number(targetValue) || (val as string) >= (targetValue as string)
      case '<':
        return Number(val) < Number(targetValue) || (val as string) < (targetValue as string)
      case '<=':
        return Number(val) <= Number(targetValue) || (val as string) <= (targetValue as string)
      case 'like':
        return String(val).includes(String(targetValue).replace(/%/g, ''))
      default:
        return false
    }
  }

  private filterRows(
    rows: Record<string, unknown>[],
    options?: { skipLimitOffset?: boolean },
  ): Record<string, unknown>[] {
    let result = rows
    for (const cond of this.whereConditions) {
      result = result.filter((row) => this.matchRow(row, cond))
    }
    if (this.orderByColumn != null) {
      result = [...result].sort((a, b) => {
        const aVal = a[this.orderByColumn!] as string | number
        const bVal = b[this.orderByColumn!] as string | number
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
        return this.orderByDirection === 'DESC' ? -cmp : cmp
      })
    }
    if (!options?.skipLimitOffset) {
      if (this.offsetNum != null) {
        result = result.slice(this.offsetNum)
      }
      if (this.limitNum != null) {
        result = result.slice(0, this.limitNum)
      }
    }
    return result
  }

  async first(): Promise<Record<string, unknown> | null> {
    const rows = this.getTableRows()
    const filtered = this.filterRows(rows)
    return filtered[0] ?? null
  }

  async select(): Promise<Record<string, unknown>[]> {
    const rows = this.getTableRows()
    return this.filterRows(rows)
  }

  async insert(data: Record<string, unknown>): Promise<void> {
    const rows = this.getTableRows()
    rows.push({ ...data })
  }

  async insertOrIgnore(
    data: Record<string, unknown>,
    { conflictTarget }: { readonly conflictTarget: string | readonly string[] },
  ): Promise<void> {
    const rows = this.getTableRows()
    const targets = Array.isArray(conflictTarget) ? [...conflictTarget] : [conflictTarget]

    const hasConflict = rows.some((row) => targets.every((t) => row[t] === data[t]))

    if (!hasConflict) {
      rows.push({ ...data })
    }
  }

  async update(data: Record<string, unknown>): Promise<void> {
    const rows = this.getTableRows()
    const filtered = this.filterRows(rows)
    // 使用 id 字段來識別需要更新的行，而不是依賴對象引用
    const filteredIds = new Set(filtered.map((row) => row.id))
    for (let i = 0; i < rows.length; i++) {
      if (filteredIds.has(rows[i].id)) {
        rows[i] = { ...rows[i], ...data }
      }
    }
  }

  async delete(): Promise<void> {
    const rows = this.getTableRows()
    const filtered = this.filterRows(rows)
    // 使用 id 字段來識別需要刪除的行，而不是依賴對象引用
    const filteredIds = new Set(filtered.map((row) => row.id))
    for (let i = rows.length - 1; i >= 0; i--) {
      if (filteredIds.has(rows[i].id)) {
        rows.splice(i, 1)
      }
    }
  }

  async count(): Promise<number> {
    const rows = this.getTableRows()
    const filtered = this.filterRows(rows, { skipLimitOffset: true })
    return filtered.length
  }

  async aggregate<T>(spec: AggregateSpec): Promise<readonly T[]> {
    const filtered = this.filterRows(this.getTableRows(), { skipLimitOffset: true })

    // 1. Group
    const groups = new Map<string, Record<string, unknown>[]>()
    const groupCols = spec.groupBy ?? []

    if (filtered.length === 0 && groupCols.length === 0) {
      // SQL behavior: without GROUP BY, always returns 1 row even for empty table
      groups.set('_all', [])
    } else {
      for (const row of filtered) {
        const key =
          groupCols.length === 0
            ? '_all'
            : groupCols
                .map((g) => {
                  const selectExpr = spec.select[g]
                  const val = selectExpr !== undefined ? evalExpression(row, selectExpr) : row[g]
                  return String(val)
                })
                .join('\x1f')
        if (!groups.has(key)) groups.set(key, [])
        groups.get(key)!.push(row)
      }
    }

    // 2. Evaluate select expressions per group
    let result: Record<string, unknown>[] = []
    for (const groupRows of groups.values()) {
      const out: Record<string, unknown> = {}
      for (const [alias, expr] of Object.entries(spec.select)) {
        out[alias] = reduceAggregate(groupRows, expr)
      }
      result.push(out)
    }

    // 3. orderBy
    if (spec.orderBy && spec.orderBy.length > 0) {
      result.sort((a, b) => {
        for (const o of spec.orderBy!) {
          const av = a[o.column]
          const bv = b[o.column]
          if (av == null && bv == null) continue
          if (av == null) return o.direction === 'ASC' ? -1 : 1
          if (bv == null) return o.direction === 'ASC' ? 1 : -1

          const na = typeof av === 'number' ? av : Number(av)
          const nb = typeof bv === 'number' ? bv : Number(bv)

          if (!Number.isNaN(na) && !Number.isNaN(nb)) {
            if (na !== nb) return o.direction === 'ASC' ? na - nb : nb - na
          } else {
            const sa = String(av)
            const sb = String(bv)
            if (sa !== sb) return o.direction === 'ASC' ? (sa < sb ? -1 : 1) : sa < sb ? 1 : -1
          }
        }
        return 0
      })
    }

    // 4. limit
    if (spec.limit !== undefined) {
      result = result.slice(0, spec.limit)
    }

    return result as readonly T[]
  }
}

/**
 * evalExpression: 針對單一行評估運算式（非聚合）
 */
function evalExpression(row: Record<string, unknown>, expr: AggregateExpression): unknown {
  switch (expr.kind) {
    case 'column':
      return row[expr.column]
    case 'dateTrunc': {
      if (expr.unit !== 'day') throw new Error(`Unsupported unit: ${expr.unit}`)
      const v = row[expr.column]
      return v == null ? null : String(v).slice(0, 10)
    }
    case 'coalesce': {
      const [first, fallback] = expr.operands
      const val = typeof first === 'string' ? row[first] : evalExpression(row, first)
      return val ?? fallback
    }
    case 'add': {
      const a = row[expr.left]
      const b = row[expr.right]
      return a == null || b == null ? null : Number(a) + Number(b)
    }
    default:
      throw new Error(
        `evalExpression: unsupported kind '${expr.kind}' — aggregators belong in reduceAggregate`,
      )
  }
}

/**
 * valueFor: 取得欄位值或評估運算式值
 */
function valueFor(row: Record<string, unknown>, col: string | AggregateExpression): unknown {
  return typeof col === 'string' ? row[col] : evalExpression(row, col)
}

/**
 * reduceAggregate: 針對整組行計算聚合值
 */
function reduceAggregate(
  rows: readonly Record<string, unknown>[],
  expr: AggregateExpression,
): unknown {
  switch (expr.kind) {
    case 'sum': {
      if (rows.length === 0) return null
      let total = 0
      let hasValue = false
      for (const r of rows) {
        const v = valueFor(r, expr.column)
        if (v != null) {
          total += Number(v)
          hasValue = true
        }
      }
      return hasValue ? total : null
    }
    case 'count':
      if (expr.column === '*') return rows.length
      return rows.filter((r) => r[expr.column as string] != null).length
    case 'avg': {
      const values: number[] = []
      for (const r of rows) {
        const val = valueFor(r, expr.column)
        if (val != null) values.push(Number(val))
      }
      return values.length === 0 ? null : values.reduce((s, x) => s + x, 0) / values.length
    }
    case 'min': {
      let m: number | null = null
      for (const r of rows) {
        const v = valueFor(r, expr.column)
        if (v == null) continue
        const n = Number(v)
        if (m === null || n < m) m = n
      }
      return m
    }
    case 'max': {
      let m: number | null = null
      for (const r of rows) {
        const v = valueFor(r, expr.column)
        if (v == null) continue
        const n = Number(v)
        if (m === null || n > m) m = n
      }
      return m
    }
    case 'dateTrunc':
    case 'coalesce':
    case 'add':
    case 'column':
      if (rows.length === 0) return null
      return evalExpression(rows[0], expr)
    default: {
      const _exhaustive: never = expr
      throw new Error(`Unhandled expression kind: ${(_exhaustive as any).kind}`)
    }
  }
}

/**
 * 內存版 IDatabaseAccess，用於無真實資料庫時由上層注入。
 * 每個實例擁有獨立儲存（不跨實例共用）。
 */
export class MemoryDatabaseAccess implements IDatabaseAccess {
  private store = new Map<string, Record<string, unknown>[]>()

  table(name: string): IQueryBuilder {
    return new MemoryQueryBuilder(name, this.store)
  }

  async transaction<T>(fn: (tx: IDatabaseAccess) => Promise<T>): Promise<T> {
    return fn(this)
  }
}
