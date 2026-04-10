/**
 * 內存版 IDatabaseAccess 實現
 *
 * 當上層未提供真實資料庫（orm='memory'）時，由 DatabaseAccessBuilder 注入此實現，
 * Repository 僅依賴 IDatabaseAccess，無需在底層做 if (db) 分支。
 *
 * @internal - 基礎設施預設實現，由上層決定是否使用
 */

import type { IDatabaseAccess, IQueryBuilder } from '@/Shared/Infrastructure/IDatabaseAccess'

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

  whereBetween(column: string, range: [Date, Date]): IQueryBuilder {
    this.whereConditions.push({ column, operator: '>=', value: range[0] })
    this.whereConditions.push({ column, operator: '<=', value: range[1] })
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
    switch (cond.operator) {
      case '=':
        return val === cond.value
      case '!=':
        return val !== cond.value
      case '>':
        return Number(val) > Number(cond.value) || (val as string) > (cond.value as string)
      case '>=':
        return Number(val) >= Number(cond.value) || (val as string) >= (cond.value as string)
      case '<':
        return Number(val) < Number(cond.value) || (val as string) < (cond.value as string)
      case '<=':
        return Number(val) <= Number(cond.value) || (val as string) <= (cond.value as string)
      case 'LIKE':
        return String(val).includes(String(cond.value).replace(/%/g, ''))
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
