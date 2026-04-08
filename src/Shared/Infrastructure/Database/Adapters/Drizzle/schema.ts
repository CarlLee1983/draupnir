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

/**
 * API Keys 表
 *
 * 儲存 Draupnir API Key，每個 Key 映射一個 Bifrost Virtual Key
 */
export const apiKeys = sqliteTable(
  'api_keys',
  {
    id: text('id').primaryKey(),
    org_id: text('org_id').notNull(),
    created_by_user_id: text('created_by_user_id').notNull(),
    label: text('label').notNull(),
    key_hash: text('key_hash').notNull().unique(),
    bifrost_virtual_key_id: text('bifrost_virtual_key_id').notNull(),
    status: text('status').notNull().default('active'),
    scope: text('scope').notNull(),
    expires_at: text('expires_at'),
    revoked_at: text('revoked_at'),
    created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index('idx_api_keys_org_id').on(table.org_id),
    index('idx_api_keys_key_hash').on(table.key_hash),
  ],
)
