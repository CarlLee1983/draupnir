/**
 * Drizzle ORM Schema 定義
 *
 * 此檔案定義所有資料庫表的結構
 * 使用 Drizzle 的 schema builder 定義表
 *
 * @see https://orm.drizzle.team/docs/sql-schema-declaration
 */

import { sql } from 'drizzle-orm'
import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

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
  google_id: text('google_id').unique(),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
})

/**
 * User Profiles 表
 */
export const user_profiles = sqliteTable('user_profiles', {
  id: text('id').primaryKey(),
  user_id: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  display_name: text('display_name'),
  avatar_url: text('avatar_url'),
  bio: text('bio'),
  timezone: text('timezone').default('UTC'),
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
  (table) => [index('idx_auth_tokens_user_id').on(table.user_id)],
)

/**
 * Email verification tokens（信箱驗證連結）
 */
export const emailVerificationTokens = sqliteTable(
  'email_verification_tokens',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    expires_at: text('expires_at').notNull(),
    used: integer('used', { mode: 'boolean' }).notNull().default(false),
  },
  (table) => [index('idx_email_verification_tokens_email').on(table.email)],
)

/**
 * Password reset tokens（密碼重設連結）
 */
export const passwordResetTokens = sqliteTable(
  'password_reset_tokens',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    expires_at: text('expires_at').notNull(),
    used: integer('used', { mode: 'boolean' }).notNull().default(false),
  },
  (table) => [index('idx_password_reset_tokens_email').on(table.email)],
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
    suspension_reason: text('suspension_reason'),
    pre_freeze_rate_limit: text('pre_freeze_rate_limit'),
    suspended_at: text('suspended_at'),
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
  (table) => [index('idx_credit_transactions_account_id').on(table.credit_account_id)],
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
    credit_cost: real('credit_cost').notNull().default(0),
    provider: text('provider'),
    latency_ms: integer('latency_ms'),
    status: text('status'),
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

/**
 * Alert Configs 表 — 每個組織一筆預算設定
 */
export const alertConfigs = sqliteTable(
  'alert_configs',
  {
    id: text('id').primaryKey(),
    org_id: text('org_id').notNull().unique(),
    budget_usd: text('budget_usd').notNull(),
    last_alerted_tier: text('last_alerted_tier'),
    last_alerted_at: text('last_alerted_at'),
    last_alerted_month: text('last_alerted_month'),
    created_at: text('created_at').notNull(),
    updated_at: text('updated_at').notNull(),
  },
  (table) => [index('idx_alert_configs_org_id').on(table.org_id)],
)

/**
 * Alert Events 表 — 已觸發的告警審計記錄
 */
export const alertEvents = sqliteTable(
  'alert_events',
  {
    id: text('id').primaryKey(),
    org_id: text('org_id').notNull(),
    tier: text('tier').notNull(),
    budget_usd: text('budget_usd').notNull(),
    actual_cost_usd: text('actual_cost_usd').notNull(),
    percentage: text('percentage').notNull(),
    month: text('month').notNull(),
    recipients: text('recipients').notNull(),
    created_at: text('created_at').notNull(),
  },
  (table) => [
    index('idx_alert_events_org_id').on(table.org_id),
    index('idx_alert_events_month').on(table.month),
  ],
)

/**
 * Webhook Endpoints 表 — 每個組織可註冊多個 webhook URL
 */
export const webhookEndpoints = sqliteTable(
  'webhook_endpoints',
  {
    id: text('id').primaryKey(),
    org_id: text('org_id').notNull(),
    url: text('url').notNull(),
    secret: text('secret').notNull(),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    description: text('description'),
    created_at: text('created_at').notNull(),
    last_success_at: text('last_success_at'),
    last_failure_at: text('last_failure_at'),
  },
  (table) => [
    index('idx_webhook_endpoints_org_id').on(table.org_id),
    index('idx_webhook_endpoints_org_active').on(table.org_id, table.active),
  ],
)

/**
 * Alert Deliveries 表 — 記錄 email / webhook 每次遞送結果
 *
 * Denormalized columns (org_id, month, tier) eliminate JOIN on alert_events
 * for existsSent / listByOrg queries, enabling purely single-table queries.
 */
export const alertDeliveries = sqliteTable(
  'alert_deliveries',
  {
    id: text('id').primaryKey(),
    alert_event_id: text('alert_event_id').notNull(),
    channel: text('channel').notNull(),
    target: text('target').notNull(),
    target_url: text('target_url'),
    status: text('status').notNull(),
    attempts: integer('attempts').notNull().default(0),
    status_code: integer('status_code'),
    error_message: text('error_message'),
    dispatched_at: text('dispatched_at').notNull(),
    delivered_at: text('delivered_at'),
    created_at: text('created_at').notNull(),
    // Denormalized from alert_events to avoid JOIN in existsSent / listByOrg
    org_id: text('org_id').notNull().default(''),
    month: text('month').notNull().default(''),
    tier: text('tier').notNull().default(''),
  },
  (table) => [
    index('idx_alert_deliveries_event_id').on(table.alert_event_id),
    index('idx_alert_deliveries_channel_target').on(table.channel, table.target),
    index('idx_alert_deliveries_dedup').on(
      table.alert_event_id,
      table.channel,
      table.target,
      table.status,
    ),
    index('idx_alert_deliveries_org_month_tier').on(table.org_id, table.month, table.tier),
  ],
)

/**
 * Organizations 表
 */
export const organizations = sqliteTable(
  'organizations',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    description: text('description'),
    status: text('status').notNull().default('active'),
    created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index('idx_organizations_slug').on(table.slug)],
)

/**
 * Organization Members 表
 */
export const organization_members = sqliteTable(
  'organization_members',
  {
    id: text('id').primaryKey(),
    organization_id: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    user_id: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('member'),
    joined_at: text('joined_at').default(sql`CURRENT_TIMESTAMP`),
    created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index('idx_org_members_org_id').on(table.organization_id),
    index('idx_org_members_user_id').on(table.user_id),
  ],
)

/**
 * Organization Invitations 表
 */
export const organization_invitations = sqliteTable(
  'organization_invitations',
  {
    id: text('id').primaryKey(),
    organization_id: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    token_hash: text('token_hash').notNull().unique(),
    role: text('role').notNull().default('member'),
    invited_by_user_id: text('invited_by_user_id').notNull(),
    status: text('status').notNull().default('pending'),
    expires_at: text('expires_at').notNull(),
    created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index('idx_org_invitations_email').on(table.email),
    index('idx_org_invitations_token').on(table.token_hash),
  ],
)

/**
 * App Modules 表
 */
export const app_modules = sqliteTable('app_modules', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  type: text('type').notNull().default('free'),
  status: text('status').notNull().default('active'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
})

/**
 * Report Schedules 表 — 定期自動發送報告設定
 */
export const reportSchedules = sqliteTable(
  'report_schedules',
  {
    id: text('id').primaryKey(),
    org_id: text('org_id').notNull(),
    type: text('type').notNull(), // weekly, monthly
    day: integer('day').notNull(), // 0-6 for weekly, 1-31 for monthly
    time: text('time').notNull(), // HH:mm
    timezone: text('timezone').notNull(), // IANA timezone
    recipients: text('recipients').notNull(), // JSON array of emails
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
    created_at: text('created_at').notNull(),
    updated_at: text('updated_at').notNull(),
  },
  (table) => [index('idx_report_schedules_org_id').on(table.org_id)],
)

/**
 * App API Keys 表
 */
export const appApiKeys = sqliteTable(
  'app_api_keys',
  {
    id: text('id').primaryKey(),
    org_id: text('org_id').notNull(),
    issued_by_user_id: text('issued_by_user_id').notNull(),
    label: text('label').notNull(),
    key_hash: text('key_hash').notNull().unique(),
    bifrost_virtual_key_id: text('bifrost_virtual_key_id').notNull(),
    status: text('status').notNull().default('pending'),
    scope: text('scope').notNull().default('read'),
    rotation_policy: text('rotation_policy'),
    bound_modules: text('bound_modules').notNull().default('[]'),
    previous_key_hash: text('previous_key_hash'),
    previous_bifrost_virtual_key_id: text('previous_bifrost_virtual_key_id'),
    grace_period_ends_at: text('grace_period_ends_at'),
    expires_at: text('expires_at'),
    revoked_at: text('revoked_at'),
    created_at: text('created_at'),
    updated_at: text('updated_at'),
  },
  (table) => [
    index('idx_app_api_keys_org_id').on(table.org_id),
    index('idx_app_api_keys_key_hash').on(table.key_hash),
  ],
)

/**
 * Applications 表
 */
export const applications = sqliteTable('applications', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  org_id: text('org_id').notNull(),
  created_by_user_id: text('created_by_user_id').notNull(),
  status: text('status').notNull().default('active'),
  webhook_url: text('webhook_url'),
  webhook_secret: text('webhook_secret'),
  redirect_uris: text('redirect_uris'),
  created_at: text('created_at'),
  updated_at: text('updated_at'),
})

/**
 * Webhook Configs 表
 */
export const webhookConfigs = sqliteTable('webhook_configs', {
  id: text('id').primaryKey(),
  application_id: text('application_id').notNull(),
  event_type: text('event_type').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  created_at: text('created_at'),
  updated_at: text('updated_at'),
})
