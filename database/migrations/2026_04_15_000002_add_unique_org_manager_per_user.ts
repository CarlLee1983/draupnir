/**
 * Migration: 確保每位用戶在 organization_members 中最多只有一個 org-level 'manager' 角色
 *
 * Partial unique index（SQLite/Postgres）：僅對 role='manager' 的資料列限制 user_id 唯一。
 */
import { DB, type Migration } from '@gravito/atlas'

export default class AddUniqueOrgManagerPerUser implements Migration {
  async up(): Promise<void> {
    await DB.raw(
      `CREATE UNIQUE INDEX IF NOT EXISTS uniq_org_manager_per_user ON organization_members (user_id) WHERE role = 'manager'`,
    )
  }

  async down(): Promise<void> {
    await DB.raw(`DROP INDEX IF EXISTS uniq_org_manager_per_user`)
  }
}
