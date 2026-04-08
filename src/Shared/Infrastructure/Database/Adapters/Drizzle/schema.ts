/**
 * Drizzle ORM Schema 定義
 *
 * 此檔案定義所有資料庫表的結構
 * 使用 Drizzle 的 schema builder 定義表
 *
 * @see https://orm.drizzle.team/docs/sql-schema-declaration
 */

import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
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

/**
 * Credit Accounts 表
 */
export const creditAccounts = sqliteTable('credit_accounts', {
  id: text('id').primaryKey(),
  org_id: text('org_id').notNull().unique(),
  balance: text('balance').notNull().default('0'),
  low_balance_threshold: text('low_balance_threshold').notNull().default('100'),
  status: text('status').notNull().default('active'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
})

/**
 * Credit Transactions 表（append-only 帳本）
 */
export const creditTransactions = sqliteTable(
  'credit_transactions',
  {
    id: text('id').primaryKey(),
    credit_account_id: text('credit_account_id').notNull(),
    type: text('type').notNull(),
    amount: text('amount').notNull(),
    balance_after: text('balance_after').notNull(),
    reference_type: text('reference_type'),
    reference_id: text('reference_id'),
    description: text('description'),
    created_at: text('created_at').notNull(),
  },
  (table) => [
    index('idx_credit_transactions_account_id').on(table.credit_account_id),
  ],
)

/**
 * Usage Records 表
 */
export const usageRecords = sqliteTable(
  'usage_records',
  {
    id: text('id').primaryKey(),
    bifrost_log_id: text('bifrost_log_id').notNull().unique(),
    api_key_id: text('api_key_id').notNull(),
    org_id: text('org_id').notNull(),
    model: text('model').notNull(),
    input_tokens: integer('input_tokens').notNull().default(0),
    output_tokens: integer('output_tokens').notNull().default(0),
    credit_cost: text('credit_cost').notNull().default('0'),
    occurred_at: text('occurred_at').notNull(),
    created_at: text('created_at').notNull(),
  },
  (table) => [
    index('idx_usage_records_org_id').on(table.org_id),
    index('idx_usage_records_bifrost_log_id').on(table.bifrost_log_id),
  ],
)

/**
 * Sync Cursors 表
 */
export const syncCursors = sqliteTable('sync_cursors', {
  id: text('id').primaryKey(),
  cursor_type: text('cursor_type').notNull().unique(),
  last_synced_at: text('last_synced_at'),
  last_bifrost_log_id: text('last_bifrost_log_id'),
  updated_at: text('updated_at').notNull(),
})

/**
 * Pricing Rules 表
 */
export const pricingRules = sqliteTable('pricing_rules', {
  id: text('id').primaryKey(),
  model_pattern: text('model_pattern').notNull(),
  input_token_price: text('input_token_price').notNull(),
  output_token_price: text('output_token_price').notNull(),
  image_price: text('image_price'),
  audio_price: text('audio_price'),
  priority: integer('priority').notNull().default(0),
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
})

/**
 * Quarantined Logs 表（無法映射的 Bifrost log 隔離區）
 */
export const quarantinedLogs = sqliteTable('quarantined_logs', {
  id: text('id').primaryKey(),
  bifrost_log_id: text('bifrost_log_id').notNull().unique(),
  reason: text('reason').notNull(),
  raw_data: text('raw_data').notNull(),
  created_at: text('created_at').notNull(),
})
