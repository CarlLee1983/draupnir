/**
 * Drizzle QueryBuilder 實現
 *
 * 實現 IQueryBuilder 介面，將 Drizzle ORM 的 API 適配為公開介面
 *
 * @internal 此實現是基礎設施層細節
 */

import {
  and,
  asc,
  between,
  countDistinct,
  desc,
  avg as drizzleAvg,
  count as drizzleCount,
  max as drizzleMax,
  min as drizzleMin,
  sum as drizzleSum,
  eq,
  gt,
  gte,
  inArray,
  like,
  lt,
  lte,
  ne,
  type SQL,
  sql,
} from 'drizzle-orm'
import type { IQueryBuilder } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { AggregateExpression, AggregateOrderBy, AggregateSpec } from '../../AggregateSpec'
import type { getDrizzleInstance } from './config'

/**
 * Drizzle QueryBuilder 實現
 *
 * 將 Drizzle 的查詢 API 轉換為標準的 IQueryBuilder 介面
 */
export class DrizzleQueryBuilder implements IQueryBuilder {
  private whereConditions: any[] = []
  private orderByConfig: { column: string; direction: 'ASC' | 'DESC' } | null = null
  private limitValue: number | null = null
  private offsetValue: number | null = null

  constructor(
    private db: ReturnType<typeof getDrizzleInstance>,
    private tableName: string,
    private tableSchema: any,
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
    const col = this.tableSchema[column]

    if (!col) {
      throw new Error(`Column "${column}" not found in table "${this.tableName}"`)
    }

    switch (operator) {
      case '=':
        this.whereConditions.push(eq(col, value))
        break
      case '!=':
      case '<>':
        this.whereConditions.push(ne(col, value))
        break
      case '>':
        this.whereConditions.push(gt(col, value))
        break
      case '<':
        this.whereConditions.push(lt(col, value))
        break
      case '>=':
        this.whereConditions.push(gte(col, value))
        break
      case '<=':
        this.whereConditions.push(lte(col, value))
        break
      case 'like':
        this.whereConditions.push(like(col, value as string))
        break
      case 'in':
        this.whereConditions.push(inArray(col, value as any[]))
        break
      default:
        throw new Error(`Unsupported operator: ${operator}`)
    }

    return this
  }

  /**
   * 取得單筆記錄
   *
   * @returns 第一筆符合條件的記錄，或 null
   */
  async first(): Promise<Record<string, unknown> | null> {
    try {
      let query: any = (this.db as any).select().from(this.tableSchema)

      if (this.whereConditions.length > 0) {
        query = query.where(and(...this.whereConditions))
      }

      query = query.limit(1)

      const results = await query

      return results[0] || null
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
      let query: any = (this.db as any).select().from(this.tableSchema)

      if (this.whereConditions.length > 0) {
        query = query.where(and(...this.whereConditions))
      }

      if (this.orderByConfig) {
        const col = this.tableSchema[this.orderByConfig.column]
        query = query.orderBy(this.orderByConfig.direction === 'ASC' ? asc(col) : desc(col))
      }

      if (this.offsetValue) {
        query = query.offset(this.offsetValue)
      }

      if (this.limitValue) {
        query = query.limit(this.limitValue)
      }

      return await query
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
      await (this.db as any).insert(this.tableSchema).values(data)
    } catch (error) {
      console.error(`Error in insert(): ${error}`)
      throw error
    }
  }

  async insertOrIgnore(
    data: Record<string, unknown>,
    { conflictTarget }: { readonly conflictTarget: string | readonly string[] },
  ): Promise<void> {
    try {
      const targets = Array.isArray(conflictTarget)
        ? conflictTarget.map((c) => this.resolveColumn(c))
        : [this.resolveColumn(conflictTarget as string)]

      await (this.db as any)
        .insert(this.tableSchema)
        .values(data)
        .onConflictDoNothing({ target: targets as any })
    } catch (error) {
      console.error(`Error in insertOrIgnore(): ${error}`)
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
      let query: any = (this.db as any).update(this.tableSchema).set(data)

      if (this.whereConditions.length > 0) {
        query = query.where(and(...this.whereConditions))
      }

      await query
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
      let query: any = (this.db as any).delete(this.tableSchema)

      if (this.whereConditions.length > 0) {
        query = query.where(and(...this.whereConditions))
      }

      await query
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
      const col = this.tableSchema.id

      let query: any = (this.db as any).select({ count: countDistinct(col) }).from(this.tableSchema)

      if (this.whereConditions.length > 0) {
        query = query.where(and(...this.whereConditions))
      }

      const result = await query

      return result[0]?.count || 0
    } catch (error) {
      console.error(`Error in count(): ${error}`)
      return 0
    }
  }

  /**
   * 範圍查詢
   *
   * @param column 欄位名稱
   * @param range 範圍 [開始, 結束]
   * @returns 此 QueryBuilder 實例
   */
  whereBetween(column: string, range: [Date, Date]): IQueryBuilder {
    const col = this.tableSchema[column]

    if (!col) {
      throw new Error(`Column "${column}" not found in table "${this.tableName}"`)
    }

    const start = range[0] instanceof Date ? range[0].toISOString() : range[0]
    const end = range[1] instanceof Date ? range[1].toISOString() : range[1]

    this.whereConditions.push(between(col, start, end))
    return this
  }

  /**
   * 宣告式聚合查詢
   *
   * @param spec 聚合規格
   * @returns 聚合結果陣列
   */
  async aggregate<T>(spec: AggregateSpec): Promise<readonly T[]> {
    try {
      // 1. 建立 select 物件：別名 -> SQL 表達式
      const selectShape: Record<string, SQL> = {}
      for (const [alias, expr] of Object.entries(spec.select)) {
        selectShape[alias] = this.translateExpression(expr)
      }

      // 2. 建立查詢並加入累積的 where 條件
      let query: any = (this.db as any).select(selectShape).from(this.tableSchema)

      if (this.whereConditions.length > 0) {
        query = query.where(and(...this.whereConditions))
      }

      // 3. groupBy — 將每個項目解析為 select 別名或原始欄位
      if (spec.groupBy && spec.groupBy.length > 0) {
        const groupCols = spec.groupBy.map((name) =>
          selectShape[name] !== undefined ? selectShape[name] : this.resolveColumn(name),
        )
        query = query.groupBy(...groupCols)
      }

      // 4. orderBy — 同樣支援別名或原始欄位
      if (spec.orderBy && spec.orderBy.length > 0) {
        const orderExprs = spec.orderBy.map((o: AggregateOrderBy) => {
          const base =
            selectShape[o.column] !== undefined
              ? selectShape[o.column]
              : this.resolveColumn(o.column)
          return o.direction === 'DESC' ? desc(base as any) : asc(base as any)
        })
        query = query.orderBy(...orderExprs)
      }

      // 5. limit
      if (spec.limit !== undefined) {
        query = query.limit(spec.limit)
      }

      const rows = await query
      return rows as readonly T[]
    } catch (error) {
      console.error(`Error in aggregate(): ${error}`)
      throw error
    }
  }

  private resolveColumn(name: string): SQL | unknown {
    const col = this.tableSchema[name]
    if (col === undefined) {
      throw new Error(`Column "${name}" not found on table "${this.tableName}"`)
    }
    return col
  }

  private translateExpression(expr: AggregateExpression): SQL {
    switch (expr.kind) {
      case 'sum':
        return (
          typeof expr.column === 'string'
            ? drizzleSum(this.resolveColumn(expr.column) as any)
            : drizzleSum(this.translateExpression(expr.column))
        ).mapWith(Number)
      case 'count':
        return (
          expr.column === '*'
            ? drizzleCount()
            : drizzleCount(this.resolveColumn(expr.column) as any)
        ).mapWith(Number)
      case 'avg':
        return (
          typeof expr.column === 'string'
            ? drizzleAvg(this.resolveColumn(expr.column) as any)
            : drizzleAvg(this.translateExpression(expr.column))
        ).mapWith(Number)
      case 'min':
        return (
          typeof expr.column === 'string'
            ? drizzleMin(this.resolveColumn(expr.column) as any)
            : drizzleMin(this.translateExpression(expr.column))
        ).mapWith(Number)
      case 'max':
        return (
          typeof expr.column === 'string'
            ? drizzleMax(this.resolveColumn(expr.column) as any)
            : drizzleMax(this.translateExpression(expr.column))
        ).mapWith(Number)
      case 'dateTrunc':
        if (expr.unit !== 'day') throw new Error(`Unsupported dateTrunc unit: ${expr.unit}`)
        return sql<string>`strftime('%Y-%m-%d', ${this.resolveColumn(expr.column)})`
      case 'coalesce': {
        const [first, fallback] = expr.operands
        const firstSql =
          typeof first === 'string' ? this.resolveColumn(first) : this.translateExpression(first)
        return sql`COALESCE(${firstSql}, ${fallback})`
      }
      case 'add':
        return sql<number>`(${this.resolveColumn(expr.left)} + ${this.resolveColumn(expr.right)})`
      case 'column':
        return sql`${this.resolveColumn(expr.column)}`
      default: {
        const _exhaustive: never = expr
        throw new Error(`Unhandled expression kind: ${(_exhaustive as { kind: string }).kind}`)
      }
    }
  }
}
