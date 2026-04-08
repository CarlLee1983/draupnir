/**
 * Drizzle ORM 配置
 *
 * 此檔案負責初始化 Drizzle 連線和資料庫實例
 */

import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from './schema'

let db: ReturnType<typeof drizzle> | null = null

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

  const client = createClient({
    url: databaseUrl,
  })

  db = drizzle(client, { schema })

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
