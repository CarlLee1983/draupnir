/**
 * Drizzle ORM Schema 定義
 *
 * 此檔案定義所有資料庫表的結構
 * 使用 Drizzle 的 schema builder 定義表
 *
 * @see https://orm.drizzle.team/docs/sql-schema-declaration
 */

import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

/**
 * Users 表
 *
 * 儲存系統中的所有使用者，包含認證資訊與角色狀態
 */
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  role: text('role').notNull().default('user'),
  status: text('status').notNull().default('active'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
})

/**
 * Auth Tokens 表
 *
 * 儲存 JWT Token 記錄，用於 Token 撤銷追蹤與黑名單管理
 */
export const authTokens = sqliteTable(
  'auth_tokens',
  {
    id: text('id').primaryKey(),
    user_id: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token_hash: text('token_hash').notNull().unique(),
    type: text('type').notNull(),
    expires_at: text('expires_at').notNull(),
    revoked_at: text('revoked_at'),
    created_at: text('created_at').notNull(),
  },
  (table) => [
    index('idx_auth_tokens_user_id').on(table.user_id),
  ]
)

/**
 * Health Checks 表
 *
 * 儲存系統健康檢查歷史
 */
export const healthChecks = sqliteTable('health_checks', {
  id: text('id').primaryKey(),
  status: text('status').notNull(),
  timestamp: text('timestamp').default(sql`CURRENT_TIMESTAMP`),
  details: text('details'),
})
