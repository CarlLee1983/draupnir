/**
 * Atlas QueryBuilder 實現
 *
 * 實現 IQueryBuilder 介面，將 Gravito Atlas ORM 的 API 適配為公開介面
 * 隱藏所有 Atlas 特定的 API 細節，提供統一的查詢 API。
 *
 * @internal 此實現是基礎設施層細節
 */

import type {
  AggregateExpression,
  AggregateSpec,
} from '@/Shared/Infrastructure/Database/AggregateSpec'
import type { IQueryBuilder } from '@/Shared/Infrastructure/IDatabaseAccess'

let dbInstance: any = null;
async function getDB(): Promise<any> {
  if (!dbInstance) {
    dbInstance = (await import('@gravito/atlas')).DB;
  }
  return dbInstance;
}

/**
 * Atlas QueryBuilder 實現
 *
 * 將 Atlas 的查詢 API 轉換為標準的 IQueryBuilder 介面
 */
export class AtlasQueryBuilder implements IQueryBuilder {
  private whereConditions: Array<{ column: string; operator: string; value: unknown }> = []
  private orderByConfig: { column: string; direction: 'ASC' | 'DESC' } | null = null
  private limitValue: number | null = null
  private offsetValue: number | null = null
  private forUpdateFlag = false

  constructor(
    private tableName: string,
    private connection?: any,
  ) {}

  /**
   * 添加 WHERE 條件
   *
   * @param column 欄位名稱
   * @param operator 比較運算子（=, !=, >, <, >=, <=, like, in）
   * @param value 比較值
   * @returns 此 QueryBuilder 實例（用於鏈式調用）
   */
  where(column: string, operator: string, value: unknown): IQueryBuilder {
    this.whereConditions.push({ column, operator, value })
    return this
  }

  /**
   * 取得單筆記錄
   *
   * @returns 第一筆符合條件的記錄，或 null
   */
  async first(): Promise<Record<string, unknown> | null> {
    try {
      let query = (this.connection ?? (await getDB())).table(this.tableName)

      // 應用 WHERE 條件
      for (const cond of this.whereConditions) {
        query = this.applyWhere(query, cond)
      }

      // 應用排序
      if (this.orderByConfig) {
        const dir = this.orderByConfig.direction === 'ASC' ? 'asc' : 'desc'
        query = query.orderBy(this.orderByConfig.column, dir)
      }

      if (this.forUpdateFlag && typeof query.forUpdate === 'function') {
        query = query.forUpdate()
      }

      // Atlas QueryBuilder is not thenable; must call .first() to execute.
      const row = await query.first()

      return (row as Record<string, unknown>) ?? null
    } catch (error) {
      console.error(`Error in first(): ${error}`)
      return null
    }
  }

  /**
   * 取得多筆記錄
   *
   * @returns 符合條件的所有記錄
   */
  async select(): Promise<Record<string, unknown>[]> {
    try {
      let query = (this.connection ?? (await getDB())).table(this.tableName)

      // 應用 WHERE 條件
      for (const cond of this.whereConditions) {
        query = this.applyWhere(query, cond)
      }

      // 應用排序
      if (this.orderByConfig) {
        const dir = this.orderByConfig.direction === 'ASC' ? 'asc' : 'desc'
        query = query.orderBy(this.orderByConfig.column, dir)
      }

      // 應用 OFFSET
      if (this.offsetValue) {
        query = query.offset(this.offsetValue)
      }

      // 應用 LIMIT
      if (this.limitValue) {
        query = query.limit(this.limitValue)
      }

      if (this.forUpdateFlag && typeof query.forUpdate === 'function') {
        query = query.forUpdate()
      }

      // Atlas QueryBuilder is not thenable; must call .get() to execute SELECT.
      return (await query.get()) as Record<string, unknown>[]
    } catch (error) {
      console.error(`Error in select(): ${error}`)
      return []
    }
  }

  /**
   * 插入新記錄
   *
   * @param data 要插入的資料
   */
  async insert(data: Record<string, unknown>): Promise<void> {
    try {
      await (this.connection ?? (await getDB())).table(this.tableName).insert(data)
    } catch (error) {
      console.error(`Error in insert(): ${error}`)
      throw error
    }
  }

  /**
   * 更新記錄
   *
   * @param data 更新的資料
   */
  async update(data: Record<string, unknown>): Promise<void> {
    try {
      let query = (this.connection ?? (await getDB())).table(this.tableName)

      // 應用 WHERE 條件
      for (const cond of this.whereConditions) {
        query = this.applyWhere(query, cond)
      }

      await query.update(data)
    } catch (error) {
      console.error(`Error in update(): ${error}`)
      throw error
    }
  }

  /**
   * 刪除記錄
   */
  async delete(): Promise<void> {
    try {
      let query = (this.connection ?? (await getDB())).table(this.tableName)

      // 應用 WHERE 條件
      for (const cond of this.whereConditions) {
        query = this.applyWhere(query, cond)
      }

      await query.delete()
    } catch (error) {
      console.error(`Error in delete(): ${error}`)
      throw error
    }
  }

  /**
   * 限制返回的記錄數
   *
   * @param value 最多返回的記錄數
   * @returns 此 QueryBuilder 實例
   */
  limit(value: number): IQueryBuilder {
    this.limitValue = value
    return this
  }

  /**
   * 分頁偏移
   *
   * @param value 跳過的記錄數
   * @returns 此 QueryBuilder 實例
   */
  offset(value: number): IQueryBuilder {
    this.offsetValue = value
    return this
  }

  /**
   * 排序
   *
   * @param column 排序欄位
   * @param direction 排序方向（ASC 或 DESC）
   * @returns 此 QueryBuilder 實例
   */
  orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): IQueryBuilder {
    const normalizedDirection = direction.toUpperCase() as 'ASC' | 'DESC'
    this.orderByConfig = { column, direction: normalizedDirection }
    return this
  }

  /**
   * 計算符合條件的記錄數
   *
   * @returns 記錄總數
   */
  async count(): Promise<number> {
    try {
      let query = (this.connection ?? (await getDB())).table(this.tableName)

      // 應用 WHERE 條件
      for (const cond of this.whereConditions) {
        query = this.applyWhere(query, cond)
      }

      // Atlas 使用 count() 方法直接返回數字
      const count = await query.count()
      return count || 0
    } catch (error) {
      console.error(`Error in count(): ${error}`)
      return 0
    }
  }

  /**
   * Inserts a record, silently ignoring if the conflictTarget already exists.
   *
   * Implemented via SQLite's `INSERT OR IGNORE INTO ... VALUES (...)`
   * using `DB.raw()` since Atlas QueryBuilderContract has no native on-conflict API.
   *
   * @param data - The data to insert.
   * @param options.conflictTarget - Ignored (SQLite OR IGNORE applies globally on any UNIQUE constraint).
   */
  async insertOrIgnore(
    data: Record<string, unknown>,
    _options: { readonly conflictTarget: string | readonly string[] },
  ): Promise<void> {
    const columns = Object.keys(data)
    const placeholders = columns.map(() => '?').join(', ')
    const values = Object.values(data)
    const sql = `INSERT OR IGNORE INTO "${this.tableName}" (${columns.map((c) => `"${c}"`).join(', ')}) VALUES (${placeholders})`
    const DB = this.connection ?? (await getDB())
    await DB.raw(sql, values)
  }

  /**
   * Declarative aggregate query translator.
   *
   * Translates an `AggregateSpec` (select / groupBy / orderBy / limit) into
   * a raw SQL query executed via `DB.raw()`. Returns typed result rows.
   *
   * @param spec - Declarative aggregate specification.
   * @returns Array of typed result rows.
   */
  async aggregate<T>(spec: AggregateSpec): Promise<readonly T[]> {
    const selectParts: string[] = Object.entries(spec.select).map(([alias, expr]) => {
      return `${this.compileExpr(expr)} AS "${alias}"`
    })

    // Detect database driver to select the correct parameter placeholder style.
    // PostgreSQL (via pg library) requires $1, $2, … style.
    // SQLite (via bun:sqlite / better-sqlite3) uses ? style.
    // When Atlas is not configured (e.g. unit tests with mock connections) we
    // default to PostgreSQL style because that is the production target.
    const StaticDB = await getDB()
    let isPostgres = true
    try {
      const config: any = StaticDB.getConnectionConfig?.()
      const driver: string = config?.driver ?? config?.write?.driver ?? ''
      if (driver) {
        isPostgres = driver === 'postgres' || driver === 'postgresql'
      }
    } catch {
      // Atlas not configured — keep PostgreSQL default
    }

    let bindingIndex = 0
    const nextPlaceholder = (): string => {
      bindingIndex++
      return isPostgres ? `$${bindingIndex}` : '?'
    }

    const whereParts: string[] = []
    const bindings: unknown[] = []
    for (const cond of this.whereConditions) {
      if (cond.operator === '=') {
        whereParts.push(`"${cond.column}" = ${nextPlaceholder()}`)
        bindings.push(cond.value)
      } else if (cond.operator === 'between' && Array.isArray(cond.value)) {
        const min = nextPlaceholder()
        const max = nextPlaceholder()
        whereParts.push(`"${cond.column}" BETWEEN ${min} AND ${max}`)
        bindings.push(cond.value[0], cond.value[1])
      } else if (cond.operator.toLowerCase() === 'in' && Array.isArray(cond.value)) {
        const values = cond.value as unknown[]
        if (values.length === 0) {
          whereParts.push('1 = 0')
        } else {
          const placeholders = values.map(() => nextPlaceholder()).join(', ')
          whereParts.push(`"${cond.column}" IN (${placeholders})`)
          bindings.push(...values)
        }
      } else {
        whereParts.push(`"${cond.column}" ${cond.operator} ${nextPlaceholder()}`)
        bindings.push(cond.value)
      }
    }

    let sql = `SELECT ${selectParts.join(', ')} FROM "${this.tableName}"`
    if (whereParts.length > 0) {
      sql += ` WHERE ${whereParts.join(' AND ')}`
    }
    if (spec.groupBy && spec.groupBy.length > 0) {
      sql += ` GROUP BY ${spec.groupBy.map((c) => `"${c}"`).join(', ')}`
    }
    if (spec.orderBy && spec.orderBy.length > 0) {
      sql += ` ORDER BY ${spec.orderBy.map((o) => `"${o.column}" ${o.direction}`).join(', ')}`
    }
    if (spec.limit !== undefined) {
      sql += ` LIMIT ${spec.limit}`
    }

    const DB = this.connection ?? StaticDB
    const result = await DB.raw(sql, bindings)
    return Array.isArray(result)
      ? (result as T[])
      : (((result as Record<string, unknown>).rows ?? []) as T[])
  }

  /**
   * Compiles an AggregateExpression into a SQL fragment.
   * @private
   */
  private compileExpr(expr: AggregateExpression): string {
    switch (expr.kind) {
      case 'sum':
        return `SUM(${typeof expr.column === 'string' ? `"${expr.column}"` : this.compileExpr(expr.column)})`
      case 'count':
        return expr.column === '*' ? 'COUNT(*)' : `COUNT("${expr.column}")`
      case 'avg':
        return `AVG(${typeof expr.column === 'string' ? `"${expr.column}"` : this.compileExpr(expr.column)})`
      case 'min':
        return `MIN(${typeof expr.column === 'string' ? `"${expr.column}"` : this.compileExpr(expr.column)})`
      case 'max':
        return `MAX(${typeof expr.column === 'string' ? `"${expr.column}"` : this.compileExpr(expr.column)})`
      case 'dateTrunc':
        // PostgreSQL: TO_CHAR for date truncation to YYYY-MM-DD format
        return `TO_CHAR("${expr.column}", 'YYYY-MM-DD')`
      case 'coalesce': {
        const operand =
          typeof expr.operands[0] === 'string'
            ? `"${expr.operands[0]}"`
            : this.compileExpr(expr.operands[0] as AggregateExpression)
        const fallback =
          typeof expr.operands[1] === 'string' ? `'${expr.operands[1]}'` : String(expr.operands[1])
        return `COALESCE(${operand}, ${fallback})`
      }
      case 'add':
        return `("${expr.left}" + "${expr.right}")`
      case 'column':
        return `"${expr.column}"`
    }
  }

  /**
   * Range query.
   *
   * @param column 欄位名稱
   * @param range 範圍 [開始, 結束]
   * @returns 此 QueryBuilder 實例
   */
  whereBetween(column: string, range: [Date, Date]): IQueryBuilder {
    this.whereConditions.push({ column, operator: 'between', value: range })
    return this
  }

  /**
   * Row-level lock (SELECT ... FOR UPDATE). Must be invoked inside a transaction.
   *
   * If the underlying Atlas query builder does not expose `.forUpdate()` (older
   * version / dialect), the flag is silently dropped — callers fall back to
   * relying on higher layers (advisory lock / app mutex) for serialization.
   */
  forUpdate(): IQueryBuilder {
    this.forUpdateFlag = true
    return this
  }

  /**
   * 應用單個 WHERE 條件到查詢物件
   * @private
   */
  private applyWhere(query: any, cond: { column: string; operator: string; value: unknown }): any {
    switch (cond.operator) {
      case '=':
        return query.where(cond.column, '=', cond.value)
      case '!=':
      case '<>':
        return query.where(cond.column, '!=', cond.value)
      case '>':
        return query.where(cond.column, '>', cond.value)
      case '<':
        return query.where(cond.column, '<', cond.value)
      case '>=':
        return query.where(cond.column, '>=', cond.value)
      case '<=':
        return query.where(cond.column, '<=', cond.value)
      case 'like':
        return query.where(cond.column, 'like', cond.value)
      case 'in':
        return query.whereIn(cond.column, cond.value as any[])
      case 'between':
        return query.whereBetween(cond.column, cond.value as [Date, Date])
      default:
        throw new Error(`Unsupported operator: ${cond.operator}`)
    }
  }
}
