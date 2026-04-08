/**
 * Drizzle DatabaseAccess 適配器
 *
 * 實現 IDatabaseAccess 介面，將 Drizzle ORM 適配為公開介面
 * 隱藏所有 Drizzle 特定的 API 細節
 *
 * @internal 此實現是基礎設施層細節
 */

import type { IDatabaseAccess, IQueryBuilder } from '@/Shared/Infrastructure/IDatabaseAccess'
import { getDrizzleInstance } from './config'
import { DrizzleQueryBuilder } from './DrizzleQueryBuilder'
import * as schema from './schema'

/**
 * Drizzle DatabaseAccess 實現
 *
 * 提供 ORM 無關的資料庫訪問介面
 */
class DrizzleDatabaseAccess implements IDatabaseAccess {
  /**
   * 取得表的查詢建構器
   *
   * @param name 表名稱
   * @returns QueryBuilder 實例，用於構建查詢
   *
   * @example
   * const users = await db.table('users').select()
   * const user = await db.table('users').where('id', '=', userId).first()
   */
  table(name: string): IQueryBuilder {
    const db = getDrizzleInstance()
    const tableSchema = (schema as any)[name]

    if (!tableSchema) {
      throw new Error(`Table "${name}" not found in schema. Available tables: ${Object.keys(schema).join(', ')}`)
    }

    return new DrizzleQueryBuilder(db, name, tableSchema)
  }
}

/**
 * 建立 Drizzle DatabaseAccess 實例
 *
 * 此工廠函數是唯一建立 Drizzle 適配器的方式
 * 應用層通過此函數注入 IDatabaseAccess
 *
 * @returns 實現 IDatabaseAccess 介面的實例
 *
 * @example
 * // 在 Wiring 層中使用
 * const db = createDrizzleDatabaseAccess()
 * container.singleton('database', () => db)
 *
 * // Repository 中使用
 * class UserRepository {
 *   constructor(private db: IDatabaseAccess) {}
 *   async findById(id: string) {
 *     return this.db.table('users').where('id', '=', id).first()
 *   }
 * }
 */
export function createDrizzleDatabaseAccess(): IDatabaseAccess {
  return new DrizzleDatabaseAccess()
}
