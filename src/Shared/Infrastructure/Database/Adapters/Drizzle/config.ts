/**
 * Drizzle ORM 配置
 *
 * 此檔案負責初始化 Drizzle 連線和資料庫實例
 */

import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from './schema'

let db: ReturnType<typeof drizzle> | null = null
let libsqlClient: ReturnType<typeof createClient> | null = null

/**
 * 初始化 Drizzle 資料庫連接
 *
 * @returns Drizzle 資料庫實例
 */
export function initializeDrizzle() {
  if (db) {
    return db
  }

  const databaseUrl = process.env.DATABASE_URL || 'file:local.db'
  libsqlClient = createClient({ url: databaseUrl })
  db = drizzle(libsqlClient, { schema })

  return db
}

/**
 * 獲取 Drizzle 資料庫實例
 * 確保只有一個連接實例
 */
export function getDrizzleInstance() {
  if (!db) {
    return initializeDrizzle()
  }
  return db
}

/**
 * 關閉 libsql 連線（用於 graceful shutdown）。
 */
export async function closeDrizzleConnection(): Promise<void> {
  libsqlClient?.close()
  libsqlClient = null
  db = null
}

/**
 * 僅供測試使用的資料庫重置
 * @internal
 */
export function resetDrizzleForTest() {
  db = null
  libsqlClient = null
}
