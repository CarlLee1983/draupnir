/**
 * Drizzle ORM Schema 定義
 *
 * 此檔案定義所有資料庫表的結構
 * 使用 Drizzle 的 schema builder 定義表
 *
 * @see https://orm.drizzle.team/docs/sql-schema-declaration
 */

import { sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

/**
 * Users 表
 *
 * 儲存系統中的所有使用者
 */
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
})

/**
 * Posts 表
 *
 * 儲存使用者發佈的文章
 */
export const posts = sqliteTable('posts', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content'),
  user_id: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
})

/**
 * Health Checks 表
 *
 * 儲存系統健康檢查歷史
 */
export const healthChecks = sqliteTable('health_checks', {
  id: text('id').primaryKey(),
  status: text('status').notNull(), // 'healthy' | 'degraded' | 'unhealthy'
  timestamp: text('timestamp').default(sql`CURRENT_TIMESTAMP`),
  details: text('details'), // JSON serialized
})
